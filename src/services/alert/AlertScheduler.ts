/**
 * AlertScheduler
 * Schedules alerts based on crop calendar and farming activities
 */

import { logger } from '../../utils/logger';
import {
  Alert,
  AlertScheduleRequest,
  AlertType,
  AlertPriority,
} from '../../types/alert.types';
import { DatabaseService, databaseService } from '../storage/DatabaseService';

export class AlertScheduler {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || databaseService;
  }

  /**
   * Schedule a new alert
   */
  async scheduleAlert(request: AlertScheduleRequest): Promise<string> {
    try {
      logger.info(`Scheduling alert: ${request.type} for user ${request.userId}`);

      // Validate scheduled time is in the future
      if (request.scheduledTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      const alertId = this.generateAlertId();
      const now = new Date();

      const alert: Alert = {
        id: alertId,
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        scheduledTime: request.scheduledTime,
        priority: request.priority,
        status: 'scheduled',
        actionable: request.actionable || false,
        actionUrl: request.actionUrl,
        metadata: request.metadata,
        createdAt: now,
        updatedAt: now,
      };

      // Store alert in database
      await this.db.execute(
        `INSERT INTO alerts (
          id, userId, type, title, message, scheduledTime, 
          priority, status, actionable, actionUrl, metadata, 
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alert.id,
          alert.userId,
          alert.type,
          alert.title,
          alert.message,
          alert.scheduledTime.toISOString(),
          alert.priority,
          alert.status,
          alert.actionable ? 1 : 0,
          alert.actionUrl || null,
          JSON.stringify(alert.metadata || {}),
          alert.createdAt.toISOString(),
          alert.updatedAt.toISOString(),
        ]
      );

      logger.info(`Alert scheduled successfully: ${alertId}`);
      return alertId;
    } catch (error) {
      logger.error('Failed to schedule alert', error);
      throw error;
    }
  }

  /**
   * Schedule multiple alerts in batch
   */
  async scheduleAlerts(requests: AlertScheduleRequest[]): Promise<string[]> {
    logger.info(`Scheduling ${requests.length} alerts in batch`);
    const alertIds: string[] = [];

    for (const request of requests) {
      try {
        const alertId = await this.scheduleAlert(request);
        alertIds.push(alertId);
      } catch (error) {
        logger.error(`Failed to schedule alert for user ${request.userId}`, error);
      }
    }

    logger.info(`Successfully scheduled ${alertIds.length}/${requests.length} alerts`);
    return alertIds;
  }

  /**
   * Cancel a scheduled alert
   */
  async cancelAlert(alertId: string): Promise<void> {
    try {
      logger.info(`Cancelling alert: ${alertId}`);

      await this.db.execute(
        `UPDATE alerts SET status = ?, updatedAt = ? WHERE id = ? AND status = ?`,
        ['dismissed', new Date().toISOString(), alertId, 'scheduled']
      );

      logger.info(`Alert cancelled: ${alertId}`);
    } catch (error) {
      logger.error('Failed to cancel alert', error);
      throw error;
    }
  }

  /**
   * Get alerts for a user within a date range
   */
  async getUserAlerts(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Alert[]> {
    try {
      logger.info(`Fetching alerts for user ${userId}`);

      const results = await this.db.query(
        `SELECT * FROM alerts 
         WHERE userId = ? 
         AND scheduledTime >= ? 
         AND scheduledTime <= ?
         ORDER BY scheduledTime ASC`,
        [userId, startDate.toISOString(), endDate.toISOString()]
      );

      const alerts = results.map((row: any) => this.mapRowToAlert(row));
      logger.info(`Found ${alerts.length} alerts for user ${userId}`);
      return alerts;
    } catch (error) {
      logger.error('Failed to fetch user alerts', error);
      throw error;
    }
  }

  /**
   * Get upcoming alerts (next N days)
   */
  async getUpcomingAlerts(userId: string, days: number = 7): Promise<Alert[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.getUserAlerts(userId, startDate, endDate);
  }

  /**
   * Get alerts due for delivery (scheduled time has passed)
   */
  async getDueAlerts(): Promise<Alert[]> {
    try {
      const now = new Date();
      logger.info('Fetching due alerts');

      const results = await this.db.query(
        `SELECT * FROM alerts 
         WHERE status = ? 
         AND scheduledTime <= ?
         ORDER BY priority DESC, scheduledTime ASC`,
        ['scheduled', now.toISOString()]
      );

      const alerts = results.map((row: any) => this.mapRowToAlert(row));
      logger.info(`Found ${alerts.length} due alerts`);
      return alerts;
    } catch (error) {
      logger.error('Failed to fetch due alerts', error);
      throw error;
    }
  }

  /**
   * Mark alert as sent
   */
  async markAlertAsSent(alertId: string): Promise<void> {
    try {
      const now = new Date();
      await this.db.execute(
        `UPDATE alerts SET status = ?, sentTime = ?, updatedAt = ? WHERE id = ?`,
        ['sent', now.toISOString(), now.toISOString(), alertId]
      );
      logger.info(`Alert marked as sent: ${alertId}`);
    } catch (error) {
      logger.error('Failed to mark alert as sent', error);
      throw error;
    }
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      const now = new Date();
      await this.db.execute(
        `UPDATE alerts SET status = ?, updatedAt = ? WHERE id = ?`,
        ['read', now.toISOString(), alertId]
      );
      logger.info(`Alert marked as read: ${alertId}`);
    } catch (error) {
      logger.error('Failed to mark alert as read', error);
      throw error;
    }
  }

  /**
   * Schedule crop activity alerts based on crop plan
   */
  async scheduleCropActivityAlerts(
    userId: string,
    cropPlanId: string,
    activities: Array<{
      type: AlertType;
      activityDate: Date;
      cropName: string;
      activityName: string;
    }>
  ): Promise<string[]> {
    logger.info(`Scheduling crop activity alerts for plan ${cropPlanId}`);

    const requests: AlertScheduleRequest[] = activities.map((activity) => {
      // Schedule alert 1-2 days before activity
      const alertDate = new Date(activity.activityDate);
      alertDate.setDate(alertDate.getDate() - 1);

      return {
        userId,
        type: activity.type,
        title: `Upcoming: ${activity.activityName}`,
        message: `Reminder: ${activity.activityName} for ${activity.cropName} is scheduled for ${activity.activityDate.toLocaleDateString()}`,
        scheduledTime: alertDate,
        priority: this.getPriorityForActivityType(activity.type),
        actionable: true,
        actionUrl: `/crop-plan/${cropPlanId}`,
        metadata: {
          cropPlanId,
          activityType: activity.type,
          activityDate: activity.activityDate.toISOString(),
        },
      };
    });

    return this.scheduleAlerts(requests);
  }

  /**
   * Schedule weather alert
   */
  async scheduleWeatherAlert(
    userId: string,
    weatherType: string,
    severity: string,
    startTime: Date,
    message: string
  ): Promise<string> {
    // Schedule alert 24 hours before severe weather
    const alertTime = new Date(startTime);
    alertTime.setHours(alertTime.getHours() - 24);

    return this.scheduleAlert({
      userId,
      type: 'weather',
      title: `Weather Alert: ${weatherType}`,
      message,
      scheduledTime: alertTime,
      priority: severity === 'severe' ? 'critical' : 'high',
      actionable: true,
      actionUrl: '/weather',
      metadata: {
        weatherType,
        severity,
        startTime: startTime.toISOString(),
      },
    });
  }

  /**
   * Schedule scheme deadline alert
   */
  async scheduleSchemeDeadlineAlert(
    userId: string,
    schemeId: string,
    schemeName: string,
    deadline: Date
  ): Promise<string[]> {
    const alertIds: string[] = [];

    // Schedule alerts at 7 days, 3 days, and 1 day before deadline
    const intervals = [7, 3, 1];

    for (const days of intervals) {
      const alertTime = new Date(deadline);
      alertTime.setDate(alertTime.getDate() - days);

      // Only schedule if alert time is in the future
      if (alertTime > new Date()) {
        const alertId = await this.scheduleAlert({
          userId,
          type: 'scheme',
          title: `Scheme Deadline Reminder`,
          message: `${schemeName} application deadline is in ${days} day${days > 1 ? 's' : ''}`,
          scheduledTime: alertTime,
          priority: days === 1 ? 'high' : 'medium',
          actionable: true,
          actionUrl: `/schemes/${schemeId}`,
          metadata: {
            schemeId,
            deadline: deadline.toISOString(),
            daysRemaining: days,
          },
        });
        alertIds.push(alertId);
      }
    }

    return alertIds;
  }

  /**
   * Helper: Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Get priority for activity type
   */
  private getPriorityForActivityType(type: AlertType): AlertPriority {
    const priorityMap: Record<AlertType, AlertPriority> = {
      sowing: 'high',
      fertilizer: 'medium',
      irrigation: 'medium',
      pest_control: 'high',
      harvest: 'critical',
      weather: 'high',
      scheme: 'medium',
    };
    return priorityMap[type] || 'medium';
  }

  /**
   * Helper: Map database row to Alert object
   */
  private mapRowToAlert(row: any): Alert {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type as AlertType,
      title: row.title,
      message: row.message,
      scheduledTime: new Date(row.scheduledTime),
      sentTime: row.sentTime ? new Date(row.sentTime) : undefined,
      priority: row.priority as AlertPriority,
      status: row.status,
      actionable: Boolean(row.actionable),
      actionUrl: row.actionUrl || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}

// Export singleton instance
export const alertScheduler = new AlertScheduler();
