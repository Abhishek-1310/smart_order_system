// ============================================================
// Smart Order System - Shared TypeScript Types (FREE TIER)
// ============================================================

/** Order status enum */
export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/** Order record (DynamoDB item) */
export interface Order {
  id: string;
  user_id: string;
  product_name: string;
  quantity: number;
  description?: string;
  amount: number;
  status: OrderStatus;
  created_at: string;
}

/** Create order request body */
export interface CreateOrderRequest {
  product_name: string;
  quantity: number;
  description?: string;
  amount: number;
  items?: OrderItem[];
}

/** Order item (optional detail) */
export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

/** SQS Order Message */
export interface OrderMessage {
  orderId: string;
  userId: string;
  amount: number;
  timestamp: string;
}

/** API Gateway Lambda Proxy Response */
export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/** Daily Summary Data */
export interface DailySummary {
  date: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  failedOrders: number;
  totalRevenue: number;
}

/** Environment Variables (FREE TIER — DynamoDB, no RDS/Redis) */
export interface EnvironmentConfig {
  ORDERS_TABLE_NAME: string;
  SQS_QUEUE_URL: string;
  SNS_TOPIC_ARN: string;
  REGION: string;
  CACHE_TTL_SECONDS: number;
}
