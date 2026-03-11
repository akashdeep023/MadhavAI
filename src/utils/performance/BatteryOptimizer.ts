/**
 * BatteryOptimizer Utility
 * Optimizes battery consumption for low-end devices
 * Requirements: 17.7
 */

/**
 * Battery optimization configuration
 */
export interface BatteryOptimizationConfig {
  enableBackgroundSync: boolean;
  syncInterval: number; // in milliseconds
  enableAnimations: boolean;
  enableLocationTracking: boolean;
  maxConcurrentRequests: number;
}

/**
 * Default battery-friendly configuration
 */
export const DEFAULT_BATTERY_CONFIG: BatteryOptimizationConfig = {
  enableBackgroundSync: true,
  syncInterval: 3600000, // 1 hour
  enableAnimations: true,
  enableLocationTracking: false,
  maxConcurrentRequests: 2,
};

/**
 * Low battery mode configuration
 */
export const LOW_BATTERY_CONFIG: BatteryOptimizationConfig = {
  enableBackgroundSync: false,
  syncInterval: 7200000, // 2 hours
  enableAnimations: false,
  enableLocationTracking: false,
  maxConcurrentRequests: 1,
};

/**
 * Battery optimizer class
 * Manages battery-friendly settings and behaviors
 */
export class BatteryOptimizer {
  private config: BatteryOptimizationConfig;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: BatteryOptimizationConfig = DEFAULT_BATTERY_CONFIG) {
    this.config = config;
  }

  /**
   * Update optimization configuration
   */
  updateConfig(config: Partial<BatteryOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    this.restartSyncTimer();
  }

  /**
   * Enable low battery mode
   */
  enableLowBatteryMode(): void {
    this.updateConfig(LOW_BATTERY_CONFIG);
  }

  /**
   * Disable low battery mode
   */
  disableLowBatteryMode(): void {
    this.updateConfig(DEFAULT_BATTERY_CONFIG);
  }

  /**
   * Get current configuration
   */
  getConfig(): BatteryOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Check if animations should be enabled
   */
  shouldEnableAnimations(): boolean {
    return this.config.enableAnimations;
  }

  /**
   * Check if background sync should be enabled
   */
  shouldEnableBackgroundSync(): boolean {
    return this.config.enableBackgroundSync;
  }

  /**
   * Get sync interval
   */
  getSyncInterval(): number {
    return this.config.syncInterval;
  }

  /**
   * Get max concurrent requests
   */
  getMaxConcurrentRequests(): number {
    return this.config.maxConcurrentRequests;
  }

  /**
   * Start sync timer
   */
  startSyncTimer(callback: () => void): void {
    this.stopSyncTimer();
    if (this.config.enableBackgroundSync) {
      this.syncTimer = setInterval(callback, this.config.syncInterval);
    }
  }

  /**
   * Stop sync timer
   */
  stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Restart sync timer
   */
  private restartSyncTimer(): void {
    this.stopSyncTimer();
    // Timer will be restarted by the caller with their callback
  }

  /**
   * Throttle function execution for battery optimization
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Debounce function execution for battery optimization
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }
}

/**
 * Global battery optimizer instance
 */
export const batteryOptimizer = new BatteryOptimizer();
