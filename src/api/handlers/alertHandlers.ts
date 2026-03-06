/**
 * Alert API Handlers
 * Lambda functions for alert scheduling and management
 */

import { alertScheduler } from '../../services/alert/AlertScheduler';
import { alertManager } from '../../services/alert/AlertManager';
import { notificationService } from '../../services/alert/NotificationService';
import { logger } from '../../utils/logger';
import {
  AlertScheduleRequest,
  AlertPreferences,
  AlertType,
} from '../../types/alert.types';

/**
 * Schedule a new alert
 */
export async function scheduleAlert(event: any): Promise<any> {
  try {
    const request: AlertScheduleRequest = JSON.parse(event.body);

    // Validate request
    if (!request.userId || !request.type || !request.title || !request.message || !request.scheduledTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: userId, type, title, message, scheduledTime',
        }),
      };
    }

    // Convert scheduledTime to Date
    request.scheduledTime = new Date(request.scheduledTime);

    const alertId = await alertScheduler.scheduleAlert(request);

    return {
      statusCode: 201,
      body: JSON.stringify({
        alertId,
        message: 'Alert scheduled successfully',
      }),
    };
  } catch (error) {
    logger.error('Failed to schedule alert', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to schedule alert',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Get alerts for a user
 */
export async function getUserAlerts(event: any): Promise<any> {
  try {
    const userId = event.pathParameters?.userId;
    const days = event.queryStringParameters?.days
      ? parseInt(event.queryStringParameters.days)
      : 7;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    const alerts = await alertScheduler.getUpcomingAlerts(userId, days);

    return {
      statusCode: 200,
      body: JSON.stringify({
        alerts,
        count: alerts.length,
      }),
    };
  } catch (error) {
    logger.error('Failed to get user alerts', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to get alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Cancel an alert
 */
export async function cancelAlert(event: any): Promise<any> {
  try {
    const alertId = event.pathParameters?.alertId;

    if (!alertId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'alertId is required' }),
      };
    }

    await alertScheduler.cancelAlert(alertId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Alert cancelled successfully',
      }),
    };
  } catch (error) {
    logger.error('Failed to cancel alert', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to cancel alert',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(event: any): Promise<any> {
  try {
    const alertId = event.pathParameters?.alertId;

    if (!alertId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'alertId is required' }),
      };
    }

    await alertScheduler.markAlertAsRead(alertId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Alert marked as read',
      }),
    };
  } catch (error) {
    logger.error('Failed to mark alert as read', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to mark alert as read',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Get alert preferences for a user
 */
export async function getAlertPreferences(event: any): Promise<any> {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    const preferences = await alertManager.getAlertPreferences(userId);

    return {
      statusCode: 200,
      body: JSON.stringify(preferences),
    };
  } catch (error) {
    logger.error('Failed to get alert preferences', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to get preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Update alert preferences for a user
 */
export async function updateAlertPreferences(event: any): Promise<any> {
  try {
    const userId = event.pathParameters?.userId;
    const preferences: Partial<AlertPreferences> = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    await alertManager.updateAlertPreferences(userId, preferences);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Preferences updated successfully',
      }),
    };
  } catch (error) {
    logger.error('Failed to update alert preferences', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Set quiet hours for a user
 */
export async function setQuietHours(event: any): Promise<any> {
  try {
    const userId = event.pathParameters?.userId;
    const { enabled, start, end } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    await alertManager.setQuietHours(userId, enabled, start, end);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Quiet hours updated successfully',
      }),
    };
  } catch (error) {
    logger.error('Failed to set quiet hours', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to set quiet hours',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Enable/disable specific alert type
 */
export async function setAlertTypeEnabled(event: any): Promise<any> {
  try {
    const userId = event.pathParameters?.userId;
    const { alertType, enabled } = JSON.parse(event.body);

    if (!userId || !alertType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId and alertType are required' }),
      };
    }

    await alertManager.setAlertTypeEnabled(userId, alertType as AlertType, enabled);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Alert type preference updated successfully',
      }),
    };
  } catch (error) {
    logger.error('Failed to set alert type enabled', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update alert type',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Schedule crop activity alerts
 */
export async function scheduleCropActivityAlerts(event: any): Promise<any> {
  try {
    const { userId, cropPlanId, activities } = JSON.parse(event.body);

    if (!userId || !cropPlanId || !activities) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: userId, cropPlanId, activities',
        }),
      };
    }

    // Convert activity dates to Date objects
    const parsedActivities = activities.map((activity: any) => ({
      ...activity,
      activityDate: new Date(activity.activityDate),
    }));

    const alertIds = await alertScheduler.scheduleCropActivityAlerts(
      userId,
      cropPlanId,
      parsedActivities
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        alertIds,
        count: alertIds.length,
        message: 'Crop activity alerts scheduled successfully',
      }),
    };
  } catch (error) {
    logger.error('Failed to schedule crop activity alerts', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to schedule crop activity alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Process due alerts (background job)
 */
export async function processDueAlerts(_event: any): Promise<any> {
  try {
    logger.info('Processing due alerts');

    const dueAlerts = await alertScheduler.getDueAlerts();
    logger.info(`Found ${dueAlerts.length} due alerts`);

    // In a real implementation, we would need to fetch user phone numbers
    // For now, we'll just send push notifications
    for (const alert of dueAlerts) {
      try {
        await notificationService.sendNotification(alert);
        await alertScheduler.markAlertAsSent(alert.id);
      } catch (error) {
        logger.error(`Failed to send alert ${alert.id}`, error);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: dueAlerts.length,
        message: 'Due alerts processed successfully',
      }),
    };
  } catch (error) {
    logger.error('Failed to process due alerts', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process due alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
