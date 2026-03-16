// ============================================================
// SNS Notification Service
// ============================================================

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getConfig } from '../config/environment';
import { createLogger } from '../utils/logger';

const logger = createLogger('NotificationService');

let snsClient: SNSClient | null = null;

function getSNSClient(): SNSClient {
  if (!snsClient) {
    const config = getConfig();
    snsClient = new SNSClient({ region: config.REGION });
  }
  return snsClient;
}

/**
 * Publish order completion notification.
 */
export async function publishOrderNotification(
  orderId: string,
  userId: string,
  amount: number
): Promise<void> {
  const config = getConfig();
  const client = getSNSClient();

  const message = `✅ Order Processed Successfully!\n\n` +
    `Order ID: ${orderId}\n` +
    `Amount: $${amount.toFixed(2)}\n` +
    `Status: COMPLETED\n\n` +
    `Your order has been successfully processed. Thank you for your purchase!`;

  const command = new PublishCommand({
    TopicArn: config.SNS_TOPIC_ARN,
    Subject: `Order ${orderId} - Successfully Processed`,
    Message: message,
    MessageAttributes: {
      OrderId: { DataType: 'String', StringValue: orderId },
      UserId: { DataType: 'String', StringValue: userId },
      EventType: { DataType: 'String', StringValue: 'ORDER_COMPLETED' },
    },
  });

  try {
    const result = await client.send(command);
    logger.info('Order notification published', {
      orderId,
      messageId: result.MessageId,
    });
  } catch (error) {
    logger.error('Failed to publish notification', {
      error: String(error),
      orderId,
    });
    throw error;
  }
}

/**
 * Publish daily summary notification.
 */
export async function publishDailySummaryNotification(
  date: string,
  totalOrders: number,
  completedOrders: number,
  pendingOrders: number,
  failedOrders: number,
  totalRevenue: number
): Promise<void> {
  const config = getConfig();
  const client = getSNSClient();

  const message = `📊 Daily Order Summary - ${date}\n\n` +
    `Total Orders: ${totalOrders}\n` +
    `✅ Completed: ${completedOrders}\n` +
    `⏳ Pending: ${pendingOrders}\n` +
    `❌ Failed: ${failedOrders}\n` +
    `💰 Total Revenue: $${totalRevenue.toFixed(2)}\n\n` +
    `This is an automated daily summary report.`;

  const command = new PublishCommand({
    TopicArn: config.SNS_TOPIC_ARN,
    Subject: `Daily Order Summary - ${date}`,
    Message: message,
    MessageAttributes: {
      EventType: { DataType: 'String', StringValue: 'DAILY_SUMMARY' },
      Date: { DataType: 'String', StringValue: date },
    },
  });

  try {
    const result = await client.send(command);
    logger.info('Daily summary notification published', {
      date,
      messageId: result.MessageId,
    });
  } catch (error) {
    logger.error('Failed to publish daily summary', {
      error: String(error),
      date,
    });
    throw error;
  }
}

/**
 * Publish alarm notification.
 */
export async function publishAlarmNotification(
  alarmName: string,
  description: string
): Promise<void> {
  const config = getConfig();
  const client = getSNSClient();

  const message = `🚨 ALERT: ${alarmName}\n\n${description}\n\nPlease investigate immediately.`;

  const command = new PublishCommand({
    TopicArn: config.SNS_TOPIC_ARN,
    Subject: `⚠️ Alert: ${alarmName}`,
    Message: message,
    MessageAttributes: {
      EventType: { DataType: 'String', StringValue: 'ALARM' },
    },
  });

  try {
    await client.send(command);
    logger.info('Alarm notification published', { alarmName });
  } catch (error) {
    logger.error('Failed to publish alarm notification', {
      error: String(error),
      alarmName,
    });
    throw error;
  }
}
