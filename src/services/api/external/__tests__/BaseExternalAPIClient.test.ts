/**
 * Base External API Client Tests
 * Tests for retry logic, caching, and error handling
 */

import { BaseExternalAPIClient, ValidationResult } from '../BaseExternalAPIClient';
import { encryptedStorage } from '../../../storage/EncryptedStorage';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../storage/EncryptedStorage');

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Concrete implementation for testing
class TestAPIClient extends BaseExternalAPIClient {
  constructor() {
    super('TestAPI', 'https://test-api.com', 5000, 1000);
  }

  protected validateData(data: any): ValidationResult {
    if (!data || !data.id) {
      return { isValid: false, errors: ['Missing id field'] };
    }
    return { isValid: true, errors: [] };
  }

  async testMakeRequest<T>(requestFn: () => Promise<any>, endpoint: string): Promise<T> {
    return this.makeRequest(requestFn, endpoint);
  }

  async testGetCachedData<T>(cacheKey: string) {
    return this.getCachedData<T>(cacheKey);
  }

  async testCacheData<T>(cacheKey: string, data: T, source: string) {
    return this.cacheData(cacheKey, data, source);
  }

  async testGetStaleCachedData<T>(cacheKey: string) {
    return this.getStaleCachedData<T>(cacheKey);
  }
}

describe('BaseExternalAPIClient', () => {
  let client: TestAPIClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    client = new TestAPIClient();

    // Mock the sleep method to avoid actual delays
    jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);
  });

  describe('Retry Logic with Exponential Backoff', () => {
    it('should succeed on first attempt', async () => {
      const mockResponse = { status: 200, data: { id: '123', value: 'test' } };
      const requestFn = jest.fn().mockResolvedValue(mockResponse);

      const result = await client.testMakeRequest(requestFn, '/test');

      expect(result).toEqual(mockResponse.data);
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error with exponential backoff', async () => {
      const mockResponse = { status: 200, data: { id: '123', value: 'test' } };
      const requestFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);

      const result = await client.testMakeRequest(requestFn, '/test');

      expect(result).toEqual(mockResponse.data);
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx client errors', async () => {
      const error: any = new Error('Bad Request');
      error.response = { status: 400 };
      const requestFn = jest.fn().mockRejectedValue(error);

      await expect(client.testMakeRequest(requestFn, '/test')).rejects.toThrow('Bad Request');
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should retry up to max retries and then fail', async () => {
      const error = new Error('Server error');
      const requestFn = jest.fn().mockRejectedValue(error);

      await expect(client.testMakeRequest(requestFn, '/test')).rejects.toThrow();
      // Initial attempt + 5 retries = 6 total
      expect(requestFn).toHaveBeenCalledTimes(6);
    });
  });

  describe('Caching', () => {
    it('should cache data successfully', async () => {
      const testData = { id: '123', value: 'test' };
      const cacheKey = 'test_key';

      await client.testCacheData(cacheKey, testData, 'TestAPI');

      expect(encryptedStorage.setItem).toHaveBeenCalledWith(
        cacheKey,
        expect.objectContaining({
          data: testData,
          source: 'TestAPI',
        })
      );
    });

    it('should retrieve cached data if not expired', async () => {
      const testData = { id: '123', value: 'test' };
      const cacheKey = 'test_key';
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 1000); // Expires in 1 second

      const cachedData = {
        data: testData,
        cachedAt: now,
        expiresAt,
        source: 'TestAPI',
      };

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      const result = await client.testGetCachedData(cacheKey);

      expect(result).toBeTruthy();
      expect(result?.data).toEqual(testData);
    });

    it('should return null for expired cached data', async () => {
      const testData = { id: '123', value: 'test' };
      const cacheKey = 'test_key';
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 1000); // Expired 1 second ago

      const cachedData = {
        data: testData,
        cachedAt: new Date(now.getTime() - 2000),
        expiresAt,
        source: 'TestAPI',
      };

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      const result = await client.testGetCachedData(cacheKey);

      expect(result).toBeNull();
    });

    it('should retrieve stale cached data as fallback', async () => {
      const testData = { id: '123', value: 'test' };
      const cacheKey = 'test_key';
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 1000); // Expired

      const cachedData = {
        data: testData,
        cachedAt: new Date(now.getTime() - 2000),
        expiresAt,
        source: 'TestAPI',
      };

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      const result = await client.testGetStaleCachedData(cacheKey);

      expect(result).toBeTruthy();
      expect(result?.data).toEqual(testData);
    });
  });

  describe('Data Validation', () => {
    it('should validate data correctly', () => {
      const validData = { id: '123', value: 'test' };
      const result = client['validateData'](validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid data', () => {
      const invalidData = { value: 'test' }; // Missing id
      const result = client['validateData'](invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing id field');
    });
  });

  describe('API Call Logging', () => {
    it('should log successful API calls', async () => {
      const mockResponse = { status: 200, data: { id: '123', value: 'test' } };
      const requestFn = jest.fn().mockResolvedValue(mockResponse);

      await client.testMakeRequest(requestFn, '/test');

      expect(encryptedStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('api_log_TestAPI'),
        expect.objectContaining({
          endpoint: '/test',
          success: true,
          statusCode: 200,
        })
      );
    });

    it('should log failed API calls', async () => {
      const error = new Error('Network error');
      const requestFn = jest.fn().mockRejectedValue(error);

      await expect(client.testMakeRequest(requestFn, '/test')).rejects.toThrow();

      expect(encryptedStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('api_log_TestAPI'),
        expect.objectContaining({
          endpoint: '/test',
          success: false,
          error: 'Network error',
        })
      );
    });
  });
});
