/**
 * Data Aggregator Tests
 */

import { DataAggregator } from '../DataAggregator';
import { profileAPI } from '../../api/profileApi';
import { soilApi } from '../../api/soilApi';
import { weatherAPI } from '../../api/weatherApi';
import { marketAPI } from '../../api/marketApi';
import { UserProfile } from '../../../types/profile.types';
import { SoilHealthData } from '../../../types/soil.types';
import { WeatherForecast } from '../../../types/weather.types';
import { MarketData } from '../../../types/market.types';

jest.mock('../../api/profileApi', () => ({
  profileAPI: {
    getProfile: jest.fn(),
  },
}));

jest.mock('../../api/soilApi', () => ({
  soilApi: {
    getSoilHealthByUser: jest.fn(),
  },
}));

jest.mock('../../api/weatherApi', () => ({
  weatherAPI: {
    getForecast: jest.fn(),
  },
}));

jest.mock('../../api/marketApi', () => ({
  marketAPI: {
    getPrices: jest.fn(),
    getNearbyMandis: jest.fn(),
    getPriceTrend: jest.fn(),
  },
}));

describe('DataAggregator', () => {
  let aggregator: DataAggregator;

  const mockProfile: UserProfile = {
    userId: 'user-001',
    mobileNumber: '+919876543210',
    name: 'Test Farmer',
    languagePreference: 'en',
    location: {
      state: 'Test State',
      district: 'Test District',
      village: 'Test Village',
      pincode: '123456',
      coordinates: {
        latitude: 28.6139,
        longitude: 77.209,
      },
    },
    farmSize: 5,
    primaryCrops: ['Rice', 'Wheat'],
    soilType: 'loamy',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSoilData: SoilHealthData = {
    id: 'soil-001',
    userId: 'user-001',
    testDate: new Date(),
    labName: 'Test Lab',
    sampleId: 'SAMPLE-001',
    location: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    parameters: {
      nitrogen: 300,
      phosphorus: 30,
      potassium: 250,
      pH: 6.5,
      electricalConductivity: 0.5,
      organicCarbon: 0.6,
    },
    soilType: 'loamy',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWeatherForecast: WeatherForecast = {
    location: {
      latitude: 28.6139,
      longitude: 77.209,
      name: 'Test Location',
    },
    current: {
      date: new Date(),
      temperature: { current: 25, min: 20, max: 30, feelsLike: 26 },
      precipitation: { probability: 20, amount: 5, type: 'rain' },
      humidity: 60,
      wind: { speed: 15, direction: 'NE' },
      uvIndex: 7,
      condition: 'partly_cloudy',
      sunrise: new Date(),
      sunset: new Date(),
      description: 'Partly cloudy',
    },
    daily: [],
    alerts: [],
    lastUpdated: new Date(),
    source: 'test',
  };

  const mockMarketData: MarketData = {
    prices: [],
    trends: [
      {
        crop: 'Rice',
        prices: [],
        trend: 'rising',
        changePercent: 5,
        average: 2000,
        period: 30,
      },
    ],
    mandis: [],
    lastUpdated: new Date(),
    source: 'test',
  };

  beforeEach(() => {
    aggregator = new DataAggregator();
    jest.clearAllMocks();
  });

  describe('aggregateData', () => {
    it('should aggregate all data sources successfully', async () => {
      (profileAPI.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (soilApi.getSoilHealthByUser as jest.Mock).mockResolvedValue([mockSoilData]);
      (weatherAPI.getForecast as jest.Mock).mockResolvedValue(mockWeatherForecast);
      (marketAPI.getPrices as jest.Mock).mockResolvedValue([]);
      (marketAPI.getNearbyMandis as jest.Mock).mockResolvedValue([]);
      (marketAPI.getPriceTrend as jest.Mock).mockResolvedValue(mockMarketData.trends[0]);

      const context = await aggregator.aggregateData('user-001');

      expect(context.userProfile).toEqual(mockProfile);
      expect(context.soilData).toEqual(mockSoilData);
      expect(context.weatherForecast).toEqual(mockWeatherForecast);
      expect(context.marketData).toBeDefined();
      expect(context.currentSeason).toBeDefined();
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should handle missing soil data gracefully', async () => {
      (profileAPI.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (soilApi.getSoilHealthByUser as jest.Mock).mockResolvedValue([]);
      (weatherAPI.getForecast as jest.Mock).mockResolvedValue(mockWeatherForecast);
      (marketAPI.getPrices as jest.Mock).mockResolvedValue([]);
      (marketAPI.getNearbyMandis as jest.Mock).mockResolvedValue([]);
      (marketAPI.getPriceTrend as jest.Mock).mockResolvedValue(mockMarketData.trends[0]);

      const context = await aggregator.aggregateData('user-001');

      expect(context.soilData).toBeNull();
      expect(context.userProfile).toEqual(mockProfile);
    });

    it('should handle missing weather data gracefully', async () => {
      (profileAPI.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (soilApi.getSoilHealthByUser as jest.Mock).mockResolvedValue([mockSoilData]);
      (weatherAPI.getForecast as jest.Mock).mockRejectedValue(new Error('API Error'));
      (marketAPI.getPrices as jest.Mock).mockResolvedValue([]);
      (marketAPI.getNearbyMandis as jest.Mock).mockResolvedValue([]);
      (marketAPI.getPriceTrend as jest.Mock).mockResolvedValue(mockMarketData.trends[0]);

      const context = await aggregator.aggregateData('user-001');

      expect(context.weatherForecast).toBeNull();
      expect(context.userProfile).toEqual(mockProfile);
    });

    it('should handle missing market data gracefully', async () => {
      (profileAPI.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (soilApi.getSoilHealthByUser as jest.Mock).mockResolvedValue([mockSoilData]);
      (weatherAPI.getForecast as jest.Mock).mockResolvedValue(mockWeatherForecast);
      (marketAPI.getPrices as jest.Mock).mockRejectedValue(new Error('API Error'));

      const context = await aggregator.aggregateData('user-001');

      expect(context.marketData).toBeNull();
      expect(context.userProfile).toEqual(mockProfile);
    });

    it('should throw error if user profile fetch fails', async () => {
      (profileAPI.getProfile as jest.Mock).mockRejectedValue(new Error('Profile not found'));

      await expect(aggregator.aggregateData('user-001')).rejects.toThrow(
        'Failed to aggregate data'
      );
    });

    it('should fetch all data in parallel', async () => {
      (profileAPI.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (soilApi.getSoilHealthByUser as jest.Mock).mockResolvedValue([mockSoilData]);
      (weatherAPI.getForecast as jest.Mock).mockResolvedValue(mockWeatherForecast);
      (marketAPI.getPrices as jest.Mock).mockResolvedValue([]);
      (marketAPI.getNearbyMandis as jest.Mock).mockResolvedValue([]);
      (marketAPI.getPriceTrend as jest.Mock).mockResolvedValue(mockMarketData.trends[0]);

      await aggregator.aggregateData('user-001');

      // All APIs should be called
      expect(profileAPI.getProfile).toHaveBeenCalledWith('user-001');
      expect(soilApi.getSoilHealthByUser).toHaveBeenCalledWith('user-001');
      expect(weatherAPI.getForecast).toHaveBeenCalled();
    });
  });

  describe('getCurrentSeason', () => {
    it('should return kharif for June to October', () => {
      // Test with July (month 7)
      jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(6); // July (0-indexed)
      
      const context = aggregator['getCurrentSeason']();
      expect(context).toBe('kharif');
    });

    it('should return rabi for November to March', () => {
      // Test with December (month 12)
      jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(11); // December (0-indexed)
      
      const context = aggregator['getCurrentSeason']();
      expect(context).toBe('rabi');
    });

    it('should return zaid for April to May', () => {
      // Test with April (month 4)
      jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(3); // April (0-indexed)
      
      const context = aggregator['getCurrentSeason']();
      expect(context).toBe('zaid');
    });
  });

  describe('validateContext', () => {
    it('should validate complete context as valid', () => {
      const context = {
        userProfile: mockProfile,
        soilData: mockSoilData,
        weatherForecast: mockWeatherForecast,
        marketData: mockMarketData,
        currentSeason: 'kharif' as const,
        timestamp: new Date(),
      };

      const result = aggregator.validateContext(context);

      expect(result.isValid).toBe(true);
      expect(result.missingData).toHaveLength(0);
    });

    it('should identify missing soil data', () => {
      const context = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: mockWeatherForecast,
        marketData: mockMarketData,
        currentSeason: 'kharif' as const,
        timestamp: new Date(),
      };

      const result = aggregator.validateContext(context);

      expect(result.isValid).toBe(false);
      expect(result.missingData).toContain('Soil health data');
    });

    it('should identify missing weather data', () => {
      const context = {
        userProfile: mockProfile,
        soilData: mockSoilData,
        weatherForecast: null,
        marketData: mockMarketData,
        currentSeason: 'kharif' as const,
        timestamp: new Date(),
      };

      const result = aggregator.validateContext(context);

      expect(result.isValid).toBe(false);
      expect(result.missingData).toContain('Weather forecast');
    });

    it('should identify missing market data', () => {
      const context = {
        userProfile: mockProfile,
        soilData: mockSoilData,
        weatherForecast: mockWeatherForecast,
        marketData: null,
        currentSeason: 'kharif' as const,
        timestamp: new Date(),
      };

      const result = aggregator.validateContext(context);

      expect(result.isValid).toBe(false);
      expect(result.missingData).toContain('Market data');
    });

    it('should identify multiple missing data sources', () => {
      const profileWithoutFarmData = {
        ...mockProfile,
        farmSize: 0,
        primaryCrops: [],
      };
      const context = {
        userProfile: profileWithoutFarmData,
        soilData: null,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif' as const,
        timestamp: new Date(),
      };

      const result = aggregator.validateContext(context);

      expect(result.isValid).toBe(false);
      expect(result.missingData).toHaveLength(4);
      expect(result.missingData).toContain('Farm data');
      expect(result.missingData).toContain('Soil health data');
      expect(result.missingData).toContain('Weather forecast');
      expect(result.missingData).toContain('Market data');
    });
  });
});
