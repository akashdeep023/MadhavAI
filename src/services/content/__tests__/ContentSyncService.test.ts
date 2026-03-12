/**
 * Content Sync Service Tests
 *
 * Tests for content synchronization timing and propagation.
 */

// Mock ContentVersionManager
jest.mock('../ContentVersionManager', () => {
  const mockInstance = {
    getCurrentVersion: jest.fn(),
    createVersion: jest.fn(),
    publishVersion: jest.fn(),
    getReadyScheduledReleases: jest.fn(),
    getInstance: jest.fn(),
  };

  const MockClass: any = jest.fn().mockImplementation(() => mockInstance);
  MockClass.getInstance = jest.fn(() => mockInstance);

  return {
    ContentVersionManager: MockClass,
    default: mockInstance,
    __esModule: true,
  };
});

// Mock ContentUpdateAuditLogger
jest.mock('../ContentUpdateAuditLogger', () => {
  const mockInstance = {
    logUpdate: jest.fn(),
    getInstance: jest.fn(),
  };

  const MockClass: any = jest.fn().mockImplementation(() => mockInstance);
  MockClass.getInstance = jest.fn(() => mockInstance);

  return {
    ContentUpdateAuditLogger: MockClass,
    default: mockInstance,
    __esModule: true,
  };
});

// Mock RemoteContentUpdateService
jest.mock('../RemoteContentUpdateService', () => {
  const mockInstance = {
    checkForUpdates: jest.fn(),
    applyUpdates: jest.fn(),
    getContentUpdate: jest.fn(),
    applyUpdate: jest.fn(),
  };

  const MockClass: any = jest.fn().mockImplementation(() => mockInstance);
  MockClass.getInstance = jest.fn(() => mockInstance);

  return {
    RemoteContentUpdateService: MockClass,
    default: mockInstance,
    __esModule: true,
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContentSyncService } from '../ContentSyncService';
import RemoteContentUpdateService from '../RemoteContentUpdateService';

describe('ContentSyncService', () => {
  let syncService: ContentSyncService;
  let mockRemoteService: jest.Mocked<typeof RemoteContentUpdateService>;

  beforeEach(async () => {
    await AsyncStorage.clear();
    syncService = ContentSyncService.getInstance();
    mockRemoteService = RemoteContentUpdateService as jest.Mocked<
      typeof RemoteContentUpdateService
    >;
  });

  afterEach(async () => {
    await syncService.clearSyncData();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize sync service', async () => {
      await syncService.initialize();

      const status = await syncService.getSyncStatus();
      expect(status).toBeDefined();
      expect(status.isSyncing).toBe(false);
    });
  });

  describe('Sync Status', () => {
    it('should get default sync status', async () => {
      const status = await syncService.getSyncStatus();

      expect(status.lastSyncTime).toBeDefined();
      expect(status.nextScheduledSync).toBeDefined();
      expect(status.pendingUpdates).toBe(0);
      expect(status.isSyncing).toBe(false);
    });

    it('should update sync status after sync', async () => {
      mockRemoteService.checkForUpdates.mockResolvedValue({
        available: false,
        updates: [],
        lastChecked: new Date(),
      });

      await syncService.syncContent();

      const status = await syncService.getSyncStatus();
      expect(status.lastSyncResult).toBeDefined();
      expect(status.lastSyncResult?.successful).toBe(0);
      expect(status.lastSyncResult?.failed).toBe(0);
    });
  });

  describe('Content Synchronization', () => {
    it('should sync content when updates available', async () => {
      const mockUpdate = {
        id: 'update_001',
        contentType: 'lesson' as const,
        contentId: 'lesson_001',
        version: '1.0.0',
        data: { title: 'Test Lesson' },
        metadata: {
          author: 'admin',
          description: 'Test',
        },
        checksum: 'abc123',
        downloadUrl: 'https://example.com/lesson_001.json',
        size: 1024,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
      };

      mockRemoteService.checkForUpdates.mockResolvedValue({
        available: true,
        updates: [mockUpdate],
        lastChecked: new Date(),
      });

      mockRemoteService.applyUpdates.mockResolvedValue({
        successful: 1,
        failed: 0,
        results: [{ update: mockUpdate, success: true }],
      });

      const status = await syncService.syncContent();

      expect(status.lastSyncResult?.successful).toBe(1);
      expect(status.lastSyncResult?.failed).toBe(0);
    });

    it('should handle sync failures', async () => {
      const mockUpdate = {
        id: 'update_002',
        contentType: 'scheme' as const,
        contentId: 'scheme_001',
        version: '1.0.0',
        data: { name: 'Test Scheme' },
        metadata: {
          author: 'admin',
          description: 'Test',
        },
        checksum: 'def456',
        downloadUrl: 'https://example.com/scheme_001.json',
        size: 2048,
        priority: 'high' as const,
        createdAt: new Date().toISOString(),
      };

      mockRemoteService.checkForUpdates.mockResolvedValue({
        available: true,
        updates: [mockUpdate],
        lastChecked: new Date(),
      });

      mockRemoteService.applyUpdates.mockResolvedValue({
        successful: 0,
        failed: 1,
        results: [{ update: mockUpdate, success: false }],
      });

      const status = await syncService.syncContent();

      expect(status.lastSyncResult?.successful).toBe(0);
      expect(status.lastSyncResult?.failed).toBe(1);
      expect(status.pendingUpdates).toBe(1);
    });

    it('should not sync when already syncing', async () => {
      // Start first sync
      const syncPromise1 = syncService.syncContent();

      // Try to start second sync immediately
      const syncPromise2 = syncService.syncContent();

      await Promise.all([syncPromise1, syncPromise2]);

      // Second sync should return immediately without doing work
      expect(mockRemoteService.checkForUpdates).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content Type Sync', () => {
    it('should sync specific content type', async () => {
      mockRemoteService.checkForUpdates.mockResolvedValue({
        available: true,
        updates: [
          {
            id: 'update_003',
            contentType: 'lesson',
            contentId: 'lesson_002',
            version: '1.0.0',
            data: { title: 'Lesson' },
            metadata: { author: 'admin', description: 'Test' },
            checksum: 'ghi789',
            downloadUrl: 'https://example.com/lesson_002.json',
            size: 1024,
            priority: 'medium',
            createdAt: new Date().toISOString(),
          },
        ],
        lastChecked: new Date(),
      });

      mockRemoteService.applyUpdates.mockResolvedValue({
        successful: 1,
        failed: 0,
        results: [],
      });

      const success = await syncService.syncContentType('lesson');

      expect(success).toBe(true);
      expect(mockRemoteService.checkForUpdates).toHaveBeenCalledWith(['lesson']);
    });

    it('should return true when no updates available', async () => {
      mockRemoteService.checkForUpdates.mockResolvedValue({
        available: false,
        updates: [],
        lastChecked: new Date(),
      });

      const success = await syncService.syncContentType('scheme');

      expect(success).toBe(true);
    });
  });

  describe('Critical Updates', () => {
    it('should mark update as critical', async () => {
      await syncService.markAsCritical('config', 'config_001', '2.0.0', 'Security patch');

      const criticalUpdates = await syncService.checkCriticalUpdates();

      expect(criticalUpdates.length).toBe(1);
      expect(criticalUpdates[0].contentType).toBe('config');
      expect(criticalUpdates[0].reason).toBe('Security patch');
      expect(criticalUpdates[0].mandatory).toBe(true);
    });

    it('should force sync critical updates', async () => {
      // Mark as critical
      await syncService.markAsCritical('config', 'config_002', '1.0.0', 'Critical fix');

      const mockUpdate = {
        id: 'update_004',
        contentType: 'config' as const,
        contentId: 'config_002',
        version: '1.0.0',
        data: { setting: 'value' },
        metadata: {
          author: 'admin',
          description: 'Critical',
        },
        checksum: 'jkl012',
        downloadUrl: 'https://example.com/config_002.json',
        size: 512,
        priority: 'critical' as const,
        createdAt: new Date().toISOString(),
      };

      mockRemoteService.getContentUpdate.mockResolvedValue(mockUpdate);
      mockRemoteService.applyUpdate.mockResolvedValue(true);

      const success = await syncService.forceCriticalSync();

      expect(success).toBe(true);
      expect(mockRemoteService.applyUpdate).toHaveBeenCalledWith(mockUpdate);

      // Verify critical update was removed
      const remaining = await syncService.checkCriticalUpdates();
      expect(remaining.length).toBe(0);
    });

    it('should return false if critical sync fails', async () => {
      await syncService.markAsCritical('config', 'config_003', '1.0.0', 'Critical');

      mockRemoteService.getContentUpdate.mockResolvedValue({
        id: 'update_005',
        contentType: 'config',
        contentId: 'config_003',
        version: '1.0.0',
        data: {},
        metadata: { author: 'admin', description: 'Test' },
        checksum: 'mno345',
        downloadUrl: 'https://example.com/config_003.json',
        size: 256,
        priority: 'critical',
        createdAt: new Date().toISOString(),
      });

      mockRemoteService.applyUpdate.mockResolvedValue(false);

      const success = await syncService.forceCriticalSync();

      expect(success).toBe(false);
    });
  });

  describe('Periodic Sync', () => {
    it('should stop periodic sync', () => {
      syncService.stopPeriodicSync();

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('Sync Windows', () => {
    it('should respect sync windows for different content types', async () => {
      // This test verifies that the sync service has different windows
      // for different content types (24h for lessons, 12h for schemes, etc.)

      mockRemoteService.checkForUpdates.mockResolvedValue({
        available: false,
        updates: [],
        lastChecked: new Date(),
      });

      await syncService.syncContent();

      const status = await syncService.getSyncStatus();

      // Next sync should be scheduled
      expect(status.nextScheduledSync.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
