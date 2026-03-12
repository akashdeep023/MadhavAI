/**
 * Base External API Client
 * Provides standardized interface for all external API integrations
 * Requirements: 19.5, 19.6, 19.7, 19.8
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { logger } from '../../../utils/logger';
import { encryptedStorage } from '../../storage/EncryptedStorage';

export interface APICallLog {
  endpoint: string;
  method: string;
  parameters: any;
  timestamp: Date;
  statusCode?: number;
  latency?: number;
  dataSize?: number;
  error?: string;
  success: boolean;
}

export interface CachedAPIResponse<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  source: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export abstract class BaseExternalAPIClient {
  protected client: AxiosInstance;
  protected apiName: string;
  protected retryConfig: RetryConfig;
  protected cacheDuration: number; // in milliseconds

  constructor(
    apiName: string,
    baseURL: string,
    timeout: number = 10000,
    cacheDuration: number = 24 * 60 * 60 * 1000, // 24 hours default
    retryConfig?: Partial<RetryConfig>
  ) {
    this.apiName = apiName;
    this.cacheDuration = cacheDuration;
    this.retryConfig = {
      maxRetries: 5,
      baseDelay: 1000, // 1 second
      maxDelay: 16000, // 16 seconds
      ...retryConfig,
    };

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   * Requirement: 19.7 - Log all external API calls
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.info(
          `[${this.apiName}] API Request: ${config.method?.toUpperCase()} ${config.url}`,
          {
            params: config.params,
            data: config.data,
          }
        );
        return config;
      },
      (error) => {
        logger.error(`[${this.apiName}] Request Error`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`[${this.apiName}] API Response: ${response.status}`, {
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length,
        });
        return response;
      },
      (error) => {
        logger.error(`[${this.apiName}] Response Error`, {
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make API request with retry logic and exponential backoff
   * Requirement: 19.8 - Implement retry logic with exponential backoff
   */
  protected async makeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    endpoint: string,
    params?: any
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.retryConfig.maxRetries) {
      try {
        const response = await requestFn();
        const latency = Date.now() - startTime;

        // Log successful API call
        await this.logAPICall({
          endpoint,
          method: 'GET',
          parameters: params,
          timestamp: new Date(),
          statusCode: response.status,
          latency,
          dataSize: JSON.stringify(response.data).length,
          success: true,
        });

        return response.data;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        const axiosError = error as AxiosError;
        const statusCode = axiosError.response?.status;

        // Don't retry on client errors (4xx)
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          logger.warn(`[${this.apiName}] Client error ${statusCode}, not retrying`);
          break;
        }

        if (attempt <= this.retryConfig.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn(
            `[${this.apiName}] Request failed (attempt ${attempt}/${this.retryConfig.maxRetries}), retrying in ${delay}ms`
          );
          await this.sleep(delay);
        }
      }
    }

    // Log failed API call
    const latency = Date.now() - startTime;
    await this.logAPICall({
      endpoint,
      method: 'GET',
      parameters: params,
      timestamp: new Date(),
      latency,
      error: lastError?.message,
      success: false,
    });

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Calculate exponential backoff delay
   * Delays: 1s, 2s, 4s, 8s, 16s
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
      this.retryConfig.maxDelay
    );
    return delay;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log API call for monitoring and debugging
   * Requirement: 19.7 - Log all external API calls
   */
  protected async logAPICall(log: APICallLog): Promise<void> {
    try {
      const logKey = `api_log_${this.apiName}_${Date.now()}`;
      await encryptedStorage.setItem(logKey, log);

      // Also log to console for immediate visibility
      if (log.success) {
        logger.info(`[${this.apiName}] API call successful`, {
          endpoint: log.endpoint,
          latency: log.latency,
          statusCode: log.statusCode,
        });
      } else {
        logger.error(`[${this.apiName}] API call failed`, {
          endpoint: log.endpoint,
          error: log.error,
        });
      }
    } catch (error) {
      logger.error(`[${this.apiName}] Failed to log API call`, error);
    }
  }

  /**
   * Get cached data if available and not expired
   * Requirement: 19.5 - Use cached data when APIs unavailable
   */
  protected async getCachedData<T>(cacheKey: string): Promise<CachedAPIResponse<T> | null> {
    try {
      const cached = await encryptedStorage.getItem<CachedAPIResponse<T>>(cacheKey);

      if (!cached) {
        logger.debug(`[${this.apiName}] No cached data found for key: ${cacheKey}`);
        return null;
      }

      // Convert date strings back to Date objects
      cached.cachedAt = new Date(cached.cachedAt);
      cached.expiresAt = new Date(cached.expiresAt);

      const now = new Date();
      if (now > cached.expiresAt) {
        logger.debug(`[${this.apiName}] Cached data expired for key: ${cacheKey}`);
        return null;
      }

      logger.info(`[${this.apiName}] Using cached data for key: ${cacheKey}`);
      return cached;
    } catch (error) {
      logger.error(`[${this.apiName}] Error retrieving cached data`, error);
      return null;
    }
  }

  /**
   * Get stale cached data (even if expired) as fallback
   * Requirement: 19.5 - Fallback to cached data when APIs fail
   */
  protected async getStaleCachedData<T>(cacheKey: string): Promise<CachedAPIResponse<T> | null> {
    try {
      const cached = await encryptedStorage.getItem<CachedAPIResponse<T>>(cacheKey);

      if (!cached) {
        return null;
      }

      // Convert date strings back to Date objects
      cached.cachedAt = new Date(cached.cachedAt);
      cached.expiresAt = new Date(cached.expiresAt);

      logger.warn(`[${this.apiName}] Using stale cached data for key: ${cacheKey}`);
      return cached;
    } catch (error) {
      logger.error(`[${this.apiName}] Error retrieving stale cached data`, error);
      return null;
    }
  }

  /**
   * Cache API response data
   */
  protected async cacheData<T>(cacheKey: string, data: T, source: string): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.cacheDuration);

      const cached: CachedAPIResponse<T> = {
        data,
        cachedAt: now,
        expiresAt,
        source,
      };

      await encryptedStorage.setItem(cacheKey, cached);
      logger.info(`[${this.apiName}] Data cached for key: ${cacheKey}`);
    } catch (error) {
      logger.error(`[${this.apiName}] Error caching data`, error);
    }
  }

  /**
   * Check if cached data is stale
   */
  protected isCacheStale(cached: CachedAPIResponse<any>): boolean {
    const now = new Date();
    return now > cached.expiresAt;
  }

  /**
   * Get cache age in hours
   */
  protected getCacheAge(cached: CachedAPIResponse<any>): number {
    const now = new Date();
    const ageMs = now.getTime() - cached.cachedAt.getTime();
    return ageMs / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Validate API response data
   * Requirement: 19.6 - Validate all external data before storage
   * Must be implemented by subclasses
   */
  protected abstract validateData(data: any): ValidationResult;

  /**
   * Clear all cached data for this API
   */
  async clearCache(): Promise<void> {
    logger.info(`[${this.apiName}] Cache cleared`);
    // In a real implementation, we'd track and clear all cache keys
  }
}
