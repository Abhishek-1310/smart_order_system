// ============================================================
// Lambda Handler: Get Orders (GET /orders)
// ============================================================
//
// Flow:
// 1. Extract user ID from Cognito JWT claims
// 2. Check in-memory cache for user orders
// 3. If cache HIT → return cached data immediately
// 4. If cache MISS → fetch from DynamoDB
// 5. Store result in cache with TTL
// 6. Return orders list
// ============================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getOrdersByUserId } from '../services/database';
import { getCachedOrders, cacheOrders } from '../services/cache';
import { success, serverError, unauthorized } from '../utils/response';
import { createLogger } from '../utils/logger';

const logger = createLogger('GetOrdersHandler');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('GetOrders invoked', {
    httpMethod: event.httpMethod,
    path: event.path,
  });

  try {
    // ── 1. Extract user ID ─────────────────────────────────
    const userId =
      event.requestContext.authorizer?.claims?.sub ||
      event.requestContext.authorizer?.claims?.['cognito:username'] ||
      event.headers['x-user-id'];

    if (!userId) {
      logger.warn('No user ID found in request');
      return unauthorized('User not authenticated');
    }

    // ── 2. Check cache first ───────────────────────────────
    const cachedOrders = getCachedOrders(userId);

    if (cachedOrders) {
      logger.info('Returning cached orders', {
        userId,
        count: cachedOrders.length,
        source: 'CACHE',
      });
      return success(
        { orders: cachedOrders, source: 'cache' },
        'Orders retrieved from cache'
      );
    }

    // ── 3. Cache miss: Fetch from DynamoDB ─────────────────
    const orders = await getOrdersByUserId(userId);
    logger.info('Fetched orders from database', {
      userId,
      count: orders.length,
      source: 'DATABASE',
    });

    // ── 4. Store in cache ───────────────────────────────────
    if (orders.length > 0) {
      cacheOrders(userId, orders);
    }

    // ── 5. Return response ──────────────────────────────────
    return success(
      { orders, source: 'database' },
      `Retrieved ${orders.length} orders`
    );
  } catch (error) {
    logger.error('GetOrders failed', { error: String(error) });
    return serverError('Failed to retrieve orders. Please try again.');
  }
};
