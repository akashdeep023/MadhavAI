/**
 * DeviceCapabilities Utility
 * Detects device capabilities and adjusts performance settings
 * Requirements: 17.6, 17.7, 17.8
 */

import { Platform, Dimensions } from 'react-native';

/**
 * Device tier classification
 */
export enum DeviceTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Device capabilities interface
 */
export interface DeviceCapabilities {
  tier: DeviceTier;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  platform: string;
  isLowEndDevice: boolean;
  recommendedImageQuality: number;
  recommendedCacheSize: number;
  shouldEnableAnimations: boolean;
}

/**
 * Detect device capabilities
 * Classifies device as low/medium/high tier based on screen size and pixel ratio
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const { width, height } = Dimensions.get('window');
  const pixelRatio = Dimensions.get('window').scale;
  const platform = Platform.OS;

  // Calculate device tier based on screen dimensions and pixel ratio
  const screenArea = width * height;
  const tier = classifyDeviceTier(screenArea, pixelRatio);
  const isLowEndDevice = tier === DeviceTier.LOW;

  return {
    tier,
    screenWidth: width,
    screenHeight: height,
    pixelRatio,
    platform,
    isLowEndDevice,
    recommendedImageQuality: getRecommendedImageQuality(tier),
    recommendedCacheSize: getRecommendedCacheSize(tier),
    shouldEnableAnimations: shouldEnableAnimations(tier),
  };
}

/**
 * Classify device tier
 */
function classifyDeviceTier(screenArea: number, pixelRatio: number): DeviceTier {
  // Low-end: Small screens (< 720p equivalent) or low pixel density
  if (screenArea < 500000 || pixelRatio < 2) {
    return DeviceTier.LOW;
  }

  // High-end: Large screens (> 1080p equivalent) with high pixel density
  if (screenArea > 1000000 && pixelRatio >= 3) {
    return DeviceTier.HIGH;
  }

  // Medium-end: Everything else
  return DeviceTier.MEDIUM;
}

/**
 * Get recommended image quality based on device tier
 */
function getRecommendedImageQuality(tier: DeviceTier): number {
  switch (tier) {
    case DeviceTier.LOW:
      return 0.5; // 50% quality
    case DeviceTier.MEDIUM:
      return 0.7; // 70% quality
    case DeviceTier.HIGH:
      return 0.9; // 90% quality
    default:
      return 0.7;
  }
}

/**
 * Get recommended cache size based on device tier (in MB)
 */
function getRecommendedCacheSize(tier: DeviceTier): number {
  switch (tier) {
    case DeviceTier.LOW:
      return 50; // 50 MB
    case DeviceTier.MEDIUM:
      return 100; // 100 MB
    case DeviceTier.HIGH:
      return 200; // 200 MB
    default:
      return 100;
  }
}

/**
 * Check if animations should be enabled based on device tier
 */
function shouldEnableAnimations(tier: DeviceTier): boolean {
  return tier !== DeviceTier.LOW;
}

/**
 * Get optimal image dimensions for device
 */
export function getOptimalImageDimensions(capabilities: DeviceCapabilities): {
  maxWidth: number;
  maxHeight: number;
} {
  const baseSize = Math.max(capabilities.screenWidth, capabilities.screenHeight);

  switch (capabilities.tier) {
    case DeviceTier.LOW:
      return { maxWidth: 720, maxHeight: 720 };
    case DeviceTier.MEDIUM:
      return { maxWidth: 1080, maxHeight: 1080 };
    case DeviceTier.HIGH:
      return { maxWidth: baseSize * 2, maxHeight: baseSize * 2 };
    default:
      return { maxWidth: 1080, maxHeight: 1080 };
  }
}

/**
 * Get optimal video quality for device
 */
export function getOptimalVideoQuality(capabilities: DeviceCapabilities): string {
  switch (capabilities.tier) {
    case DeviceTier.LOW:
      return '360p';
    case DeviceTier.MEDIUM:
      return '480p';
    case DeviceTier.HIGH:
      return '720p';
    default:
      return '480p';
  }
}

/**
 * Check if device meets minimum requirements
 * Minimum: Android 8.0, 2GB RAM equivalent (estimated by screen size)
 */
export function meetsMinimumRequirements(): boolean {
  // Check platform version
  if (Platform.OS === 'android') {
    const version = parseInt(Platform.Version.toString(), 10);
    if (version < 26) {
      // Android 8.0 is API level 26
      return false;
    }
  }

  // All detected devices are assumed to meet RAM requirements
  // In production, this could use a native module to check actual RAM
  return true;
}

/**
 * Global device capabilities
 */
export const deviceCapabilities = detectDeviceCapabilities();
