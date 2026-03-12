/**
 * DeviceCapabilities Tests
 * Tests for device capability detection
 */

import {
  detectDeviceCapabilities,
  getOptimalImageDimensions,
  getOptimalVideoQuality,
  meetsMinimumRequirements,
  DeviceTier,
} from '../DeviceCapabilities';

describe('DeviceCapabilities', () => {
  describe('detectDeviceCapabilities', () => {
    it('detects device capabilities', () => {
      const capabilities = detectDeviceCapabilities();

      expect(capabilities).toHaveProperty('tier');
      expect(capabilities).toHaveProperty('screenWidth');
      expect(capabilities).toHaveProperty('screenHeight');
      expect(capabilities).toHaveProperty('pixelRatio');
      expect(capabilities).toHaveProperty('platform');
      expect(capabilities).toHaveProperty('isLowEndDevice');
      expect(capabilities).toHaveProperty('recommendedImageQuality');
      expect(capabilities).toHaveProperty('recommendedCacheSize');
      expect(capabilities).toHaveProperty('shouldEnableAnimations');
    });

    it('classifies device tier correctly', () => {
      const capabilities = detectDeviceCapabilities();
      expect([DeviceTier.LOW, DeviceTier.MEDIUM, DeviceTier.HIGH]).toContain(capabilities.tier);
    });

    it('sets isLowEndDevice flag correctly', () => {
      const capabilities = detectDeviceCapabilities();
      if (capabilities.tier === DeviceTier.LOW) {
        expect(capabilities.isLowEndDevice).toBe(true);
      } else {
        expect(capabilities.isLowEndDevice).toBe(false);
      }
    });

    it('provides recommended image quality', () => {
      const capabilities = detectDeviceCapabilities();
      expect(capabilities.recommendedImageQuality).toBeGreaterThan(0);
      expect(capabilities.recommendedImageQuality).toBeLessThanOrEqual(1);
    });

    it('provides recommended cache size', () => {
      const capabilities = detectDeviceCapabilities();
      expect(capabilities.recommendedCacheSize).toBeGreaterThan(0);
    });
  });

  describe('getOptimalImageDimensions', () => {
    it('returns appropriate dimensions for low-end devices', () => {
      const capabilities = {
        tier: DeviceTier.LOW,
        screenWidth: 720,
        screenHeight: 1280,
        pixelRatio: 2,
        platform: 'android',
        isLowEndDevice: true,
        recommendedImageQuality: 0.5,
        recommendedCacheSize: 50,
        shouldEnableAnimations: false,
      };

      const dimensions = getOptimalImageDimensions(capabilities);
      expect(dimensions.maxWidth).toBe(720);
      expect(dimensions.maxHeight).toBe(720);
    });

    it('returns appropriate dimensions for medium-end devices', () => {
      const capabilities = {
        tier: DeviceTier.MEDIUM,
        screenWidth: 1080,
        screenHeight: 1920,
        pixelRatio: 2.5,
        platform: 'android',
        isLowEndDevice: false,
        recommendedImageQuality: 0.7,
        recommendedCacheSize: 100,
        shouldEnableAnimations: true,
      };

      const dimensions = getOptimalImageDimensions(capabilities);
      expect(dimensions.maxWidth).toBe(1080);
      expect(dimensions.maxHeight).toBe(1080);
    });

    it('returns appropriate dimensions for high-end devices', () => {
      const capabilities = {
        tier: DeviceTier.HIGH,
        screenWidth: 1440,
        screenHeight: 2560,
        pixelRatio: 3,
        platform: 'android',
        isLowEndDevice: false,
        recommendedImageQuality: 0.9,
        recommendedCacheSize: 200,
        shouldEnableAnimations: true,
      };

      const dimensions = getOptimalImageDimensions(capabilities);
      expect(dimensions.maxWidth).toBeGreaterThan(1080);
      expect(dimensions.maxHeight).toBeGreaterThan(1080);
    });
  });

  describe('getOptimalVideoQuality', () => {
    it('returns 360p for low-end devices', () => {
      const capabilities = {
        tier: DeviceTier.LOW,
        screenWidth: 720,
        screenHeight: 1280,
        pixelRatio: 2,
        platform: 'android',
        isLowEndDevice: true,
        recommendedImageQuality: 0.5,
        recommendedCacheSize: 50,
        shouldEnableAnimations: false,
      };

      expect(getOptimalVideoQuality(capabilities)).toBe('360p');
    });

    it('returns 480p for medium-end devices', () => {
      const capabilities = {
        tier: DeviceTier.MEDIUM,
        screenWidth: 1080,
        screenHeight: 1920,
        pixelRatio: 2.5,
        platform: 'android',
        isLowEndDevice: false,
        recommendedImageQuality: 0.7,
        recommendedCacheSize: 100,
        shouldEnableAnimations: true,
      };

      expect(getOptimalVideoQuality(capabilities)).toBe('480p');
    });

    it('returns 720p for high-end devices', () => {
      const capabilities = {
        tier: DeviceTier.HIGH,
        screenWidth: 1440,
        screenHeight: 2560,
        pixelRatio: 3,
        platform: 'android',
        isLowEndDevice: false,
        recommendedImageQuality: 0.9,
        recommendedCacheSize: 200,
        shouldEnableAnimations: true,
      };

      expect(getOptimalVideoQuality(capabilities)).toBe('720p');
    });
  });

  describe('meetsMinimumRequirements', () => {
    it('returns true for supported devices', () => {
      expect(meetsMinimumRequirements()).toBe(true);
    });
  });
});
