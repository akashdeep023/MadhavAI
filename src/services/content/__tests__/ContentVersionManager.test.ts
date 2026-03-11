/**
 * Content Version Manager Tests
 *
 * Tests for content versioning, rollback, and scheduled releases.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContentVersionManager } from '../ContentVersionManager';

describe('ContentVersionManager', () => {
  let versionManager: ContentVersionManager;

  beforeEach(async () => {
    await AsyncStorage.clear();
    versionManager = ContentVersionManager.getInstance();
  });

  afterEach(async () => {
    await versionManager.clearAllVersions();
  });

  describe('Version Creation', () => {
    it('should create a new content version', async () => {
      const version = await versionManager.createVersion(
        'scheme',
        'scheme_001',
        { name: 'PM-KISAN', benefits: ['Direct income support'] },
        {
          author: 'admin',
          description: 'Initial version',
        }
      );

      expect(version).toBeDefined();
      expect(version.contentType).toBe('scheme');
      expect(version.contentId).toBe('scheme_001');
      expect(version.version).toBe('1.0.0');
      expect(version.status).toBe('draft');
    });

    it('should increment version numbers correctly', async () => {
      // Create first version
      const v1 = await versionManager.createVersion(
        'lesson',
        'lesson_001',
        { title: 'Organic Farming' },
        { author: 'admin', description: 'First version' }
      );

      // Create second version
      const v2 = await versionManager.createVersion(
        'lesson',
        'lesson_001',
        { title: 'Organic Farming Updated' },
        { author: 'admin', description: 'Second version' }
      );

      expect(v1.version).toBe('1.0.0');
      expect(v2.version).toBe('1.0.1');
    });

    it('should create scheduled version', async () => {
      const releaseDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const version = await versionManager.createVersion(
        'alert_template',
        'alert_001',
        { template: 'Weather alert' },
        { author: 'admin', description: 'Scheduled release' },
        releaseDate
      );

      expect(version.status).toBe('scheduled');
      expect(version.scheduledReleaseDate).toEqual(releaseDate);
    });
  });

  describe('Version Publishing', () => {
    it('should publish a version', async () => {
      // Create version
      const version = await versionManager.createVersion(
        'scheme',
        'scheme_002',
        { name: 'Soil Health Card' },
        { author: 'admin', description: 'New scheme' }
      );

      // Publish version
      const published = await versionManager.publishVersion(
        'scheme',
        'scheme_002',
        version.version
      );

      expect(published.status).toBe('published');
      expect(published.publishedAt).toBeDefined();

      // Check current version
      const current = await versionManager.getCurrentVersion('scheme', 'scheme_002');
      expect(current?.version).toBe(version.version);
    });

    it('should throw error when publishing non-existent version', async () => {
      await expect(
        versionManager.publishVersion('scheme', 'scheme_999', '1.0.0')
      ).rejects.toThrow();
    });
  });

  describe('Scheduled Releases', () => {
    it('should schedule a release', async () => {
      const version = await versionManager.createVersion(
        'lesson',
        'lesson_002',
        { title: 'Pest Management' },
        { author: 'admin', description: 'New lesson' }
      );

      const releaseDate = new Date(Date.now() + 1000);

      const scheduled = await versionManager.scheduleRelease(
        'lesson',
        'lesson_002',
        version.version,
        releaseDate
      );

      expect(scheduled.status).toBe('scheduled');
      expect(scheduled.scheduledReleaseDate).toEqual(releaseDate);
    });

    it('should get ready scheduled releases', async () => {
      // Create version with past release date
      const pastDate = new Date(Date.now() - 1000);
      await versionManager.createVersion(
        'scheme',
        'scheme_003',
        { name: 'Test Scheme' },
        { author: 'admin', description: 'Past release' },
        pastDate
      );

      // Create version with future release date
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await versionManager.createVersion(
        'scheme',
        'scheme_004',
        { name: 'Future Scheme' },
        { author: 'admin', description: 'Future release' },
        futureDate
      );

      const ready = await versionManager.getReadyScheduledReleases();

      expect(ready.length).toBe(1);
      expect(ready[0].contentId).toBe('scheme_003');
    });
  });

  describe('Version Rollback', () => {
    it('should rollback to previous version', async () => {
      // Create and publish v1
      const v1 = await versionManager.createVersion(
        'config',
        'config_001',
        { setting: 'value1' },
        { author: 'admin', description: 'Version 1' }
      );
      await versionManager.publishVersion('config', 'config_001', v1.version);

      // Create and publish v2
      const v2 = await versionManager.createVersion(
        'config',
        'config_001',
        { setting: 'value2' },
        { author: 'admin', description: 'Version 2' }
      );
      await versionManager.publishVersion('config', 'config_001', v2.version);

      // Rollback to v1
      const result = await versionManager.rollback('config', 'config_001', v1.version);

      expect(result.success).toBe(true);
      expect(result.previousVersion).toBe(v2.version);
      expect(result.newVersion).toBe(v1.version);

      // Verify current version
      const current = await versionManager.getCurrentVersion('config', 'config_001');
      expect(current?.version).toBe(v1.version);
    });

    it('should fail rollback to non-existent version', async () => {
      const result = await versionManager.rollback('scheme', 'scheme_999', '1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('Version History', () => {
    it('should maintain version history', async () => {
      // Create multiple versions
      await versionManager.createVersion(
        'lesson',
        'lesson_003',
        { title: 'V1' },
        { author: 'admin', description: 'Version 1' }
      );

      await versionManager.createVersion(
        'lesson',
        'lesson_003',
        { title: 'V2' },
        { author: 'admin', description: 'Version 2' }
      );

      await versionManager.createVersion(
        'lesson',
        'lesson_003',
        { title: 'V3' },
        { author: 'admin', description: 'Version 3' }
      );

      const history = await versionManager.getVersionHistory('lesson', 'lesson_003');

      expect(history.versions.length).toBe(3);
      expect(history.versions[0].version).toBe('1.0.0');
      expect(history.versions[1].version).toBe('1.0.1');
      expect(history.versions[2].version).toBe('1.0.2');
    });

    it('should get specific version', async () => {
      const created = await versionManager.createVersion(
        'scheme',
        'scheme_005',
        { name: 'Test' },
        { author: 'admin', description: 'Test version' }
      );

      const retrieved = await versionManager.getVersion('scheme', 'scheme_005', created.version);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.data.name).toBe('Test');
    });
  });

  describe('Version Archival', () => {
    it('should archive a version', async () => {
      const version = await versionManager.createVersion(
        'alert_template',
        'alert_002',
        { template: 'Old template' },
        { author: 'admin', description: 'To be archived' }
      );

      await versionManager.archiveVersion('alert_template', 'alert_002', version.version);

      const archived = await versionManager.getVersion(
        'alert_template',
        'alert_002',
        version.version
      );

      expect(archived?.status).toBe('archived');
    });
  });

  describe('Version Cleanup', () => {
    it('should cleanup old versions beyond limit', async () => {
      // Create 12 versions (exceeds MAX_VERSIONS_PER_CONTENT = 10)
      for (let i = 0; i < 12; i++) {
        await versionManager.createVersion(
          'lesson',
          'lesson_004',
          { title: `Version ${i + 1}` },
          { author: 'admin', description: `Version ${i + 1}` }
        );
      }

      const history = await versionManager.getVersionHistory('lesson', 'lesson_004');

      // Should keep only 10 most recent versions
      expect(history.versions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Current Version', () => {
    it('should return null for non-existent content', async () => {
      const current = await versionManager.getCurrentVersion('scheme', 'non_existent');
      expect(current).toBeNull();
    });

    it('should return current published version', async () => {
      const v1 = await versionManager.createVersion(
        'config',
        'config_002',
        { value: 'test' },
        { author: 'admin', description: 'Test' }
      );

      await versionManager.publishVersion('config', 'config_002', v1.version);

      const current = await versionManager.getCurrentVersion('config', 'config_002');

      expect(current).toBeDefined();
      expect(current?.version).toBe(v1.version);
      expect(current?.status).toBe('published');
    });
  });
});
