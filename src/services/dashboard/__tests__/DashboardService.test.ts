/**
 * DashboardService Tests
 * Unit tests for dashboard service
 */

import {DashboardService} from '../DashboardService';
import {DashboardAggregator} from '../DashboardAggregator';
import {PriorityEngine} from '../PriorityEngine';
import {DashboardData} from '../../../types/dashboard.types';

// Mock dependencies
jest.mock('../DashboardAggregator');
jest.mock('../PriorityEngine');

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let mockAggregator: jest.Mocked<DashboardAggregator>;
  let mockPriorityEngine: jest.Mocked<PriorityEngine>;

  const mockDashboardData: DashboardData = {
    weather: {
      date: new Date(),
      condition: 'partly_cloudy',
      temperature: {
        current: 25,
        min: 20,
        max: 30,
        feelsLike: 26,
      },
      humidity: 60,
      wind: {
        speed: 10,
        direction: 'NE',
      },
      precipitation: {
        probability: 20,
        amount: 0,
        type: 'none',
      },
      uvIndex: 5,
      sunrise: new Date(),
      sunset: new Date(),
      description: 'Partly cloudy with mild temperatures',
    },
    upcomingAlerts: [
      {
        id: '1',
        userId: 'user1',
        type: 'sowing',
        title: 'Sowing Time',
        message: 'Time to sow wheat',
        scheduledTime: new Date(),
        priority: 'high',
        status: 'scheduled',
        actionable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    cropStatus: [
      {
        cropName: 'Wheat',
        stage: 'growing',
        health: 'good',
        daysToNextActivity: 5,
        nextActivity: 'Fertilizer application',
        farmArea: 2,
      },
    ],
    marketPrices: [
      {
        id: 'price1',
        crop: 'Wheat',
        mandiName: 'Local Mandi',
        mandiLocation: {
          state: 'Karnataka',
          district: 'Bangalore',
          market: 'Local Mandi',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        price: {
          min: 1800,
          max: 2200,
          modal: 2000,
          currency: 'INR',
        },
        unit: 'quintal',
        date: new Date(),
        source: 'AGMARKNET',
      },
    ],
    recommendations: [
      {
        type: 'crop',
        title: 'Wheat Recommendation',
        summary: 'Wheat is suitable for your soil',
        confidence: 0.9,
        createdAt: new Date(),
      },
    ],
    quickActions: [
      {
        id: 'weather',
        type: 'navigation',
        title: 'Weather',
        icon: 'weather',
        route: 'Weather',
      },
    ],
    insights: [
      {
        type: 'seasonal',
        message: 'Good time for sowing',
        actionable: true,
        priority: 'high',
      },
    ],
    lastUpdated: new Date(),
  };

  beforeEach(() => {
    mockAggregator = {
      getDashboardData: jest.fn().mockResolvedValue(mockDashboardData),
    } as any;

    mockPriorityEngine = {
      prioritizeAlerts: jest.fn(alerts => alerts),
      prioritizeInsights: jest.fn(insights => insights),
    } as any;

    dashboardService = new DashboardService(mockAggregator, mockPriorityEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should fetch and return dashboard data', async () => {
      const result = await dashboardService.getDashboardData('user1');

      expect(result).toBeDefined();
      expect(result.weather).toBeDefined();
      expect(result.upcomingAlerts).toHaveLength(1);
      expect(mockAggregator.getDashboardData).toHaveBeenCalledWith('user1');
    });

    it('should prioritize data before returning', async () => {
      await dashboardService.getDashboardData('user1');

      expect(mockPriorityEngine.prioritizeAlerts).toHaveBeenCalled();
      expect(mockPriorityEngine.prioritizeInsights).toHaveBeenCalled();
    });

    it('should cache dashboard data', async () => {
      await dashboardService.getDashboardData('user1');
      await dashboardService.getDashboardData('user1');

      // Should only call aggregator once due to caching
      expect(mockAggregator.getDashboardData).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockAggregator.getDashboardData.mockRejectedValueOnce(
        new Error('Network error'),
      );

      await expect(
        dashboardService.getDashboardData('user1'),
      ).rejects.toThrow();
    });
  });

  describe('getUpcomingActions', () => {
    it('should return upcoming actions from alerts', async () => {
      const actions = await dashboardService.getUpcomingActions('user1', 7);

      expect(actions).toBeDefined();
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0]).toHaveProperty('title');
      expect(actions[0]).toHaveProperty('dueDate');
    });
  });

  describe('getPersonalizedInsights', () => {
    it('should return personalized insights', async () => {
      const insights = await dashboardService.getPersonalizedInsights('user1');

      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty('message');
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific user', async () => {
      await dashboardService.getDashboardData('user1');
      dashboardService.clearCache('user1');
      await dashboardService.getDashboardData('user1');

      expect(mockAggregator.getDashboardData).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      await dashboardService.getDashboardData('user1');
      await dashboardService.getDashboardData('user2');
      dashboardService.clearAllCache();
      await dashboardService.getDashboardData('user1');

      expect(mockAggregator.getDashboardData).toHaveBeenCalledTimes(3);
    });
  });

  describe('refreshDashboard', () => {
    it('should bypass cache and fetch fresh data', async () => {
      await dashboardService.getDashboardData('user1');
      await dashboardService.refreshDashboard('user1');

      expect(mockAggregator.getDashboardData).toHaveBeenCalledTimes(2);
    });
  });
});
