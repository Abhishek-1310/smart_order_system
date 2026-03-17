// ============================================================
// Frontend Types
// ============================================================

export interface Order {
  id: string;
  user_id: string;
  product_name: string;
  quantity: number;
  description?: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

export interface CreateOrderPayload {
  product_name: string;
  quantity: number;
  description?: string;
  amount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface OrdersResponse {
  orders: Order[];
  source: 'cache' | 'database';
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface AuthUser {
  username: string;
  email: string;
  sub: string;
  token: string;
}

export interface SignUpData {
  username: string;
  email: string;
  password: string;
  name?: string;
}

export interface SignInData {
  username: string;
  password: string;
}

export interface ConfirmSignUpData {
  username: string;
  code: string;
}
