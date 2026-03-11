/**
 * External API Integration Layer
 * Centralized exports for all external API clients
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8
 */

export { BaseExternalAPIClient } from './BaseExternalAPIClient';
export type {
  APICallLog,
  CachedAPIResponse,
  RetryConfig,
  ValidationResult,
} from './BaseExternalAPIClient';

export { GovernmentSchemeAPIClient, governmentSchemeAPIClient } from './GovernmentSchemeAPIClient';

export { WeatherAPIClient, weatherAPIClient } from './WeatherAPIClient';

export { MandiPriceAPIClient, mandiPriceAPIClient } from './MandiPriceAPIClient';

export {
  AgriculturalResearchAPIClient,
  agriculturalResearchAPIClient,
} from './AgriculturalResearchAPIClient';
export type {
  CropBestPractice,
  PestManagementData,
  SoilManagementData,
} from './AgriculturalResearchAPIClient';

/**
 * External API Integration Summary
 *
 * This module provides a standardized interface for integrating with external APIs:
 *
 * 1. Government Scheme API (governmentSchemeAPIClient)
 *    - Fetches government schemes and subsidies
 *    - Cache duration: 7 days
 *    - Requirement: 19.1
 *
 * 2. Weather API (weatherAPIClient)
 *    - Fetches weather forecasts and alerts
 *    - Cache duration: 6 hours
 *    - Requirement: 19.2
 *
 * 3. Mandi Price API (mandiPriceAPIClient)
 *    - Fetches market prices and trends
 *    - Cache duration: 24 hours
 *    - Requirement: 19.3
 *
 * 4. Agricultural Research API (agriculturalResearchAPIClient)
 *    - Fetches best practices and research data
 *    - Cache duration: 30 days
 *    - Requirement: 19.4
 *
 * Features:
 * - Exponential backoff retry logic (1s, 2s, 4s, 8s, 16s) - Requirement: 19.8
 * - Fallback to cached data when APIs fail - Requirement: 19.5
 * - Data validation before storage - Requirement: 19.6
 * - Request/response logging - Requirement: 19.7
 * - Staleness indicators for cached data - Requirement: 19.5
 *
 * Usage Example:
 * ```typescript
 * import { weatherAPIClient } from './services/api/external';
 *
 * try {
 *   const forecast = await weatherAPIClient.fetchForecast(12.9716, 77.5946);
 *   console.log('Weather forecast:', forecast);
 * } catch (error) {
 *   console.error('Failed to fetch weather:', error);
 * }
 * ```
 */
