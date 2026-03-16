// ============================================================
// Lambda Handler: Create Order (POST /orders)
// ============================================================
//
// Flow:
// 1. API Gateway receives POST request
// 2. Validate JWT (done by Cognito Authorizer at API GW level)
// 3. Validate request body (amount > 0)
// 4. Store order in DynamoDB with status = PENDING
// 5. Send order message to SQS for async processing
// 6. Invalidate user's order cache
// 7. Return order ID in response
// ============================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { createOrder } from '../services/database';
import { sendOrderToQueue } from '../services/queue';
import { invalidateOrdersCache } from '../services/cache';
import { created, badRequest, serverError, unauthorized } from '../utils/response';
import { createLogger } from '../utils/logger';
import { CreateOrderRequest, OrderMessage } from '../types';

const logger = createLogger('CreateOrderHandler');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('CreateOrder invoked', {
    httpMethod: event.httpMethod,
    path: event.path,
  });

  try {
    // ── 1. Extract user ID from Cognito authorizer claims ───
    const userId =
      event.requestContext.authorizer?.claims?.sub ||
      event.requestContext.authorizer?.claims?.['cognito:username'] ||
      event.headers['x-user-id']; // Fallback for testing

    if (!userId) {
      logger.warn('No user ID found in request');
      return unauthorized('User not authenticated');
    }

    // ── 2. Parse and validate request body ──────────────────
    if (!event.body) {
      return badRequest('Request body is required');
    }

    let body: CreateOrderRequest;
    try {
      body = JSON.parse(event.body);
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      return badRequest('Amount must be a positive number');
    }

    if (body.amount > 999999.99) {
      return badRequest('Amount exceeds maximum allowed value');
    }

    // ── 3. Create order in DynamoDB ─────────────────────────
    const orderId = uuidv4();
    const order = await createOrder(orderId, userId, body.amount);

    logger.info('Order stored in database', { orderId, userId, amount: body.amount });

    // ── 4. Send to SQS for async processing ─────────────────
    const orderMessage: OrderMessage = {
      orderId,
      userId,
      amount: body.amount,
      timestamp: new Date().toISOString(),
    };

    await sendOrderToQueue(orderMessage);
    logger.info('Order sent to SQS queue', { orderId });

    // ── 5. Invalidate cache ─────────────────────────────────
    invalidateOrdersCache(userId);

    // ── 6. Return success response ──────────────────────────
    return created(
      {
        orderId: order.id,
        amount: order.amount,
        status: order.status,
        createdAt: order.created_at,
      },
      'Order created successfully. Processing will begin shortly.'
    );
  } catch (error) {
    logger.error('CreateOrder failed', { error: String(error) });
    return serverError('Failed to create order. Please try again.');
  }
};
