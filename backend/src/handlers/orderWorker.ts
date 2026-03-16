// ============================================================
// Lambda Handler: Order Processing Worker (SQS Trigger)
// ============================================================
//
// Triggered by SQS when a new order is placed.
//
// Flow:
// 1. Read order message from SQS event
// 2. Simulate payment processing (with random delay)
// 3. Update order status in DynamoDB to COMPLETED
// 4. Publish notification via SNS
// 5. Invalidate user's order cache
// 6. If processing fails → SQS handles retry
// 7. After max retries → message goes to Dead Letter Queue
// ============================================================

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { updateOrderStatus } from '../services/database';
import { publishOrderNotification } from '../services/notification';
import { invalidateOrdersCache } from '../services/cache';
import { createLogger } from '../utils/logger';
import { OrderMessage, OrderStatus } from '../types';

const logger = createLogger('OrderWorker');

/**
 * Simulate payment processing.
 * In real-world, this would call a payment gateway API.
 */
async function simulatePaymentProcessing(
  orderId: string,
  amount: number
): Promise<boolean> {
  logger.info('Processing payment...', { orderId, amount });

  // Simulate processing delay (500ms - 2000ms)
  const delay = Math.floor(Math.random() * 1500) + 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate 95% success rate
  const isSuccess = Math.random() > 0.05;

  if (isSuccess) {
    logger.info('Payment processed successfully', { orderId, amount });
  } else {
    logger.warn('Payment processing failed (simulated)', { orderId, amount });
  }

  return isSuccess;
}

/**
 * Process a single SQS record (order message).
 */
async function processRecord(record: SQSRecord): Promise<void> {
  const message: OrderMessage = JSON.parse(record.body);
  const { orderId, userId, amount } = message;

  logger.info('Processing order', {
    orderId,
    userId,
    amount,
    messageId: record.messageId,
    receiveCount: record.attributes.ApproximateReceiveCount,
  });

  try {
    // ── 1. Simulate payment ────────────────────────────────
    const paymentSuccess = await simulatePaymentProcessing(orderId, amount);

    if (!paymentSuccess) {
      // Throw to trigger SQS retry
      throw new Error(`Payment failed for order ${orderId}`);
    }

    // ── 2. Update order status to COMPLETED ────────────────
    await updateOrderStatus(orderId, userId, OrderStatus.COMPLETED);
    logger.info('Order status updated to COMPLETED', { orderId });

    // ── 3. Publish SNS notification ────────────────────────
    await publishOrderNotification(orderId, userId, amount);
    logger.info('Notification sent', { orderId });

    // ── 4. Invalidate cache ────────────────────────────────
    invalidateOrdersCache(userId);
    logger.info('Cache invalidated for user', { userId });
  } catch (error) {
    logger.error('Order processing failed', {
      error: String(error),
      orderId,
      userId,
      receiveCount: record.attributes.ApproximateReceiveCount,
    });

    // Re-throw to let SQS handle retry / DLQ
    throw error;
  }
}

/**
 * Main SQS handler.
 * Processes batch of order messages.
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  logger.info('OrderWorker invoked', {
    recordCount: event.Records.length,
  });

  // Process all records (SQS batch)
  const results = await Promise.allSettled(
    event.Records.map((record) => processRecord(record))
  );

  // Log results
  const failures = results.filter((r) => r.status === 'rejected');
  const successes = results.filter((r) => r.status === 'fulfilled');

  logger.info('Batch processing complete', {
    total: event.Records.length,
    succeeded: successes.length,
    failed: failures.length,
  });

  // If any records failed, throw to trigger partial batch retry
  if (failures.length > 0) {
    const failureReasons = failures.map((f) =>
      f.status === 'rejected' ? String(f.reason) : 'Unknown'
    );
    logger.error('Some records failed processing', { failureReasons });
    throw new Error(`${failures.length}/${event.Records.length} records failed`);
  }
};
