// ============================================================
// DynamoDB Database Service (FREE TIER — replaces RDS MySQL)
// ============================================================
//
// DynamoDB Free Tier: 25GB storage + 25 WCU + 25 RCU (forever)
// PAY_PER_REQUEST mode: free for low-traffic apps
//
// Table Design:
//   PK: user_id  |  SK: id (order UUID)
//   GSI: StatusDateIndex → PK: status, SK: created_at
// ============================================================

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getConfig } from '../config/environment';
import { createLogger } from '../utils/logger';
import { Order, OrderStatus, DailySummary } from '../types';

const logger = createLogger('DatabaseService');

let client: DynamoDBClient | null = null;

function getClient(): DynamoDBClient {
  if (!client) {
    const config = getConfig();
    client = new DynamoDBClient({ region: config.REGION });
    logger.info('DynamoDB client created');
  }
  return client;
}

function getTableName(): string {
  return getConfig().ORDERS_TABLE_NAME;
}

/**
 * Insert a new order into DynamoDB.
 */
export async function createOrder(
  id: string,
  userId: string,
  amount: number
): Promise<Order> {
  const db = getClient();
  const now = new Date().toISOString();

  const order: Order = {
    id,
    user_id: userId,
    amount,
    status: OrderStatus.PENDING,
    created_at: now,
  };

  const command = new PutItemCommand({
    TableName: getTableName(),
    Item: marshall(order, { removeUndefinedValues: true }),
  });

  try {
    await db.send(command);
    logger.info('Order created in DynamoDB', { orderId: id, userId, amount });
    return order;
  } catch (error) {
    logger.error('Failed to create order', { error: String(error), orderId: id });
    throw error;
  }
}

/**
 * Fetch all orders for a user (Query by partition key).
 */
export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  const db = getClient();

  const command = new QueryCommand({
    TableName: getTableName(),
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: marshall({ ':uid': userId }),
    ScanIndexForward: false, // Newest first
  });

  try {
    const result = await db.send(command);
    const orders = (result.Items || []).map((item) => unmarshall(item) as Order);

    logger.info('Fetched orders from DynamoDB', { userId, count: orders.length });
    return orders;
  } catch (error) {
    logger.error('Failed to fetch orders', { error: String(error), userId });
    throw error;
  }
}

/**
 * Update order status by order ID.
 */
export async function updateOrderStatus(
  orderId: string,
  userId: string,
  status: OrderStatus
): Promise<void> {
  const db = getClient();

  const command = new UpdateItemCommand({
    TableName: getTableName(),
    Key: marshall({ user_id: userId, id: orderId }),
    UpdateExpression: 'SET #s = :status',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: marshall({ ':status': status }),
    ConditionExpression: 'attribute_exists(id)',
  });

  try {
    await db.send(command);
    logger.info('Order status updated', { orderId, status });
  } catch (error) {
    logger.error('Failed to update order status', {
      error: String(error),
      orderId,
      status,
    });
    throw error;
  }
}

/**
 * Get daily order summary using GSI (StatusDateIndex).
 */
export async function getDailySummary(date: string): Promise<DailySummary> {
  const db = getClient();

  let totalOrders = 0;
  let completedOrders = 0;
  let pendingOrders = 0;
  let failedOrders = 0;
  let totalRevenue = 0;

  // Query each status from the GSI
  for (const status of ['PENDING', 'COMPLETED', 'FAILED']) {
    const command = new QueryCommand({
      TableName: getTableName(),
      IndexName: 'StatusDateIndex',
      KeyConditionExpression: '#s = :status AND begins_with(created_at, :date)',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: marshall({
        ':status': status,
        ':date': date,
      }),
    });

    try {
      const result = await db.send(command);
      const items = (result.Items || []).map((item) => unmarshall(item) as Order);
      const count = items.length;
      totalOrders += count;

      if (status === 'COMPLETED') {
        completedOrders = count;
        totalRevenue = items.reduce((sum, o) => sum + o.amount, 0);
      } else if (status === 'PENDING') {
        pendingOrders = count;
      } else if (status === 'FAILED') {
        failedOrders = count;
      }
    } catch (error) {
      logger.error('Failed to query status for summary', {
        error: String(error),
        status,
        date,
      });
    }
  }

  logger.info('Daily summary retrieved', {
    date,
    totalOrders,
    completedOrders,
    pendingOrders,
    failedOrders,
    totalRevenue,
  });

  return {
    date,
    totalOrders,
    completedOrders,
    pendingOrders,
    failedOrders,
    totalRevenue,
  };
}

/**
 * No-op: DynamoDB doesn't need initialization (table created by CDK).
 */
export async function initializeDatabase(): Promise<void> {
  logger.info('DynamoDB ready (table managed by CDK)');
}
