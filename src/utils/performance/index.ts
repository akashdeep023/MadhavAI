/**
 * Performance Utilities
 * Export all performance optimization utilities
 */

export { createLazyComponent, LoadingFallback, ErrorFallback } from './LazyLoader';
export {
  BatteryOptimizer,
  batteryOptimizer,
  DEFAULT_BATTERY_CONFIG,
  LOW_BATTERY_CONFIG,
} from './BatteryOptimizer';
export type { BatteryOptimizationConfig } from './BatteryOptimizer';
export {
  MemoryManager,
  memoryManager,
  DEFAULT_MEMORY_CONFIG,
  LOW_MEMORY_CONFIG,
} from './MemoryManager';
export type { MemoryConfig } from './MemoryManager';
export {
  detectDeviceCapabilities,
  getOptimalImageDimensions,
  getOptimalVideoQuality,
  meetsMinimumRequirements,
  deviceCapabilities,
  DeviceTier,
} from './DeviceCapabilities';
export type { DeviceCapabilities } from './DeviceCapabilities';
