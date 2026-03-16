// ============================================================
// In-Memory Cache Service (FREE — replaces ElastiCache Redis)
// ============================================================
//
// Simple Map-based cache with TTL expiration.
// Works within a single Lambda execution context.
// Provides warm-cache benefit for Lambda reuse.
// ============================================================

import { getConfig } from '../config/environment';
import { createLogger } from '../utils/logger';
import { Order } from '../types';

const logger = createLogger('CacheService');

interface CacheEntry<T> {
  data: T;
  expiry: number; // Unix timestamp in ms
}

const cache = new Map<string, CacheEntry<unknown>>();

function getTTL(): number {
  return (getConfig().CACHE_TTL_SECONDS || 300) * 1000; // default 5 min
}

/**
 * Get cached orders for a user. Returns null on miss or expiry.
 */
export function getCachedOrders(userId: string): Order[] | null {
  const key = `orders:${userId}`;
  const entry = cache.get(key) as CacheEntry<Order[]> | undefined;

  if (!entry) {
    logger.info('Cache MISS', { userId });
    return null;
  }

  if (Date.now() > entry.expiry) {
    cache.delete(key);
    logger.info('Cache EXPIRED', { userId });
    return null;
  }

  logger.info('Cache HIT', { userId, count: entry.data.length });
  return entry.data;
}

/**
 * Cache orders for a user with TTL.
 */
export function cacheOrders(userId: string, orders: Order[]): void {
  const key = `orders:${userId}`;
  cache.set(key, {
    data: orders,
    expiry: Date.now() + getTTL(),
  });
  logger.info('Orders cached', { userId, count: orders.length });
}

/**
 * Invalidate cached orders for a user.
 */
export function invalidateOrdersCache(userId: string): void {
  const key = `orders:${userId}`;
  const deleted = cache.delete(key);
  logger.info('Cache invalidated', { userId, deleted });
}
