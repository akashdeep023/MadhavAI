/**
 * Content Update Audit Logger
 *
 * Logs all content updates for audit purposes with timestamp and details.
 *
 * **Validates: Requirements 18.6**
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';
import { ContentType } from './ContentVersionManager';

export interface AuditLogEntry {
  id: string;
  contentType: ContentType;
  contentId: string;
  version: string;
  action: 'created' | 'published' | 'scheduled' | 'rollback' | 'archived' | 'auto_published';
  userId: string;
  timestamp: Date;
  changes: any;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
  };
}

export interface AuditLogQuery {
  contentType?: ContentType;
  contentId?: string;
  action?: AuditLogEntry['action'];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class ContentUpdateAuditLogger {
  private static instance: ContentUpdateAuditLogger;
  private readonly STORAGE_KEY = 'content_audit_logs';
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  static getInstance(): ContentUpdateAuditLogger {
    if (!ContentUpdateAuditLogger.instance) {
      ContentUpdateAuditLogger.instance = new ContentUpdateAuditLogger();
    }
    return ContentUpdateAuditLogger.instance;
  }

  /**
   * Log a content update
   */
  async logUpdate(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        ...entry,
        id: this.generateLogId(),
        timestamp: new Date(),
      };

      // Get existing logs
      const logs = await this.getAllLogs();

      // Add new log
      logs.push(logEntry);

      // Trim if exceeding max
      const trimmedLogs = logs.slice(-this.MAX_LOGS);

      // Store logs
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedLogs));

      logger.info('Content update logged', {
        contentType: entry.contentType,
        contentId: entry.contentId,
        action: entry.action,
      });
    } catch (error) {
      logger.error('Failed to log content update', { error });
    }
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditLogQuery = {}): Promise<AuditLogEntry[]> {
    try {
      let logs = await this.getAllLogs();

      // Apply filters
      if (query.contentType) {
        logs = logs.filter((log) => log.contentType === query.contentType);
      }

      if (query.contentId) {
        logs = logs.filter((log) => log.contentId === query.contentId);
      }

      if (query.action) {
        logs = logs.filter((log) => log.action === query.action);
      }

      if (query.userId) {
        logs = logs.filter((log) => log.userId === query.userId);
      }

      if (query.startDate) {
        logs = logs.filter((log) => new Date(log.timestamp) >= query.startDate!);
      }

      if (query.endDate) {
        logs = logs.filter((log) => new Date(log.timestamp) <= query.endDate!);
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      if (query.limit) {
        logs = logs.slice(0, query.limit);
      }

      return logs;
    } catch (error) {
      logger.error('Failed to query audit logs', { error });
      return [];
    }
  }

  /**
   * Get logs for specific content
   */
  async getContentLogs(contentType: ContentType, contentId: string): Promise<AuditLogEntry[]> {
    return await this.queryLogs({ contentType, contentId });
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(limit: number = 50): Promise<AuditLogEntry[]> {
    return await this.queryLogs({ limit });
  }

  /**
   * Get logs by action type
   */
  async getLogsByAction(action: AuditLogEntry['action']): Promise<AuditLogEntry[]> {
    return await this.queryLogs({ action });
  }

  /**
   * Get logs for date range
   */
  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<AuditLogEntry[]> {
    return await this.queryLogs({ startDate, endDate });
  }

  /**
   * Get audit statistics
   */
  async getStatistics(): Promise<{
    totalLogs: number;
    byContentType: Record<ContentType, number>;
    byAction: Record<string, number>;
    recentActivity: number;
  }> {
    try {
      const logs = await this.getAllLogs();
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const byContentType: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      let recentActivity = 0;

      for (const log of logs) {
        // Count by content type
        byContentType[log.contentType] = (byContentType[log.contentType] || 0) + 1;

        // Count by action
        byAction[log.action] = (byAction[log.action] || 0) + 1;

        // Count recent activity
        if (new Date(log.timestamp) >= last24Hours) {
          recentActivity++;
        }
      }

      return {
        totalLogs: logs.length,
        byContentType: byContentType as Record<ContentType, number>,
        byAction,
        recentActivity,
      };
    } catch (error) {
      logger.error('Failed to get audit statistics', { error });
      return {
        totalLogs: 0,
        byContentType: {} as Record<ContentType, number>,
        byAction: {},
        recentActivity: 0,
      };
    }
  }

  /**
   * Export logs as JSON
   */
  async exportLogs(query: AuditLogQuery = {}): Promise<string> {
    const logs = await this.queryLogs(query);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clear old logs
   */
  async clearOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const logs = await this.getAllLogs();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filteredLogs = logs.filter((log) => new Date(log.timestamp) >= cutoffDate);
      const removedCount = logs.length - filteredLogs.length;

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredLogs));

      logger.info('Old audit logs cleared', {
        removed: removedCount,
        remaining: filteredLogs.length,
      });

      return removedCount;
    } catch (error) {
      logger.error('Failed to clear old logs', { error });
      return 0;
    }
  }

  /**
   * Get all logs
   */
  private async getAllLogs(): Promise<AuditLogEntry[]> {
    try {
      const logsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (logsJson) {
        return JSON.parse(logsJson);
      }
      return [];
    } catch (error) {
      logger.error('Failed to get all logs', { error });
      return [];
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all logs (for testing)
   */
  async clearAllLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      logger.info('All audit logs cleared');
    } catch (error) {
      logger.error('Failed to clear all logs', { error });
    }
  }
}

export default ContentUpdateAuditLogger.getInstance();
