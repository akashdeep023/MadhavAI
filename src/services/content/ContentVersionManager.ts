/**
 * Content Version Manager
 *
 * Manages content versioning for schemes, lessons, and alert templates.
 * Supports version history tracking and rollback capabilities.
 *
 * **Validates: Requirements 18.1, 18.5, 18.7**
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';

export type ContentType = 'scheme' | 'lesson' | 'alert_template' | 'config';

export interface ContentVersion {
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
  status: 'draft' | 'scheduled' | 'published' | 'archived' | 'rolled_back';
  scheduledReleaseDate?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionHistory {
  contentType: ContentType;
  contentId: string;
  versions: ContentVersion[];
  currentVersion: string;
}

export interface RollbackResult {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  message: string;
}

export class ContentVersionManager {
  private static instance: ContentVersionManager;
  private readonly STORAGE_PREFIX = 'content_version_';
  private readonly HISTORY_PREFIX = 'version_history_';
  private readonly MAX_VERSIONS_PER_CONTENT = 10;

  private constructor() {}

  static getInstance(): ContentVersionManager {
    if (!ContentVersionManager.instance) {
      ContentVersionManager.instance = new ContentVersionManager();
    }
    return ContentVersionManager.instance;
  }

  /**
   * Create a new content version
   */
  async createVersion(
    contentType: ContentType,
    contentId: string,
    data: any,
    metadata: ContentVersion['metadata'],
    scheduledReleaseDate?: Date
  ): Promise<ContentVersion> {
    try {
      const history = await this.getVersionHistory(contentType, contentId);
      const versionNumber = this.generateVersionNumber(history);

      const version: ContentVersion = {
        id: `${contentType}_${contentId}_v${versionNumber}`,
        contentType,
        contentId,
        version: versionNumber,
        data,
        metadata,
        status: scheduledReleaseDate ? 'scheduled' : 'draft',
        scheduledReleaseDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store version
      await this.storeVersion(version);

      // Update history
      history.versions.push(version);
      await this.updateVersionHistory(history);

      // Cleanup old versions if exceeding limit
      await this.cleanupOldVersions(contentType, contentId);

      logger.info('Content version created', {
        contentType,
        contentId,
        version: versionNumber,
      });

      return version;
    } catch (error) {
      logger.error('Failed to create content version', { error });
      throw error;
    }
  }

  /**
   * Publish a content version
   */
  async publishVersion(
    contentType: ContentType,
    contentId: string,
    version: string
  ): Promise<ContentVersion> {
    try {
      const contentVersion = await this.getVersion(contentType, contentId, version);
      if (!contentVersion) {
        throw new Error(`Version ${version} not found`);
      }

      // Update version status
      contentVersion.status = 'published';
      contentVersion.publishedAt = new Date();
      contentVersion.updatedAt = new Date();

      await this.storeVersion(contentVersion);

      // Update current version in history
      const history = await this.getVersionHistory(contentType, contentId);
      history.currentVersion = version;
      await this.updateVersionHistory(history);

      logger.info('Content version published', {
        contentType,
        contentId,
        version,
      });

      return contentVersion;
    } catch (error) {
      logger.error('Failed to publish content version', { error });
      throw error;
    }
  }

  /**
   * Schedule a content release
   */
  async scheduleRelease(
    contentType: ContentType,
    contentId: string,
    version: string,
    releaseDate: Date
  ): Promise<ContentVersion> {
    try {
      const contentVersion = await this.getVersion(contentType, contentId, version);
      if (!contentVersion) {
        throw new Error(`Version ${version} not found`);
      }

      contentVersion.status = 'scheduled';
      contentVersion.scheduledReleaseDate = releaseDate;
      contentVersion.updatedAt = new Date();

      await this.storeVersion(contentVersion);

      logger.info('Content release scheduled', {
        contentType,
        contentId,
        version,
        releaseDate,
      });

      return contentVersion;
    } catch (error) {
      logger.error('Failed to schedule content release', { error });
      throw error;
    }
  }

  /**
   * Get scheduled releases that are ready to publish
   */
  async getReadyScheduledReleases(): Promise<ContentVersion[]> {
    try {
      const now = new Date();
      const allVersions = await this.getAllVersions();

      return allVersions.filter(
        (version) =>
          version.status === 'scheduled' &&
          version.scheduledReleaseDate &&
          new Date(version.scheduledReleaseDate) <= now
      );
    } catch (error) {
      logger.error('Failed to get ready scheduled releases', { error });
      return [];
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollback(
    contentType: ContentType,
    contentId: string,
    targetVersion: string
  ): Promise<RollbackResult> {
    try {
      const history = await this.getVersionHistory(contentType, contentId);
      const currentVersion = history.currentVersion;

      // Validate target version exists
      const targetVersionData = await this.getVersion(contentType, contentId, targetVersion);
      if (!targetVersionData) {
        return {
          success: false,
          previousVersion: currentVersion,
          newVersion: currentVersion,
          message: `Target version ${targetVersion} not found`,
        };
      }

      // Mark current version as rolled back
      const currentVersionData = await this.getVersion(contentType, contentId, currentVersion);
      if (currentVersionData) {
        currentVersionData.status = 'rolled_back';
        currentVersionData.updatedAt = new Date();
        await this.storeVersion(currentVersionData);
      }

      // Publish target version
      await this.publishVersion(contentType, contentId, targetVersion);

      logger.info('Content rolled back', {
        contentType,
        contentId,
        from: currentVersion,
        to: targetVersion,
      });

      return {
        success: true,
        previousVersion: currentVersion,
        newVersion: targetVersion,
        message: `Successfully rolled back from ${currentVersion} to ${targetVersion}`,
      };
    } catch (error) {
      logger.error('Failed to rollback content', { error });
      return {
        success: false,
        previousVersion: '',
        newVersion: '',
        message: `Rollback failed: ${error}`,
      };
    }
  }

  /**
   * Get current published version
   */
  async getCurrentVersion(
    contentType: ContentType,
    contentId: string
  ): Promise<ContentVersion | null> {
    try {
      const history = await this.getVersionHistory(contentType, contentId);
      if (!history.currentVersion) {
        return null;
      }

      return await this.getVersion(contentType, contentId, history.currentVersion);
    } catch (error) {
      logger.error('Failed to get current version', { error });
      return null;
    }
  }

  /**
   * Get version history for content
   */
  async getVersionHistory(contentType: ContentType, contentId: string): Promise<VersionHistory> {
    try {
      const key = `${this.HISTORY_PREFIX}${contentType}_${contentId}`;
      const historyJson = await AsyncStorage.getItem(key);

      if (historyJson) {
        return JSON.parse(historyJson);
      }

      // Initialize new history
      return {
        contentType,
        contentId,
        versions: [],
        currentVersion: '',
      };
    } catch (error) {
      logger.error('Failed to get version history', { error });
      return {
        contentType,
        contentId,
        versions: [],
        currentVersion: '',
      };
    }
  }

  /**
   * Get specific version
   */
  async getVersion(
    contentType: ContentType,
    contentId: string,
    version: string
  ): Promise<ContentVersion | null> {
    try {
      const key = `${this.STORAGE_PREFIX}${contentType}_${contentId}_v${version}`;
      const versionJson = await AsyncStorage.getItem(key);

      if (versionJson) {
        return JSON.parse(versionJson);
      }

      return null;
    } catch (error) {
      logger.error('Failed to get version', { error });
      return null;
    }
  }

  /**
   * Get all versions across all content types
   */
  private async getAllVersions(): Promise<ContentVersion[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const versionKeys = keys.filter((key: string) => key.startsWith(this.STORAGE_PREFIX));

      const versions: ContentVersion[] = [];
      for (const key of versionKeys) {
        const versionJson = await AsyncStorage.getItem(key);
        if (versionJson) {
          versions.push(JSON.parse(versionJson));
        }
      }

      return versions;
    } catch (error) {
      logger.error('Failed to get all versions', { error });
      return [];
    }
  }

  /**
   * Store version
   */
  private async storeVersion(version: ContentVersion): Promise<void> {
    const key = `${this.STORAGE_PREFIX}${version.contentType}_${version.contentId}_v${version.version}`;
    await AsyncStorage.setItem(key, JSON.stringify(version));
  }

  /**
   * Update version history
   */
  private async updateVersionHistory(history: VersionHistory): Promise<void> {
    const key = `${this.HISTORY_PREFIX}${history.contentType}_${history.contentId}`;
    await AsyncStorage.setItem(key, JSON.stringify(history));
  }

  /**
   * Generate next version number
   */
  private generateVersionNumber(history: VersionHistory): string {
    if (history.versions.length === 0) {
      return '1.0.0';
    }

    const latestVersion = history.versions[history.versions.length - 1].version;
    const parts = latestVersion.split('.').map(Number);

    // Increment patch version
    parts[2]++;

    return parts.join('.');
  }

  /**
   * Cleanup old versions beyond the limit
   */
  private async cleanupOldVersions(contentType: ContentType, contentId: string): Promise<void> {
    try {
      const history = await this.getVersionHistory(contentType, contentId);

      if (history.versions.length > this.MAX_VERSIONS_PER_CONTENT) {
        // Keep only the most recent versions
        const versionsToRemove = history.versions.slice(
          0,
          history.versions.length - this.MAX_VERSIONS_PER_CONTENT
        );

        for (const version of versionsToRemove) {
          const key = `${this.STORAGE_PREFIX}${contentType}_${contentId}_v${version.version}`;
          await AsyncStorage.removeItem(key);
        }

        // Update history
        history.versions = history.versions.slice(-this.MAX_VERSIONS_PER_CONTENT);
        await this.updateVersionHistory(history);

        logger.info('Cleaned up old versions', {
          contentType,
          contentId,
          removed: versionsToRemove.length,
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old versions', { error });
    }
  }

  /**
   * Archive a version
   */
  async archiveVersion(
    contentType: ContentType,
    contentId: string,
    version: string
  ): Promise<void> {
    try {
      const contentVersion = await this.getVersion(contentType, contentId, version);
      if (contentVersion) {
        contentVersion.status = 'archived';
        contentVersion.updatedAt = new Date();
        await this.storeVersion(contentVersion);

        logger.info('Content version archived', {
          contentType,
          contentId,
          version,
        });
      }
    } catch (error) {
      logger.error('Failed to archive version', { error });
      throw error;
    }
  }

  /**
   * Clear all version data (for testing)
   */
  async clearAllVersions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const versionKeys = keys.filter(
        (key: string) => key.startsWith(this.STORAGE_PREFIX) || key.startsWith(this.HISTORY_PREFIX)
      );

      for (const key of versionKeys) {
        await AsyncStorage.removeItem(key);
      }

      logger.info('All version data cleared');
    } catch (error) {
      logger.error('Failed to clear version data', { error });
    }
  }
}

export default ContentVersionManager.getInstance();
