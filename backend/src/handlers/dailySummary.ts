// ============================================================
// Lambda Handler: Daily Summary (EventBridge Scheduled)
// ============================================================
//
// Triggered by EventBridge rule every day at 8 PM.
//
// Flow:
// 1. Query DynamoDB to get today's order statistics
// 2. Build summary report
// 3. Publish summary to SNS
// ============================================================

import { EventBridgeEvent } from 'aws-lambda';
import { getDailySummary } from '../services/database';
import { publishDailySummaryNotification } from '../services/notification';
import { createLogger } from '../utils/logger';

const logger = createLogger('DailySummaryHandler');

export const handler = async (
  event: EventBridgeEvent<'Scheduled Event', Record<string, unknown>>
): Promise<void> => {
  logger.info('DailySummary triggered', {
    time: event.time,
    source: event.source,
  });

  try {
    // ── 1. Get today's date (YYYY-MM-DD) ─────────────────
    const today = new Date().toISOString().split('T')[0];
    logger.info('Generating daily summary', { date: today });

    // ── 2. Query DynamoDB for summary ────────────────────
    const summary = await getDailySummary(today);
    logger.info('Daily summary retrieved', {
      date: today,
      totalOrders: summary.totalOrders,
      completedOrders: summary.completedOrders,
      pendingOrders: summary.pendingOrders,
      failedOrders: summary.failedOrders,
      totalRevenue: summary.totalRevenue,
    });

    // ── 3. Publish to SNS ────────────────────────────────
    await publishDailySummaryNotification(
      today,
      summary.totalOrders,
      summary.completedOrders,
      summary.pendingOrders,
      summary.failedOrders,
      summary.totalRevenue
    );

    logger.info('Daily summary notification sent successfully', { date: today });
  } catch (error) {
    logger.error('DailySummary failed', { error: String(error) });
    throw error;
  }
};
