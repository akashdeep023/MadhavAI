/**
 * External API Integration Tests
 * Tests for all external API clients with retry, caching, and fallback scenarios
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8
 */

import {
  governmentSchemeAPIClient,
  weatherAPIClient,
  mandiPriceAPIClient,
  agriculturalResearchAPIClient,
} from '../index';
import { encryptedStorage } from '../../../storage/EncryptedStorage';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../storage/EncryptedStorage');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('External API Integration', () => {
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

    // Replace the axios client instance on each API client
    (governmentSchemeAPIClient as any).client = mockAxiosInstance;
    (weatherAPIClient as any).client = mockAxiosInstance;
    (mandiPriceAPIClient as any).client = mockAxiosInstance;
    (agriculturalResearchAPIClient as any).client = mockAxiosInstance;

    // Mock the sleep method on all API clients to avoid delays
    jest.spyOn(governmentSchemeAPIClient as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(weatherAPIClient as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(mandiPriceAPIClient as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(agriculturalResearchAPIClient as any, 'sleep').mockResolvedValue(undefined);
  });

  describe('Government Scheme API Client', () => {
    it('should fetch schemes successfully', async () => {
      const mockSchemes = [
        {
          id: 'scheme-1',
          name: 'PM-KISAN',
          description: 'Direct income support',
          category: 'subsidy',
          benefits: ['₹6,000 per year'],
          eligibilityCriteria: { maxFarmSize: 10 },
          source: 'GovernmentAPI',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { schemes: mockSchemes, totalCount: 1, lastUpdated: new Date().toISOString() },
      });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await governmentSchemeAPIClient.fetchSchemes();

      expect(result).toEqual(mockSchemes);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/list', expect.any(Object));
    });

    it('should use cached schemes when available', async () => {
      const mockSchemes = [{ id: 'scheme-1', name: 'PM-KISAN' }];
      const cachedData = {
        data: mockSchemes,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000000),
        source: 'GovernmentSchemeAPI',
      };

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      const result = await governmentSchemeAPIClient.fetchSchemes();

      expect(result).toEqual(mockSchemes);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should fallback to stale cache when API fails', async () => {
      const mockSchemes = [{ id: 'scheme-1', name: 'PM-KISAN' }];
      const staleCachedData = {
        data: mockSchemes,
        cachedAt: new Date(Date.now() - 10000000),
        expiresAt: new Date(Date.now() - 1000000), // Expired
        source: 'GovernmentSchemeAPI',
      };

      (encryptedStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null) // No fresh cache
        .mockResolvedValueOnce(staleCachedData); // Stale cache available

      mockAxiosInstance.get.mockRejectedValue(new Error('API unavailable'));

      const result = await governmentSchemeAPIClient.fetchSchemes();

      expect(result).toEqual(mockSchemes);
    });

    it('should validate scheme data before caching', async () => {
      const invalidSchemes = [
        {
          // Missing required fields
          name: 'Invalid Scheme',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { schemes: invalidSchemes, totalCount: 1, lastUpdated: new Date().toISOString() },
      });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(governmentSchemeAPIClient.fetchSchemes()).rejects.toThrow('Invalid scheme data');
    });
  });

  describe('Weather API Client', () => {
    it('should fetch weather forecast successfully', async () => {
      const mockForecast = {
        location: { latitude: 12.9716, longitude: 77.5946, name: 'Bangalore' },
        current: {
          date: new Date(),
          condition: 'sunny',
          temperature: { current: 28, min: 22, max: 32, feelsLike: 30 },
          humidity: 65,
          wind: { speed: 15, direction: 'NE' },
          precipitation: { probability: 20, amount: 0, type: 'none' },
          uvIndex: 7,
          sunrise: new Date(),
          sunset: new Date(),
          description: 'Sunny day',
        },
        daily: [],
        alerts: [],
        lastUpdated: new Date(),
        source: 'WeatherAPI',
      };

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: mockForecast,
      });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await weatherAPIClient.fetchForecast(12.9716, 77.5946);

      expect(result).toEqual(mockForecast);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/forecast',
        expect.objectContaining({
          params: { latitude: 12.9716, longitude: 77.5946, days: 7 },
        })
      );
    });

    it('should use cached forecast when available', async () => {
      const mockForecast = { location: {}, current: {}, daily: [], alerts: [] };
      const cachedData = {
        data: mockForecast,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000000),
        source: 'WeatherAPI',
      };

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      const result = await weatherAPIClient.fetchForecast(12.9716, 77.5946);

      expect(result).toEqual(mockForecast);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should validate weather data before caching', async () => {
      const invalidForecast = {
        // Missing required fields
        location: {},
      };

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: invalidForecast,
      });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(weatherAPIClient.fetchForecast(12.9716, 77.5946)).rejects.toThrow(
        'Invalid weather data'
      );
    });
  });

  describe('Mandi Price API Client', () => {
    it('should fetch mandi prices successfully', async () => {
      const mockPrices = [
        {
          id: 'price-1',
          crop: 'Wheat',
          mandiName: 'Central Mandi',
          mandiLocation: {
            state: 'Karnataka',
            district: 'Bangalore',
            market: 'Central Mandi',
            latitude: 12.9716,
            longitude: 77.5946,
          },
          price: { min: 1800, max: 2200, modal: 2000, currency: 'INR' },
          unit: 'quintal',
          date: new Date(),
          source: 'AGMARKNET',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: mockPrices,
      });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await mandiPriceAPIClient.fetchPrices(12.9716, 77.5946);

      expect(result).toEqual(mockPrices);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/prices',
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: 12.9716,
            longitude: 77.5946,
          }),
        })
      );
    });

    it('should validate price data before caching', async () => {
      const invalidPrices = [
        {
          // Missing required fields
          crop: 'Wheat',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: invalidPrices,
      });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(mandiPriceAPIClient.fetchPrices(12.9716, 77.5946)).rejects.toThrow(
        'Invalid price data'
      );
    });
  });

  describe('Agricultural Research API Client', () => {
    it('should fetch best practices successfully', async () => {
      const mockPractices = [
        {
          id: 'practice-1',
          crop: 'Wheat',
          variety: 'HD-2967',
          stage: 'sowing',
          practice: 'Seed treatment',
          description: 'Treat seeds with fungicide before sowing',
          benefits: ['Prevents seed-borne diseases', 'Improves germination'],
          resources: ['Fungicide', 'Water'],
          source: 'ICAR',
          lastUpdated: new Date(),
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: mockPractices,
      });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await agriculturalResearchAPIClient.fetchBestPractices('Wheat');

      expect(result).toEqual(mockPractices);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/best-practices',
        expect.objectContaining({
          params: expect.objectContaining({ crop: 'Wheat' }),
        })
      );
    });

    it('should validate best practices data before caching', async () => {
      const invalidPractices = [
        {
          // Missing required fields
          crop: 'Wheat',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: invalidPractices,
      });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(agriculturalResearchAPIClient.fetchBestPractices('Wheat')).rejects.toThrow(
        'Invalid best practices data'
      );
    });
  });

  describe('Retry Logic and Exponential Backoff', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const mockData = { schemes: [], totalCount: 0, lastUpdated: new Date().toISOString() };

      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 200, data: mockData });

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      await governmentSchemeAPIClient.fetchSchemes();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx client errors', async () => {
      const error: any = new Error('Bad Request');
      error.response = { status: 400 };

      mockAxiosInstance.get.mockRejectedValue(error);
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(governmentSchemeAPIClient.fetchSchemes()).rejects.toThrow();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Staleness Indicators', () => {
    it('should provide staleness information for cached data', async () => {
      const cachedData = {
        data: {},
        cachedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // Expires in 3 hours
        source: 'WeatherAPI',
      };

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      const staleness = await weatherAPIClient.getDataStaleness(12.97, 77.59);

      expect(staleness.isStale).toBe(false);
      expect(staleness.ageHours).toBeCloseTo(3, 0);
      expect(staleness.message).toContain('fresh');
    });

    it('should indicate stale data correctly', async () => {
      const cachedData = {
        data: {},
        cachedAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
        expiresAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // Expired 4 hours ago
        source: 'WeatherAPI',
      };

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      const staleness = await weatherAPIClient.getDataStaleness(12.97, 77.59);

      expect(staleness.isStale).toBe(true);
      expect(staleness.ageHours).toBeCloseTo(10, 0);
      expect(staleness.message).toContain('stale');
    });
  });
});
