/**
 * MemoryManager Tests
 * Tests for memory management utility
 */

import { MemoryManager, DEFAULT_MEMORY_CONFIG, LOW_MEMORY_CONFIG } from '../MemoryManager';

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager();
  });

  describe('Configuration Management', () => {
    it('initializes with default configuration', () => {
      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_MEMORY_CONFIG);
    });

    it('updates configuration partially', () => {
      manager.updateConfig({ compressionQuality: 0.5 });
      const config = manager.getConfig();
      expect(config.compressionQuality).toBe(0.5);
      expect(config.maxCacheSize).toBe(DEFAULT_MEMORY_CONFIG.maxCacheSize);
    });

    it('enables low memory mode', () => {
      manager.enableLowMemoryMode();
      const config = manager.getConfig();
      expect(config).toEqual(LOW_MEMORY_CONFIG);
    });

    it('disables low memory mode', () => {
      manager.enableLowMemoryMode();
      manager.disableLowMemoryMode();
      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_MEMORY_CONFIG);
    });

    it('clears cache when enabling low memory mode', () => {
      manager.addToCache(10 * 1024 * 1024); // 10 MB
      expect(manager.getCacheSize().total).toBeGreaterThan(0);

      manager.enableLowMemoryMode();
      expect(manager.getCacheSize().total).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('tracks cache size correctly', () => {
      const sizeInBytes = 5 * 1024 * 1024; // 5 MB
      manager.addToCache(sizeInBytes);

      const cacheSize = manager.getCacheSize();
      expect(cacheSize.total).toBeCloseTo(5, 1);
    });

    it('tracks image cache size correctly', () => {
      const sizeInBytes = 3 * 1024 * 1024; // 3 MB
      manager.addToImageCache(sizeInBytes);

      const cacheSize = manager.getCacheSize();
      expect(cacheSize.images).toBeCloseTo(3, 1);
    });

    it('removes from cache correctly', () => {
      const sizeInBytes = 10 * 1024 * 1024; // 10 MB
      manager.addToCache(sizeInBytes);
      manager.removeFromCache(sizeInBytes / 2);

      const cacheSize = manager.getCacheSize();
      expect(cacheSize.total).toBeCloseTo(5, 1);
    });

    it('removes from image cache correctly', () => {
      const sizeInBytes = 10 * 1024 * 1024; // 10 MB
      manager.addToImageCache(sizeInBytes);
      manager.removeFromImageCache(sizeInBytes / 2);

      const cacheSize = manager.getCacheSize();
      expect(cacheSize.images).toBeCloseTo(5, 1);
    });

    it('clears all cache', () => {
      manager.addToCache(5 * 1024 * 1024);
      manager.addToImageCache(3 * 1024 * 1024);

      manager.clearCache();

      const cacheSize = manager.getCacheSize();
      expect(cacheSize.total).toBe(0);
      expect(cacheSize.images).toBe(0);
    });

    it('does not allow negative cache size', () => {
      manager.removeFromCache(10 * 1024 * 1024);
      const cacheSize = manager.getCacheSize();
      expect(cacheSize.total).toBe(0);
    });
  });

  describe('Memory Warnings', () => {
    it('triggers memory warning when cache limit exceeded', (done) => {
      manager.onMemoryWarning(() => {
        done();
      });

      const exceedSize = (DEFAULT_MEMORY_CONFIG.maxCacheSize + 1) * 1024 * 1024;
      manager.addToCache(exceedSize);
    });

    it('triggers memory warning when image cache limit exceeded', (done) => {
      manager.onMemoryWarning(() => {
        done();
      });

      const exceedSize = (DEFAULT_MEMORY_CONFIG.maxImageCacheSize + 1) * 1024 * 1024;
      manager.addToImageCache(exceedSize);
    });

    it('does not trigger warning when disabled', (done) => {
      let warningTriggered = false;

      manager.updateConfig({ enableMemoryWarnings: false });
      manager.onMemoryWarning(() => {
        warningTriggered = true;
      });

      const exceedSize = (DEFAULT_MEMORY_CONFIG.maxCacheSize + 1) * 1024 * 1024;
      manager.addToCache(exceedSize);

      setTimeout(() => {
        expect(warningTriggered).toBe(false);
        done();
      }, 100);
    });
  });

  describe('Image Optimization', () => {
    it('returns compression quality', () => {
      expect(manager.getCompressionQuality()).toBe(DEFAULT_MEMORY_CONFIG.compressionQuality);
    });

    it('checks if image compression is enabled', () => {
      expect(manager.shouldCompressImages()).toBe(true);
      manager.updateConfig({ enableImageCompression: false });
      expect(manager.shouldCompressImages()).toBe(false);
    });

    it('calculates optimal image dimensions for landscape', () => {
      const result = manager.getOptimalImageDimensions(2000, 1000, 1024);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(512);
    });

    it('calculates optimal image dimensions for portrait', () => {
      const result = manager.getOptimalImageDimensions(1000, 2000, 1024);
      expect(result.width).toBe(512);
      expect(result.height).toBe(1024);
    });

    it('does not upscale small images', () => {
      const result = manager.getOptimalImageDimensions(500, 500, 1024);
      expect(result.width).toBe(500);
      expect(result.height).toBe(500);
    });

    it('estimates image memory correctly', () => {
      const memory = manager.estimateImageMemory(1920, 1080, 4);
      expect(memory).toBe(1920 * 1080 * 4);
    });
  });
});
