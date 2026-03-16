// ============================================================
// Environment Configuration Loader (FREE TIER — DynamoDB)
// ============================================================

import { EnvironmentConfig } from '../types';

/**
 * Loads and validates environment variables.
 * Simplified for DynamoDB (no RDS/Redis config needed).
 */
export function getConfig(): EnvironmentConfig {
  const required = [
    'ORDERS_TABLE_NAME',
    'SQS_QUEUE_URL',
    'SNS_TOPIC_ARN',
    'REGION',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
  }

  return {
    ORDERS_TABLE_NAME: process.env.ORDERS_TABLE_NAME || 'smart-orders',
    SQS_QUEUE_URL: process.env.SQS_QUEUE_URL || 'https://sqs.ap-south-1.amazonaws.com/035352455821/smart-order-queue',
    SNS_TOPIC_ARN: process.env.SNS_TOPIC_ARN || 'arn:aws:sns:ap-south-1:035352455821:smart-order-notifications',
    REGION: process.env.REGION || 'ap-south-1',
    CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
  };
}
