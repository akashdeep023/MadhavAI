/**
 * Content Sync Service
 *
 * Manages content synchronization with different timing windows based on content type.
 * - Training content: 24-hour sync window
 * - Scheme changes: 12-hour update window
 * - Critical updates: Forced sync on app launch
 *
 * **Validates: Requirements 18.2, 18.3, 18.4, 18.6**
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';
import RemoteContentUpdateService from './RemoteContentUpdateService';
import ContentUpdateAuditLogger from './ContentUpdateAuditLogger';
import { ContentType } from './ContentVersionManager';

export interface SyncWindow {
  contentType: ContentType;
  maxSyncHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SyncStatus {
  lastSyncTime: Date;
  nextScheduledSync: Date;
  pendingUpdates: number;
  isSyncing: boolean;
  lastSyncResult?: {
    successful: number;
    failed: number;
    timestamp: Date;
  };
}

export interface CriticalUpdate {
  id: string;
  contentType: ContentType;
  contentId: string;
  version: string;
  reason: string;
  mandatory: boolean;
}

export class ContentSyncService {
  private static instance: ContentSyncService;
  private readonly remoteUpdateService = RemoteContentUpdateService;
  private readonly auditLogger = ContentUpdateAuditLogger;
  private readonly STORAGE_KEY = 'content_sync_status';
  private readonly CRITICAL_UPDATES_KEY = 'critical_updates_pending';

  // Sync windows for different content types
  private readonly SYNC_WINDOWS: SyncWindow[] = [
    { contentType: 'lesson', maxSyncHours: 24, priority: 'medium' },
    { contentType: 'scheme', maxSyncHours: 12, priority: 'high' },
    { contentType: 'alert_template', maxSyncHours: 6, priority: 'high' },
    { contentType: 'config', maxSyncHours: 1, priority: 'critical' },
  ];

  private isSyncing = false;
  private syncInterval?: ReturnType<typeof setTimeout>;

  private constructor() {}

  static getInstance(): ContentSyncService {
    if (!ContentSyncService.instance) {
      ContentSyncService.instance = new ContentSyncService();
    }
    return ContentSyncService.instance;
  }

  /**
   * Initialize sync service
   */
  async initialize(): Promise<void> {
    logger.info('Initializing content sync service');

    // Check for critical updates on launch
    await this.checkCriticalUpdates();

    // Start periodic sync
    this.startPeriodicSync();
  }

  /**
   * Force sync for critical updates (blocking)
   */
  async forceCriticalSync(): Promise<boolean> {
    try {
      logger.info('Forcing critical sync');

      const criticalUpdates = await this.getCriticalUpdates();

      if (criticalUpdates.length === 0) {
        logger.info('No critical updates pending');
        return true;
      }

      // Fetch and apply critical updates
      for (const critical of criticalUpdates) {
        const update = await this.remoteUpdateService.getContentUpdate(
          critical.contentType,
          critical.contentId
        );

        if (update) {
          const success = await this.remoteUpdateService.applyUpdate(update);

          if (success) {
            await this.removeCriticalUpdate(critical.id);
            logger.info('Critical update applied', {
              contentType: critical.contentType,
              contentId: critical.contentId,
            });
          } else {
            logger.error('Failed to apply critical update', {
              contentType: critical.contentType,
              contentId: critical.contentId,
            });
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to force critical sync', { error });
      return false;
    }
  }

  /**
   * Sync content based on sync windows
   */
  async syncContent(): Promise<SyncStatus> {
    if (this.isSyncing) {
      logger.info('Sync already in progress');
      return await this.getSyncStatus();
    }

    this.isSyncing = true;

    try {
      logger.info('Starting content sync');

      const status = await this.getSyncStatus();
      const now = new Date();

      // Determine which content types need syncing
      const contentTypesToSync = this.getContentTypesNeedingSync(status.lastSyncTime, now);

      if (contentTypesToSync.length === 0) {
        logger.info('No content types need syncing');
        this.isSyncing = false;
        return status;
      }

      // Check for updates
      const updateCheck = await this.remoteUpdateService.checkForUpdates(contentTypesToSync);

      if (!updateCheck.available) {
        logger.info('No updates available');
        await this.updateSyncStatus(now, 0, 0);
        this.isSyncing = false;
        return await this.getSyncStatus();
      }

      // Apply updates
      const result = await this.remoteUpdateService.applyUpdates(updateCheck.updates);

      // Update sync status
      await this.updateSyncStatus(now, result.successful, result.failed);

      // Log sync completion
      await this.auditLogger.logUpdate({
        contentType: 'config',
        contentId: 'sync_service',
        version: '1.0.0',
        action: 'published',
        userId: 'system',
        changes: {
          syncedContentTypes: contentTypesToSync,
          successful: result.successful,
          failed: result.failed,
        },
      });

      logger.info('Content sync completed', {
        successful: result.successful,
        failed: result.failed,
      });

      this.isSyncing = false;
      return await this.getSyncStatus();
    } catch (error) {
      logger.error('Content sync failed', { error });
      this.isSyncing = false;
      throw error;
    }
  }

  /**
   * Sync specific content type
   */
  async syncContentType(contentType: ContentType): Promise<boolean> {
    try {
      logger.info('Syncing content type', { contentType });

      const updateCheck = await this.remoteUpdateService.checkForUpdates([contentType]);

      if (!updateCheck.available) {
        logger.info('No updates available for content type', { contentType });
        return true;
      }

      const result = await this.remoteUpdateService.applyUpdates(updateCheck.updates);

      logger.info('Content type sync completed', {
        contentType,
        successful: result.successful,
        failed: result.failed,
      });

      return result.failed === 0;
    } catch (error) {
      logger.error('Failed to sync content type', { error });
      return false;
    }
  }

  /**
   * Check for critical updates
   */
  async checkCriticalUpdates(): Promise<CriticalUpdate[]> {
    try {
      const criticalUpdates = await this.getCriticalUpdates();

      if (criticalUpdates.length > 0) {
        logger.warn('Critical updates pending', {
          count: criticalUpdates.length,
        });
      }

      return criticalUpdates;
    } catch (error) {
      logger.error('Failed to check critical updates', { error });
      return [];
    }
  }

  /**
   * Mark update as critical
   */
  async markAsCritical(
    contentType: ContentType,
    contentId: string,
    version: string,
    reason: string
  ): Promise<void> {
    try {
      const criticalUpdate: CriticalUpdate = {
        id: `critical_${Date.now()}`,
        contentType,
        contentId,
        version,
        reason,
        mandatory: true,
      };

      const criticalUpdates = await this.getCriticalUpdates();
      criticalUpdates.push(criticalUpdate);

      await AsyncStorage.setItem(this.CRITICAL_UPDATES_KEY, JSON.stringify(criticalUpdates));

      logger.info('Update marked as critical', {
        contentType,
        contentId,
        reason,
      });
    } catch (error) {
      logger.error('Failed to mark update as critical', { error });
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const statusJson = await AsyncStorage.getItem(this.STORAGE_KEY);

      if (statusJson) {
        const status = JSON.parse(statusJson);
        return {
          ...status,
          lastSyncTime: new Date(status.lastSyncTime),
          nextScheduledSync: new Date(status.nextScheduledSync),
          isSyncing: this.isSyncing,
        };
      }

      // Default status
      const now = new Date();
      return {
        lastSyncTime: new Date(0),
        nextScheduledSync: this.calculateNextSync(now),
        pendingUpdates: 0,
        isSyncing: false,
      };
    } catch (error) {
      logger.error('Failed to get sync status', { error });
      const now = new Date();
      return {
        lastSyncTime: new Date(0),
        nextScheduledSync: this.calculateNextSync(now),
        pendingUpdates: 0,
        isSyncing: false,
      };
    }
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    // Check every hour
    const CHECK_INTERVAL = 60 * 60 * 1000;

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncContent();
      } catch (error) {
        logger.error('Periodic sync failed', { error });
      }
    }, CHECK_INTERVAL);

    logger.info('Periodic sync started');
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
      logger.info('Periodic sync stopped');
    }
  }

  /**
   * Get content types needing sync
   */
  private getContentTypesNeedingSync(lastSyncTime: Date, now: Date): ContentType[] {
    const hoursSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
    const needsSync: ContentType[] = [];

    for (const window of this.SYNC_WINDOWS) {
      if (hoursSinceLastSync >= window.maxSyncHours) {
        needsSync.push(window.contentType);
      }
    }

    return needsSync;
  }

  /**
   * Calculate next sync time
   */
  private calculateNextSync(lastSync: Date): Date {
    // Use the shortest sync window
    const shortestWindow = Math.min(...this.SYNC_WINDOWS.map((w) => w.maxSyncHours));
    const nextSync = new Date(lastSync);
    nextSync.setHours(nextSync.getHours() + shortestWindow);
    return nextSync;
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(
    syncTime: Date,
    successful: number,
    failed: number
  ): Promise<void> {
    try {
      const status: SyncStatus = {
        lastSyncTime: syncTime,
        nextScheduledSync: this.calculateNextSync(syncTime),
        pendingUpdates: failed,
        isSyncing: false,
        lastSyncResult: {
          successful,
          failed,
          timestamp: syncTime,
        },
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(status));
    } catch (error) {
      logger.error('Failed to update sync status', { error });
    }
  }

  /**
   * Get critical updates
   */
  private async getCriticalUpdates(): Promise<CriticalUpdate[]> {
    try {
      const updatesJson = await AsyncStorage.getItem(this.CRITICAL_UPDATES_KEY);
      if (updatesJson) {
        return JSON.parse(updatesJson);
      }
      return [];
    } catch (error) {
      logger.error('Failed to get critical updates', { error });
      return [];
    }
  }

  /**
   * Remove critical update
   */
  private async removeCriticalUpdate(updateId: string): Promise<void> {
    try {
      const criticalUpdates = await this.getCriticalUpdates();
      const filtered = criticalUpdates.filter((u) => u.id !== updateId);
      await AsyncStorage.setItem(this.CRITICAL_UPDATES_KEY, JSON.stringify(filtered));
    } catch (error) {
      logger.error('Failed to remove critical update', { error });
    }
  }

  /**
   * Clear sync data (for testing)
   */
  async clearSyncData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.CRITICAL_UPDATES_KEY);
      this.stopPeriodicSync();
      logger.info('Sync data cleared');
    } catch (error) {
      logger.error('Failed to clear sync data', { error });
    }
  }
}

export default ContentSyncService.getInstance();
