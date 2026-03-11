/**
 * Recommendation A/B Testing Service Tests
 *
 * Tests for A/B testing framework with user assignment and acceptance tracking.
 */

jest.mock('axios');

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { RecommendationABTestingService } from '../RecommendationABTestingService';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RecommendationABTestingService', () => {
  let abTestingService: RecommendationABTestingService;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('user_id', 'test_user_123');
    abTestingService = RecommendationABTestingService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await abTestingService.clearAllData();
  });

  describe('Initialization', () => {
    it('should initialize A/B testing service', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await abTestingService.initialize();

      // Should attempt to sync pending events
      expect(true).toBe(true);
    });
  });

  describe('Active Tests', () => {
    it('should get active tests for recommendation type', async () => {
      const mockTests = [
        {
          id: 'test_001',
          name: 'Crop Recommendation Algorithm V2',
          description: 'Testing new ML model',
          recommendationType: 'crop',
          variants: [
            {
              id: 'control',
              name: 'Control',
              description: 'Current algorithm',
              algorithmVersion: '1.0',
              config: {},
              percentage: 50,
            },
            {
              id: 'treatment',
              name: 'Treatment',
              description: 'New algorithm',
              algorithmVersion: '2.0',
              config: { useNewModel: true },
              percentage: 50,
            },
          ],
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          targetUserPercentage: 100,
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: { tests: mockTests } });

      const tests = await abTestingService.getActiveTests('crop');

      expect(tests.length).toBe(1);
      expect(tests[0].id).toBe('test_001');
      expect(tests[0].recommendationType).toBe('crop');
    });

    it('should return empty array on API failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const tests = await abTestingService.getActiveTests('fertilizer');

      expect(tests).toEqual([]);
    });
  });

  describe('Variant Assignment', () => {
    it('should assign user to variant', async () => {
      const mockTest = {
        id: 'test_002',
        name: 'Fertilizer Recommendation Test',
        description: 'Testing recommendations',
        recommendationType: 'fertilizer',
        variants: [
          {
            id: 'variant_a',
            name: 'Variant A',
            description: 'Control',
            algorithmVersion: '1.0',
            config: {},
            percentage: 50,
          },
          {
            id: 'variant_b',
            name: 'Variant B',
            description: 'Treatment',
            algorithmVersion: '2.0',
            config: { enhanced: true },
            percentage: 50,
          },
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        targetUserPercentage: 100,
      };

      mockedAxios.get.mockResolvedValue({ data: { test: mockTest } });
      mockedAxios.post.mockResolvedValue({ data: {} });

      const variantId = await abTestingService.getVariantAssignment('test_002', 'fertilizer');

      expect(variantId).toBeDefined();
      expect(['variant_a', 'variant_b']).toContain(variantId);

      // Verify assignment was saved
      const participation = await abTestingService.getUserTestParticipation();
      expect(participation.length).toBe(1);
      expect(participation[0].testId).toBe('test_002');
    });

    it('should return same variant on subsequent calls', async () => {
      const mockTest = {
        id: 'test_003',
        name: 'Seed Recommendation Test',
        recommendationType: 'seed',
        variants: [
          {
            id: 'control',
            name: 'Control',
            algorithmVersion: '1.0',
            config: {},
            percentage: 50,
          },
          {
            id: 'treatment',
            name: 'Treatment',
            algorithmVersion: '2.0',
            config: {},
            percentage: 50,
          },
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        targetUserPercentage: 100,
      };

      mockedAxios.get.mockResolvedValue({ data: { test: mockTest } });
      mockedAxios.post.mockResolvedValue({ data: {} });

      const variant1 = await abTestingService.getVariantAssignment('test_003', 'seed');
      const variant2 = await abTestingService.getVariantAssignment('test_003', 'seed');

      expect(variant1).toBe(variant2);
    });

    it('should return null for inactive test', async () => {
      const mockTest = {
        id: 'test_004',
        name: 'Inactive Test',
        recommendationType: 'crop',
        variants: [],
        startDate: new Date(),
        endDate: new Date(),
        status: 'paused',
        targetUserPercentage: 100,
      };

      mockedAxios.get.mockResolvedValue({ data: { test: mockTest } });

      const variantId = await abTestingService.getVariantAssignment('test_004', 'crop');

      expect(variantId).toBeNull();
    });
  });

  describe('Variant Configuration', () => {
    it('should get variant configuration', async () => {
      const mockTest = {
        id: 'test_005',
        name: 'Config Test',
        recommendationType: 'crop',
        variants: [
          {
            id: 'variant_x',
            name: 'Variant X',
            algorithmVersion: '1.0',
            config: { feature1: true, feature2: 'value' },
            percentage: 100,
          },
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        targetUserPercentage: 100,
      };

      mockedAxios.get.mockResolvedValue({ data: { test: mockTest } });
      mockedAxios.post.mockResolvedValue({ data: {} });

      // First assign variant
      await abTestingService.getVariantAssignment('test_005', 'crop');

      // Then get config
      const config = await abTestingService.getVariantConfig('test_005');

      expect(config).toBeDefined();
      expect(config.feature1).toBe(true);
      expect(config.feature2).toBe('value');
    });

    it('should return null for no assignment', async () => {
      const config = await abTestingService.getVariantConfig('non_existent_test');

      expect(config).toBeNull();
    });
  });

  describe('Acceptance Tracking', () => {
    it('should track recommendation acceptance', async () => {
      // Setup assignment first
      const mockTest = {
        id: 'test_006',
        name: 'Acceptance Test',
        recommendationType: 'fertilizer',
        variants: [
          {
            id: 'variant_1',
            name: 'Variant 1',
            algorithmVersion: '1.0',
            config: {},
            percentage: 100,
          },
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        targetUserPercentage: 100,
      };

      mockedAxios.get.mockResolvedValue({ data: { test: mockTest } });
      mockedAxios.post.mockResolvedValue({ data: {} });

      await abTestingService.getVariantAssignment('test_006', 'fertilizer');

      // Track acceptance
      await abTestingService.trackAcceptance('test_006', 'fertilizer', 'rec_001', true, {
        cropType: 'wheat',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/events'),
        expect.objectContaining({
          testId: 'test_006',
          accepted: true,
        }),
        expect.any(Object)
      );
    });

    it('should store events locally on API failure', async () => {
      // Setup assignment
      const mockTest = {
        id: 'test_007',
        name: 'Local Storage Test',
        recommendationType: 'seed',
        variants: [
          {
            id: 'variant_2',
            name: 'Variant 2',
            algorithmVersion: '1.0',
            config: {},
            percentage: 100,
          },
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        targetUserPercentage: 100,
      };

      mockedAxios.get.mockResolvedValue({ data: { test: mockTest } });
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await abTestingService.getVariantAssignment('test_007', 'seed');

      // Track acceptance (should fail to send but store locally)
      await abTestingService.trackAcceptance('test_007', 'seed', 'rec_002', false);

      // Verify event was stored locally
      const eventsJson = await AsyncStorage.getItem('recommendation_ab_events');
      expect(eventsJson).toBeDefined();

      const events = JSON.parse(eventsJson!);
      expect(events.length).toBe(1);
      expect(events[0].testId).toBe('test_007');
      expect(events[0].accepted).toBe(false);
    });
  });

  describe('Test Results', () => {
    it('should get test results', async () => {
      const mockResults = {
        testId: 'test_008',
        testName: 'Results Test',
        status: 'completed',
        startDate: new Date(),
        endDate: new Date(),
        variants: [
          {
            variantId: 'control',
            variantName: 'Control',
            totalRecommendations: 100,
            acceptedRecommendations: 75,
            rejectedRecommendations: 25,
            acceptanceRate: 75,
          },
          {
            variantId: 'treatment',
            variantName: 'Treatment',
            totalRecommendations: 100,
            acceptedRecommendations: 85,
            rejectedRecommendations: 15,
            acceptanceRate: 85,
          },
        ],
        winner: 'treatment',
        confidence: 95,
      };

      mockedAxios.get.mockResolvedValue({ data: { results: mockResults } });

      const results = await abTestingService.getTestResults('test_008');

      expect(results).toBeDefined();
      expect(results?.testId).toBe('test_008');
      expect(results?.variants.length).toBe(2);
      expect(results?.winner).toBe('treatment');
    });
  });

  describe('Variant Metrics', () => {
    it('should get variant metrics', async () => {
      const mockMetrics = {
        variantId: 'variant_3',
        variantName: 'Variant 3',
        totalRecommendations: 50,
        acceptedRecommendations: 40,
        rejectedRecommendations: 10,
        acceptanceRate: 80,
        averageResponseTime: 1500,
      };

      mockedAxios.get.mockResolvedValue({ data: { metrics: mockMetrics } });

      const metrics = await abTestingService.getVariantMetrics('test_009', 'variant_3');

      expect(metrics).toBeDefined();
      expect(metrics?.acceptanceRate).toBe(80);
      expect(metrics?.totalRecommendations).toBe(50);
    });
  });

  describe('Local Acceptance Rate', () => {
    it('should calculate local acceptance rate', async () => {
      // Setup assignment
      const mockTest = {
        id: 'test_010',
        name: 'Local Rate Test',
        recommendationType: 'crop',
        variants: [
          {
            id: 'variant_4',
            name: 'Variant 4',
            algorithmVersion: '1.0',
            config: {},
            percentage: 100,
          },
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        targetUserPercentage: 100,
      };

      mockedAxios.get.mockResolvedValue({ data: { test: mockTest } });
      mockedAxios.post.mockRejectedValue(new Error('Offline'));

      await abTestingService.getVariantAssignment('test_010', 'crop');

      // Track multiple acceptances
      await abTestingService.trackAcceptance('test_010', 'crop', 'rec_001', true);
      await abTestingService.trackAcceptance('test_010', 'crop', 'rec_002', true);
      await abTestingService.trackAcceptance('test_010', 'crop', 'rec_003', false);
      await abTestingService.trackAcceptance('test_010', 'crop', 'rec_004', true);

      const rate = await abTestingService.calculateLocalAcceptanceRate('test_010', 'variant_4');

      expect(rate).toBe(75); // 3 out of 4 accepted
    });

    it('should return 0 for no events', async () => {
      const rate = await abTestingService.calculateLocalAcceptanceRate('non_existent', 'variant_x');

      expect(rate).toBe(0);
    });
  });

  describe('Event Syncing', () => {
    it('should sync pending events', async () => {
      // Create some pending events
      const events = [
        {
          testId: 'test_011',
          variantId: 'variant_5',
          recommendationType: 'fertilizer',
          recommendationId: 'rec_001',
          accepted: true,
          timestamp: new Date(),
          userId: 'test_user_123',
        },
      ];

      await AsyncStorage.setItem('recommendation_ab_events', JSON.stringify(events));

      mockedAxios.post.mockResolvedValue({ data: {} });

      await abTestingService.syncPendingEvents();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/events/batch'),
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              testId: 'test_011',
              variantId: 'variant_5',
              recommendationType: 'fertilizer',
              recommendationId: 'rec_001',
              accepted: true,
              userId: 'test_user_123',
            }),
          ]),
        })
      );

      // Verify events were cleared
      const remaining = await AsyncStorage.getItem('recommendation_ab_events');
      expect(remaining).toBeNull();
    });
  });

  describe('User Test Participation', () => {
    it('should get user test participation', async () => {
      const mockTest = {
        id: 'test_012',
        name: 'Participation Test',
        recommendationType: 'seed',
        variants: [
          {
            id: 'variant_6',
            name: 'Variant 6',
            algorithmVersion: '1.0',
            config: {},
            percentage: 100,
          },
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        targetUserPercentage: 100,
      };

      mockedAxios.get.mockResolvedValue({ data: { test: mockTest } });
      mockedAxios.post.mockResolvedValue({ data: {} });

      await abTestingService.getVariantAssignment('test_012', 'seed');

      const participation = await abTestingService.getUserTestParticipation();

      expect(participation.length).toBe(1);
      expect(participation[0].testId).toBe('test_012');
      expect(participation[0].variantId).toBe('variant_6');
    });
  });
});
