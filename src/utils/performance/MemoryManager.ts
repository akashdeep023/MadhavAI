/**
 * MemoryManager Utility
 * Manages memory usage for low-end devices
 * Requirements: 17.8
 */

/**
 * Memory management configuration
 */
export interface MemoryConfig {
  maxCacheSize: number; // in MB
  maxImageCacheSize: number; // in MB
  enableImageCompression: boolean;
  compressionQuality: number; // 0-1
  enableMemoryWarnings: boolean;
}

/**
 * Default memory configuration for 2GB RAM devices
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxCacheSize: 100, // 100 MB
  maxImageCacheSize: 50, // 50 MB
  enableImageCompression: true,
  compressionQuality: 0.7,
  enableMemoryWarnings: true,
};

/**
 * Low memory configuration
 */
export const LOW_MEMORY_CONFIG: MemoryConfig = {
  maxCacheSize: 50, // 50 MB
  maxImageCacheSize: 25, // 25 MB
  enableImageCompression: true,
  compressionQuality: 0.5,
  enableMemoryWarnings: true,
};

/**
 * Memory manager class
 * Monitors and optimizes memory usage
 */
export class MemoryManager {
  private config: MemoryConfig;
  private cacheSize: number = 0;
  private imageCacheSize: number = 0;
  private memoryWarningCallbacks: Array<() => void> = [];

  constructor(config: MemoryConfig = DEFAULT_MEMORY_CONFIG) {
    this.config = config;
  }

  /**
   * Update memory configuration
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable low memory mode
   */
  enableLowMemoryMode(): void {
    this.updateConfig(LOW_MEMORY_CONFIG);
    this.clearCache();
  }

  /**
   * Disable low memory mode
   */
  disableLowMemoryMode(): void {
    this.updateConfig(DEFAULT_MEMORY_CONFIG);
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Track cache size
   */
  addToCache(sizeInBytes: number): void {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    this.cacheSize += sizeInMB;
    this.checkMemoryLimits();
  }

  /**
   * Track image cache size
   */
  addToImageCache(sizeInBytes: number): void {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    this.imageCacheSize += sizeInMB;
    this.checkMemoryLimits();
  }

  /**
   * Remove from cache
   */
  removeFromCache(sizeInBytes: number): void {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    this.cacheSize = Math.max(0, this.cacheSize - sizeInMB);
  }

  /**
   * Remove from image cache
   */
  removeFromImageCache(sizeInBytes: number): void {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    this.imageCacheSize = Math.max(0, this.imageCacheSize - sizeInMB);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cacheSize = 0;
    this.imageCacheSize = 0;
  }

  /**
   * Get current cache size
   */
  getCacheSize(): { total: number; images: number } {
    return {
      total: this.cacheSize,
      images: this.imageCacheSize,
    };
  }

  /**
   * Check if cache limits are exceeded
   */
  private checkMemoryLimits(): void {
    if (this.cacheSize > this.config.maxCacheSize) {
      this.triggerMemoryWarning();
    }
    if (this.imageCacheSize > this.config.maxImageCacheSize) {
      this.triggerMemoryWarning();
    }
  }

  /**
   * Register memory warning callback
   */
  onMemoryWarning(callback: () => void): void {
    this.memoryWarningCallbacks.push(callback);
  }

  /**
   * Trigger memory warning
   */
  private triggerMemoryWarning(): void {
    if (this.config.enableMemoryWarnings) {
      this.memoryWarningCallbacks.forEach((callback) => callback());
    }
  }

  /**
   * Get image compression quality
   */
  getCompressionQuality(): number {
    return this.config.compressionQuality;
  }

  /**
   * Check if image compression is enabled
   */
  shouldCompressImages(): boolean {
    return this.config.enableImageCompression;
  }

  /**
   * Calculate optimal image dimensions for device
   */
  getOptimalImageDimensions(
    originalWidth: number,
    originalHeight: number,
    maxDimension: number = 1024
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    if (originalWidth > originalHeight) {
      const width = Math.min(originalWidth, maxDimension);
      const height = width / aspectRatio;
      return { width, height };
    } else {
      const height = Math.min(originalHeight, maxDimension);
      const width = height * aspectRatio;
      return { width, height };
    }
  }

  /**
   * Estimate memory usage for an image
   */
  estimateImageMemory(width: number, height: number, bytesPerPixel: number = 4): number {
    return width * height * bytesPerPixel;
  }
}

/**
 * Global memory manager instance
 */
export const memoryManager = new MemoryManager();
