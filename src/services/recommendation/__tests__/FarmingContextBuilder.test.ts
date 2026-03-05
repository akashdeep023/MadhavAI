/**
 * Farming Context Builder Tests
 */

import { FarmingContextBuilder } from '../FarmingContextBuilder';
import { dataAggregator } from '../DataAggregator';
import { FarmingContext } from '../../../types/recommendation.types';
import { UserProfile } from '../../../types/profile.types';
import { SoilHealthData } from '../../../types/soil.types';
import { WeatherForecast, DailyForecast } from '../../../types/weather.types';
import { MarketData } from '../../../types/market.types';

jest.mock('../DataAggregator');

describe('FarmingContextBuilder', () => {
  let builder: FarmingContextBuilder;

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
    primaryCrops: ['Rice'],
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

  const mockDailyForecast: DailyForecast = {
    date: new Date(),
    temperature: {
      current: 25,
      min: 20,
      max: 30,
      feelsLike: 26,
    },
    precipitation: {
      probability: 20,
      amount: 5,
      type: 'rain',
    },
    humidity: 60,
    wind: {
      speed: 15,
      direction: 'NE',
    },
    uvIndex: 7,
    condition: 'partly_cloudy',
    sunrise: new Date(),
    sunset: new Date(),
    description: 'Partly cloudy with light rain',
  };

  const mockWeatherForecast: WeatherForecast = {
    location: {
      latitude: 28.6139,
      longitude: 77.209,
      name: 'Test Location',
    },
    current: mockDailyForecast,
    daily: [mockDailyForecast],
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
        changePercent: 10,
        average: 2000,
        period: 30,
      },
    ],
    mandis: [],
    lastUpdated: new Date(),
    source: 'test',
  };

  beforeEach(() => {
    builder = new FarmingContextBuilder();
    jest.clearAllMocks();
  });

  describe('buildContext', () => {
    it('should build enhanced context with all computed properties', async () => {
      const baseContext: FarmingContext = {
        userProfile: mockProfile,
        soilData: mockSoilData,
        weatherForecast: mockWeatherForecast,
        marketData: mockMarketData,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      (dataAggregator.aggregateData as jest.Mock).mockResolvedValue(baseContext);

      const enhancedContext = await builder.buildContext('user-001');

      expect(enhancedContext.userProfile).toEqual(mockProfile);
      expect(enhancedContext.computed).toBeDefined();
      expect(enhancedContext.computed.farmSizeCategory).toBeDefined();
      expect(enhancedContext.computed.soilHealthRating).toBeDefined();
      expect(enhancedContext.computed.weatherRisk).toBeDefined();
      expect(enhancedContext.computed.marketOpportunity).toBeDefined();
      expect(enhancedContext.computed.recommendationReadiness).toBeDefined();
    });
  });

  describe('categorizeFarmSize', () => {
    it('should categorize small farm (< 2 hectares)', () => {
      const context: FarmingContext = {
        userProfile: { ...mockProfile, farmSize: 1.5 },
        soilData: null,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const category = builder['categorizeFarmSize'](context);
      expect(category).toBe('small');
    });

    it('should categorize medium farm (2-10 hectares)', () => {
      const context: FarmingContext = {
        userProfile: { ...mockProfile, farmSize: 5 },
        soilData: null,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const category = builder['categorizeFarmSize'](context);
      expect(category).toBe('medium');
    });

    it('should categorize large farm (> 10 hectares)', () => {
      const context: FarmingContext = {
        userProfile: { ...mockProfile, farmSize: 15 },
        soilData: null,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const category = builder['categorizeFarmSize'](context);
      expect(category).toBe('large');
    });
  });

  describe('assessSoilHealth', () => {
    it('should return unknown when no soil data', () => {
      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const rating = builder['assessSoilHealth'](context);
      expect(rating).toBe('unknown');
    });

    it('should return excellent for optimal soil parameters', () => {
      const excellentSoil: SoilHealthData = {
        ...mockSoilData,
        parameters: {
          nitrogen: 320,
          phosphorus: 35,
          potassium: 300,
          pH: 6.8,
          electricalConductivity: 0.5,
          organicCarbon: 0.8,
        },
      };

      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: excellentSoil,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const rating = builder['assessSoilHealth'](context);
      expect(rating).toBe('excellent');
    });

    it('should return poor for suboptimal soil parameters', () => {
      const poorSoil: SoilHealthData = {
        ...mockSoilData,
        parameters: {
          nitrogen: 150,
          phosphorus: 10,
          potassium: 150,
          pH: 4.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.3,
        },
      };

      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: poorSoil,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const rating = builder['assessSoilHealth'](context);
      expect(rating).toBe('poor');
    });
  });

  describe('assessWeatherRisk', () => {
    it('should return medium when no weather data', () => {
      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const risk = builder['assessWeatherRisk'](context);
      expect(risk).toBe('medium');
    });

    it('should return low for favorable weather', () => {
      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: mockWeatherForecast,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const risk = builder['assessWeatherRisk'](context);
      expect(risk).toBe('low');
    });

    it('should return high for extreme weather conditions', () => {
      const extremeWeather: WeatherForecast = {
        ...mockWeatherForecast,
        daily: [
          {
            ...mockDailyForecast,
            temperature: { current: 25, min: 2, max: 45, feelsLike: 26 },
            precipitation: { probability: 90, amount: 80, type: 'rain' },
            wind: { speed: 50, direction: 'NE' },
          },
        ],
      };

      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: extremeWeather,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const risk = builder['assessWeatherRisk'](context);
      expect(risk).toBe('high');
    });
  });

  describe('assessMarketOpportunity', () => {
    it('should return unknown when no market data', () => {
      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const opportunity = builder['assessMarketOpportunity'](context);
      expect(opportunity).toBe('unknown');
    });

    it('should return favorable for rising prices', () => {
      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: null,
        marketData: mockMarketData,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const opportunity = builder['assessMarketOpportunity'](context);
      expect(opportunity).toBe('favorable');
    });

    it('should return unfavorable for falling prices', () => {
      const fallingMarket: MarketData = {
        ...mockMarketData,
        trends: [
          {
            crop: 'Rice',
            prices: [],
            trend: 'falling',
            changePercent: -10,
            average: 2000,
            period: 30,
          },
        ],
      };

      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: null,
        marketData: fallingMarket,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const opportunity = builder['assessMarketOpportunity'](context);
      expect(opportunity).toBe('unfavorable');
    });

    it('should return neutral for stable prices', () => {
      const stableMarket: MarketData = {
        ...mockMarketData,
        trends: [
          {
            crop: 'Rice',
            prices: [],
            trend: 'stable',
            changePercent: 0,
            average: 2000,
            period: 30,
          },
        ],
      };

      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: null,
        marketData: stableMarket,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const opportunity = builder['assessMarketOpportunity'](context);
      expect(opportunity).toBe('neutral');
    });
  });

  describe('calculateReadiness', () => {
    it('should return 100 for complete context', () => {
      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: mockSoilData,
        weatherForecast: mockWeatherForecast,
        marketData: mockMarketData,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const readiness = builder['calculateReadiness'](context);
      expect(readiness).toBe(100);
    });

    it('should return lower score for incomplete context', () => {
      const context: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: null,
        marketData: null,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      const readiness = builder['calculateReadiness'](context);
      expect(readiness).toBeLessThan(100);
      expect(readiness).toBeGreaterThan(0);
    });
  });

  describe('getMissingDataRecommendations', () => {
    it('should return empty array for complete context', async () => {
      const baseContext: FarmingContext = {
        userProfile: mockProfile,
        soilData: mockSoilData,
        weatherForecast: mockWeatherForecast,
        marketData: mockMarketData,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      (dataAggregator.aggregateData as jest.Mock).mockResolvedValue(baseContext);

      const enhancedContext = await builder.buildContext('user-001');
      const recommendations = builder.getMissingDataRecommendations(enhancedContext);

      expect(recommendations).toHaveLength(0);
    });

    it('should recommend uploading soil health card when missing', async () => {
      const baseContext: FarmingContext = {
        userProfile: mockProfile,
        soilData: null,
        weatherForecast: mockWeatherForecast,
        marketData: mockMarketData,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      (dataAggregator.aggregateData as jest.Mock).mockResolvedValue(baseContext);

      const enhancedContext = await builder.buildContext('user-001');
      const recommendations = builder.getMissingDataRecommendations(enhancedContext);

      expect(recommendations).toContain(
        'Upload your soil health card for better crop recommendations'
      );
    });

    it('should recommend adding location when missing', async () => {
      const profileWithoutLocation = {
        ...mockProfile,
        location: {
          state: '',
          district: '',
          village: '',
          pincode: '',
          coordinates: { latitude: 0, longitude: 0 },
        },
      };
      const baseContext: FarmingContext = {
        userProfile: profileWithoutLocation,
        soilData: mockSoilData,
        weatherForecast: mockWeatherForecast,
        marketData: mockMarketData,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      (dataAggregator.aggregateData as jest.Mock).mockResolvedValue(baseContext);

      const enhancedContext = await builder.buildContext('user-001');
      const recommendations = builder.getMissingDataRecommendations(enhancedContext);

      expect(recommendations).toContain(
        'Add your farm location for weather and market insights'
      );
    });

    it('should recommend completing farm profile when missing', async () => {
      const profileWithoutFarmData = { ...mockProfile, farmSize: 0, primaryCrops: [] };
      const baseContext: FarmingContext = {
        userProfile: profileWithoutFarmData,
        soilData: mockSoilData,
        weatherForecast: mockWeatherForecast,
        marketData: mockMarketData,
        currentSeason: 'kharif',
        timestamp: new Date(),
      };

      (dataAggregator.aggregateData as jest.Mock).mockResolvedValue(baseContext);

      const enhancedContext = await builder.buildContext('user-001');
      const recommendations = builder.getMissingDataRecommendations(enhancedContext);

      expect(recommendations).toContain(
        'Complete your farm profile with size and current crops'
      );
    });
  });
});
