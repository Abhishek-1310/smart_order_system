// ============================================================
// API Service — Axios HTTP Client for Order APIs
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import {
  ApiResponse,
  OrdersResponse,
  CreateOrderResponse,
  CreateOrderPayload,
} from '../types';
import { getCurrentUser } from './auth';

/**
 * Create configured Axios instance.
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.apiUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: attach JWT token
  client.interceptors.request.use(
    async (reqConfig) => {
      try {
        const user = await getCurrentUser();
        if (user?.token) {
          reqConfig.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch {
        // If no user, proceed without token
      }
      return reqConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: handle errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired — redirect to login
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const api = createApiClient();

/**
 * Create a new order.
 */
export async function createOrder(
  payload: CreateOrderPayload
): Promise<ApiResponse<CreateOrderResponse>> {
  const response = await api.post<ApiResponse<CreateOrderResponse>>(
    '/orders',
    payload
  );
  return response.data;
}

/**
 * Get all orders for the current user.
 */
export async function getOrders(): Promise<ApiResponse<OrdersResponse>> {
  const response = await api.get<ApiResponse<OrdersResponse>>('/orders');
  return response.data;
}
