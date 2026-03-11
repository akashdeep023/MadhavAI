/**
 * BatteryOptimizer Tests
 * Tests for battery optimization utility
 */

import { BatteryOptimizer, DEFAULT_BATTERY_CONFIG, LOW_BATTERY_CONFIG } from '../BatteryOptimizer';

describe('BatteryOptimizer', () => {
  let optimizer: BatteryOptimizer;

  beforeEach(() => {
    optimizer = new BatteryOptimizer();
  });

  afterEach(() => {
    optimizer.stopSyncTimer();
  });

  describe('Configuration Management', () => {
    it('initializes with default configuration', () => {
      const config = optimizer.getConfig();
      expect(config).toEqual(DEFAULT_BATTERY_CONFIG);
    });

    it('updates configuration partially', () => {
      optimizer.updateConfig({ enableAnimations: false });
      const config = optimizer.getConfig();
      expect(config.enableAnimations).toBe(false);
      expect(config.enableBackgroundSync).toBe(DEFAULT_BATTERY_CONFIG.enableBackgroundSync);
    });

    it('enables low battery mode', () => {
      optimizer.enableLowBatteryMode();
      const config = optimizer.getConfig();
      expect(config).toEqual(LOW_BATTERY_CONFIG);
    });

    it('disables low battery mode', () => {
      optimizer.enableLowBatteryMode();
      optimizer.disableLowBatteryMode();
      const config = optimizer.getConfig();
      expect(config).toEqual(DEFAULT_BATTERY_CONFIG);
    });
  });

  describe('Feature Checks', () => {
    it('checks if animations should be enabled', () => {
      expect(optimizer.shouldEnableAnimations()).toBe(true);
      optimizer.updateConfig({ enableAnimations: false });
      expect(optimizer.shouldEnableAnimations()).toBe(false);
    });

    it('checks if background sync should be enabled', () => {
      expect(optimizer.shouldEnableBackgroundSync()).toBe(true);
      optimizer.updateConfig({ enableBackgroundSync: false });
      expect(optimizer.shouldEnableBackgroundSync()).toBe(false);
    });

    it('returns correct sync interval', () => {
      expect(optimizer.getSyncInterval()).toBe(DEFAULT_BATTERY_CONFIG.syncInterval);
    });

    it('returns correct max concurrent requests', () => {
      expect(optimizer.getMaxConcurrentRequests()).toBe(
        DEFAULT_BATTERY_CONFIG.maxConcurrentRequests
      );
    });
  });

  describe('Sync Timer', () => {
    it('starts sync timer with callback', (done) => {
      let callCount = 0;
      const callback = () => {
        callCount++;
        if (callCount === 1) {
          optimizer.stopSyncTimer();
          done();
        }
      };

      optimizer.updateConfig({ syncInterval: 100 });
      optimizer.startSyncTimer(callback);
    });

    it('stops sync timer', (done) => {
      let callCount = 0;
      const callback = () => {
        callCount++;
      };

      optimizer.updateConfig({ syncInterval: 100 });
      optimizer.startSyncTimer(callback);

      setTimeout(() => {
        optimizer.stopSyncTimer();
        const countAtStop = callCount;

        setTimeout(() => {
          expect(callCount).toBe(countAtStop);
          done();
        }, 200);
      }, 150);
    });

    it('does not start timer when background sync is disabled', (done) => {
      let callCount = 0;
      const callback = () => {
        callCount++;
      };

      optimizer.updateConfig({ enableBackgroundSync: false, syncInterval: 100 });
      optimizer.startSyncTimer(callback);

      setTimeout(() => {
        expect(callCount).toBe(0);
        done();
      }, 200);
    });
  });

  describe('Throttle and Debounce', () => {
    it('throttles function calls', (done) => {
      let callCount = 0;
      const func = () => {
        callCount++;
      };

      const throttled = optimizer.throttle(func, 100);

      throttled();
      throttled();
      throttled();

      expect(callCount).toBe(1);

      setTimeout(() => {
        throttled();
        expect(callCount).toBe(2);
        done();
      }, 150);
    });

    it('debounces function calls', (done) => {
      let callCount = 0;
      const func = () => {
        callCount++;
      };

      const debounced = optimizer.debounce(func, 100);

      debounced();
      debounced();
      debounced();

      expect(callCount).toBe(0);

      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });
  });
});
