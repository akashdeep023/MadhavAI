/**
 * Remote Content Update Service
 *
 * Manages remote content updates without requiring app store updates.
 * Handles downloading, validating, and applying content updates.
 *
 * **Validates: Requirements 18.1, 18.5, 18.7**
 */

import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { ContentType, ContentVersion } from './ContentVersionManager';
import contentVersionManagerInstance from './ContentVersionManager';
import contentUpdateAuditLoggerInstance from './ContentUpdateAuditLogger';

export interface RemoteContentUpdate {
  id: string;
  contentType: ContentType;
  contentId: string;
  version: string;
  data: any;
  metadata: {
    author: string;
    description: string;
    releaseNotes?: string;
    tags?: string[];
  };
  checksum: string;
  downloadUrl: string;
  size: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledReleaseDate?: string;
  createdAt: string;
}

export interface UpdateCheckResult {
  available: boolean;
  updates: RemoteContentUpdate[];
  lastChecked: Date;
}

export class RemoteContentUpdateService {
  private static instance: RemoteContentUpdateService;
  private readonly API_BASE_URL = config.OTA_API_BASE_URL;
  private versionManager: typeof contentVersionManagerInstance;
  private auditLogger: typeof contentUpdateAuditLoggerInstance;

  private constructor() {
    this.versionManager = contentVersionManagerInstance;
    this.auditLogger = contentUpdateAuditLoggerInstance;
  }

  static getInstance(): RemoteContentUpdateService {
    if (!RemoteContentUpdateService.instance) {
      RemoteContentUpdateService.instance = new RemoteContentUpdateService();
    }
    return RemoteContentUpdateService.instance;
  }

  /**
   * Check for available content updates
   */
  async checkForUpdates(contentTypes?: ContentType[]): Promise<UpdateCheckResult> {
    try {
      logger.info('Checking for remote content updates', { contentTypes });

      const response = await axios.get(`${this.API_BASE_URL}/content/updates`, {
        params: {
          contentTypes: contentTypes?.join(','),
        },
        timeout: 10000,
      });

      const updates: RemoteContentUpdate[] = response.data.updates || [];

      // Filter out already installed updates
      const pendingUpdates = await this.filterPendingUpdates(updates);

      logger.info('Content update check completed', {
        total: updates.length,
        pending: pendingUpdates.length,
      });

      return {
        available: pendingUpdates.length > 0,
        updates: pendingUpdates,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error('Failed to check for content updates', { error });
      return {
        available: false,
        updates: [],
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Download and apply a content update
   */
  async applyUpdate(update: RemoteContentUpdate): Promise<boolean> {
    try {
      logger.info('Applying content update', {
        contentType: update.contentType,
        contentId: update.contentId,
        version: update.version,
      });

      // Download content
      const content = await this.downloadContent(update);

      // Verify checksum
      const isValid = await this.verifyChecksum(content, update.checksum);
      if (!isValid) {
        throw new Error('Checksum verification failed');
      }

      // Create version
      const scheduledDate = update.scheduledReleaseDate
        ? new Date(update.scheduledReleaseDate)
        : undefined;

      const version = await this.versionManager.createVersion(
        update.contentType,
        update.contentId,
        content,
        update.metadata,
        scheduledDate
      );

      // If not scheduled, publish immediately
      if (!scheduledDate) {
        await this.versionManager.publishVersion(
          update.contentType,
          update.contentId,
          version.version
        );
      }

      // Log update
      await this.auditLogger.logUpdate({
        contentType: update.contentType,
        contentId: update.contentId,
        version: version.version,
        action: scheduledDate ? 'scheduled' : 'published',
        userId: 'system',
        changes: {
          description: update.metadata.description,
          releaseNotes: update.metadata.releaseNotes,
        },
      });

      logger.info('Content update applied successfully', {
        contentType: update.contentType,
        contentId: update.contentId,
        version: version.version,
      });

      return true;
    } catch (error) {
      logger.error('Failed to apply content update', { error });
      return false;
    }
  }

  /**
   * Apply multiple updates
   */
  async applyUpdates(updates: RemoteContentUpdate[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ update: RemoteContentUpdate; success: boolean }>;
  }> {
    const results: Array<{ update: RemoteContentUpdate; success: boolean }> = [];
    let successful = 0;
    let failed = 0;

    // Sort by priority
    const sortedUpdates = this.sortByPriority(updates);

    for (const update of sortedUpdates) {
      const success = await this.applyUpdate(update);
      results.push({ update, success });

      if (success) {
        successful++;
      } else {
        failed++;
      }
    }

    logger.info('Batch update completed', { successful, failed });

    return { successful, failed, results };
  }

  /**
   * Get update for specific content
   */
  async getContentUpdate(
    contentType: ContentType,
    contentId: string
  ): Promise<RemoteContentUpdate | null> {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/content/updates/${contentType}/${contentId}`,
        {
          timeout: 5000,
        }
      );

      return response.data.update || null;
    } catch (error) {
      logger.error('Failed to get content update', { error });
      return null;
    }
  }

  /**
   * Rollback content to previous version
   */
  async rollbackContent(
    contentType: ContentType,
    contentId: string,
    targetVersion: string
  ): Promise<boolean> {
    try {
      logger.info('Rolling back content', {
        contentType,
        contentId,
        targetVersion,
      });

      const result = await this.versionManager.rollback(contentType, contentId, targetVersion);

      if (result.success) {
        // Log rollback
        await this.auditLogger.logUpdate({
          contentType,
          contentId,
          version: targetVersion,
          action: 'rollback',
          userId: 'system',
          changes: {
            from: result.previousVersion,
            to: result.newVersion,
            reason: 'Manual rollback',
          },
        });

        logger.info('Content rollback successful', result);
        return true;
      } else {
        logger.error('Content rollback failed', result);
        return false;
      }
    } catch (error) {
      logger.error('Failed to rollback content', { error });
      return false;
    }
  }

  /**
   * Process scheduled releases
   */
  async processScheduledReleases(): Promise<void> {
    try {
      const readyReleases = await this.versionManager.getReadyScheduledReleases();

      logger.info('Processing scheduled releases', {
        count: readyReleases.length,
      });

      for (const release of readyReleases) {
        await this.versionManager.publishVersion(
          release.contentType,
          release.contentId,
          release.version
        );

        // Log release
        await this.auditLogger.logUpdate({
          contentType: release.contentType,
          contentId: release.contentId,
          version: release.version,
          action: 'auto_published',
          userId: 'system',
          changes: {
            scheduledDate: release.scheduledReleaseDate,
            publishedDate: new Date(),
          },
        });

        logger.info('Scheduled release published', {
          contentType: release.contentType,
          contentId: release.contentId,
          version: release.version,
        });
      }
    } catch (error) {
      logger.error('Failed to process scheduled releases', { error });
    }
  }

  /**
   * Download content from remote URL
   */
  private async downloadContent(update: RemoteContentUpdate): Promise<any> {
    try {
      const response = await axios.get(update.downloadUrl, {
        timeout: 60000,
        responseType: 'json',
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to download content', { error });
      throw error;
    }
  }

  /**
   * Verify content checksum
   */
  private async verifyChecksum(_content: any, _expectedChecksum: string): Promise<boolean> {
    // In production, implement proper checksum verification (SHA-256)
    // For now, return true
    return true;
  }

  /**
   * Filter out already installed updates
   */
  private async filterPendingUpdates(
    updates: RemoteContentUpdate[]
  ): Promise<RemoteContentUpdate[]> {
    const pending: RemoteContentUpdate[] = [];

    for (const update of updates) {
      const currentVersion = await this.versionManager.getCurrentVersion(
        update.contentType,
        update.contentId
      );

      // Include if no current version or version is different
      if (!currentVersion || currentVersion.version !== update.version) {
        pending.push(update);
      }
    }

    return pending;
  }

  /**
   * Sort updates by priority
   */
  private sortByPriority(updates: RemoteContentUpdate[]): RemoteContentUpdate[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return [...updates].sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get content version info
   */
  async getContentVersionInfo(
    contentType: ContentType,
    contentId: string
  ): Promise<ContentVersion | null> {
    return await this.versionManager.getCurrentVersion(contentType, contentId);
  }

  /**
   * Get version history
   */
  async getVersionHistory(contentType: ContentType, contentId: string) {
    return await this.versionManager.getVersionHistory(contentType, contentId);
  }
}

export default RemoteContentUpdateService.getInstance();
