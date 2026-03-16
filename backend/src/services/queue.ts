// ============================================================
// SQS Queue Service
// ============================================================

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getConfig } from '../config/environment';
import { createLogger } from '../utils/logger';
import { OrderMessage } from '../types';

const logger = createLogger('QueueService');

let sqsClient: SQSClient | null = null;

function getSQSClient(): SQSClient {
  if (!sqsClient) {
    const config = getConfig();
    sqsClient = new SQSClient({ region: config.REGION });
  }
  return sqsClient;
}

/**
 * Send order to SQS for async processing.
 */
export async function sendOrderToQueue(message: OrderMessage): Promise<string> {
  const config = getConfig();
  const client = getSQSClient();

  const command = new SendMessageCommand({
    QueueUrl: config.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageGroupId: undefined, // Only needed for FIFO queues
    MessageAttributes: {
      OrderId: {
        DataType: 'String',
        StringValue: message.orderId,
      },
      UserId: {
        DataType: 'String',
        StringValue: message.userId,
      },
    },
  });

  try {
    const result = await client.send(command);
    logger.info('Order sent to SQS', {
      orderId: message.orderId,
      messageId: result.MessageId,
    });
    return result.MessageId || '';
  } catch (error) {
    logger.error('Failed to send order to SQS', {
      error: String(error),
      orderId: message.orderId,
    });
    throw error;
  }
}
