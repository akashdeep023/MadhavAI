/**
 * Recommendation A/B Testing Service
 *
 * Specialized A/B testing for recommendation algorithms.
 * Supports user variant assignment and acceptance rate tracking.
 *
 * **Validates: Requirements 18.8**
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

export interface RecommendationTest {
  id: string;
  name: string;
  description: string;
  recommendationType: 'crop' | 'fertilizer' | 'seed' | 'soil_improvement';
  variants: RecommendationVariant[];
  startDate: Date;
  endDate: Date;
  status: 'active' | 'paused' | 'completed';
  targetUserPercentage: number;
}

export interface RecommendationVariant {
  id: string;
  name: string;
  description: string;
  algorithmVersion: string;
  config: any;
  percentage: number;
}

export interface UserVariantAssignment {
  testId: string;
  variantId: string;
  assignedAt: Date;
  userId: string;
}

export interface AcceptanceEvent {
  testId: string;
  variantId: string;
  recommendationType: string;
  recommendationId: string;
  accepted: boolean;
  timestamp: Date;
  userId: string;
  context?: any;
}

export interface VariantMetrics {
  variantId: string;
  variantName: string;
  totalRecommendations: number;
  acceptedRecommendations: number;
  rejectedRecommendations: number;
  acceptanceRate: number;
  averageResponseTime?: number;
}

export interface TestResults {
  testId: string;
  testName: string;
  status: string;
  startDate: Date;
  endDate: Date;
  variants: VariantMetrics[];
  winner?: string;
  confidence?: number;
}

export class RecommendationABTestingService {
  private static instance: RecommendationABTestingService;
  private readonly API_BASE_URL = config.OTA_API_BASE_URL;
  private readonly ASSIGNMENTS_KEY = 'recommendation_ab_assignments';
  private readonly EVENTS_KEY = 'recommendation_ab_events';
  private readonly MAX_PENDING_EVENTS = 100;

  private constructor() {}

  static getInstance(): RecommendationABTestingService {
    if (!RecommendationABTestingService.instance) {
      RecommendationABTestingService.instance = new RecommendationABTestingService();
    }
    return RecommendationABTestingService.instance;
  }

  /**
   * Initialize A/B testing service
   */
  async initialize(): Promise<void> {
    logger.info('Initializing recommendation A/B testing service');
    await this.syncPendingEvents();
  }

  /**
   * Get active tests for recommendation type
   */
  async getActiveTests(
    recommendationType: RecommendationTest['recommendationType']
  ): Promise<RecommendationTest[]> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/ab-tests/recommendations/active`, {
        params: { type: recommendationType },
        timeout: 5000,
      });

      return response.data.tests || [];
    } catch (error) {
      logger.error('Failed to get active tests', { error });
      return [];
    }
  }

  /**
   * Get variant assignment for user
   */
  async getVariantAssignment(
    testId: string,
    _recommendationType: RecommendationTest['recommendationType']
  ): Promise<string | null> {
    try {
      const userId = await this.getUserId();

      // Check existing assignment
      const existingAssignment = await this.getExistingAssignment(testId, userId);
      if (existingAssignment) {
        return existingAssignment.variantId;
      }

      // Get test configuration
      const test = await this.getTest(testId);
      if (!test || test.status !== 'active') {
        return null;
      }

      // Check if user should be included
      if (!this.shouldIncludeUser(userId, test.targetUserPercentage)) {
        return null;
      }

      // Assign variant
      const variantId = this.assignVariant(userId, test);

      // Save assignment
      await this.saveAssignment({
        testId,
        variantId,
        assignedAt: new Date(),
        userId,
      });

      // Report to server
      await this.reportAssignment(testId, variantId, userId);

      logger.info('User assigned to variant', {
        testId,
        variantId,
        userId,
      });

      return variantId;
    } catch (error) {
      logger.error('Failed to get variant assignment', { error });
      return null;
    }
  }

  /**
   * Get variant configuration
   */
  async getVariantConfig(testId: string): Promise<any> {
    try {
      const userId = await this.getUserId();
      const assignment = await this.getExistingAssignment(testId, userId);

      if (!assignment) {
        return null;
      }

      const test = await this.getTest(testId);
      if (!test) {
        return null;
      }

      const variant = test.variants.find((v) => v.id === assignment.variantId);
      return variant?.config || null;
    } catch (error) {
      logger.error('Failed to get variant config', { error });
      return null;
    }
  }

  /**
   * Track recommendation acceptance
   */
  async trackAcceptance(
    testId: string,
    recommendationType: string,
    recommendationId: string,
    accepted: boolean,
    context?: any
  ): Promise<void> {
    try {
      const userId = await this.getUserId();
      const assignment = await this.getExistingAssignment(testId, userId);

      if (!assignment) {
        logger.warn('No variant assignment found for acceptance tracking', {
          testId,
          userId,
        });
        return;
      }

      const event: AcceptanceEvent = {
        testId,
        variantId: assignment.variantId,
        recommendationType,
        recommendationId,
        accepted,
        timestamp: new Date(),
        userId,
        context,
      };

      // Store event locally
      await this.storeEvent(event);

      // Try to send immediately
      await this.sendEvent(event);

      logger.info('Acceptance tracked', {
        testId,
        variantId: assignment.variantId,
        accepted,
      });
    } catch (error) {
      logger.error('Failed to track acceptance', { error });
    }
  }

  /**
   * Get test results
   */
  async getTestResults(testId: string): Promise<TestResults | null> {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/ab-tests/recommendations/${testId}/results`,
        {
          timeout: 10000,
        }
      );

      return response.data.results || null;
    } catch (error) {
      logger.error('Failed to get test results', { error });
      return null;
    }
  }

  /**
   * Get variant metrics
   */
  async getVariantMetrics(testId: string, variantId: string): Promise<VariantMetrics | null> {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/ab-tests/recommendations/${testId}/variants/${variantId}/metrics`,
        {
          timeout: 5000,
        }
      );

      return response.data.metrics || null;
    } catch (error) {
      logger.error('Failed to get variant metrics', { error });
      return null;
    }
  }

  /**
   * Get user's test participation
   */
  async getUserTestParticipation(): Promise<UserVariantAssignment[]> {
    try {
      const assignmentsJson = await AsyncStorage.getItem(this.ASSIGNMENTS_KEY);
      if (assignmentsJson) {
        return JSON.parse(assignmentsJson);
      }
      return [];
    } catch (error) {
      logger.error('Failed to get user test participation', { error });
      return [];
    }
  }

  /**
   * Calculate local acceptance rate
   */
  async calculateLocalAcceptanceRate(testId: string, variantId: string): Promise<number> {
    try {
      const events = await this.getLocalEvents();
      const variantEvents = events.filter((e) => e.testId === testId && e.variantId === variantId);

      if (variantEvents.length === 0) {
        return 0;
      }

      const accepted = variantEvents.filter((e) => e.accepted).length;
      return (accepted / variantEvents.length) * 100;
    } catch (error) {
      logger.error('Failed to calculate local acceptance rate', { error });
      return 0;
    }
  }

  /**
   * Get test configuration
   */
  private async getTest(testId: string): Promise<RecommendationTest | null> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/ab-tests/recommendations/${testId}`, {
        timeout: 5000,
      });

      return response.data.test || null;
    } catch (error) {
      logger.error('Failed to get test', { error });
      return null;
    }
  }

  /**
   * Check if user should be included in test
   */
  private shouldIncludeUser(userId: string, targetPercentage: number): boolean {
    const hash = this.hashUserId(userId);
    const bucket = hash % 100;
    return bucket < targetPercentage;
  }

  /**
   * Assign user to variant
   */
  private assignVariant(userId: string, test: RecommendationTest): string {
    const hash = this.hashUserId(userId + test.id);
    let cumulative = 0;

    for (const variant of test.variants) {
      cumulative += variant.percentage;
      if (hash % 100 < cumulative) {
        return variant.id;
      }
    }

    // Fallback to first variant (control)
    return test.variants[0].id;
  }

  /**
   * Hash user ID for consistent assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get existing assignment
   */
  private async getExistingAssignment(
    testId: string,
    userId: string
  ): Promise<UserVariantAssignment | null> {
    try {
      const assignments = await this.getUserTestParticipation();
      return assignments.find((a) => a.testId === testId && a.userId === userId) || null;
    } catch (error) {
      logger.error('Failed to get existing assignment', { error });
      return null;
    }
  }

  /**
   * Save assignment
   */
  private async saveAssignment(assignment: UserVariantAssignment): Promise<void> {
    try {
      const assignments = await this.getUserTestParticipation();
      assignments.push(assignment);
      await AsyncStorage.setItem(this.ASSIGNMENTS_KEY, JSON.stringify(assignments));
    } catch (error) {
      logger.error('Failed to save assignment', { error });
    }
  }

  /**
   * Report assignment to server
   */
  private async reportAssignment(testId: string, variantId: string, userId: string): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/ab-tests/recommendations/assignments`, {
        testId,
        variantId,
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to report assignment', { error });
    }
  }

  /**
   * Store event locally
   */
  private async storeEvent(event: AcceptanceEvent): Promise<void> {
    try {
      const events = await this.getLocalEvents();
      events.push(event);

      // Trim if exceeding max
      const trimmedEvents = events.slice(-this.MAX_PENDING_EVENTS);

      await AsyncStorage.setItem(this.EVENTS_KEY, JSON.stringify(trimmedEvents));
    } catch (error) {
      logger.error('Failed to store event', { error });
    }
  }

  /**
   * Send event to server
   */
  private async sendEvent(event: AcceptanceEvent): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/ab-tests/recommendations/events`, event, {
        timeout: 5000,
      });
    } catch (error) {
      logger.error('Failed to send event', { error });
      // Event is already stored locally for later sync
    }
  }

  /**
   * Get local events
   */
  private async getLocalEvents(): Promise<AcceptanceEvent[]> {
    try {
      const eventsJson = await AsyncStorage.getItem(this.EVENTS_KEY);
      if (eventsJson) {
        return JSON.parse(eventsJson);
      }
      return [];
    } catch (error) {
      logger.error('Failed to get local events', { error });
      return [];
    }
  }

  /**
   * Sync pending events
   */
  async syncPendingEvents(): Promise<void> {
    try {
      const events = await this.getLocalEvents();

      if (events.length === 0) {
        return;
      }

      // Send events in batch
      await axios.post(`${this.API_BASE_URL}/ab-tests/recommendations/events/batch`, {
        events,
      });

      // Clear local events
      await AsyncStorage.removeItem(this.EVENTS_KEY);

      logger.info('Pending events synced', { count: events.length });
    } catch (error) {
      logger.error('Failed to sync pending events', { error });
    }
  }

  /**
   * Get user ID
   */
  private async getUserId(): Promise<string> {
    const userId = await AsyncStorage.getItem('user_id');
    return userId || 'anonymous';
  }

  /**
   * Clear all data (for testing)
   */
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.ASSIGNMENTS_KEY);
      await AsyncStorage.removeItem(this.EVENTS_KEY);
      logger.info('All A/B testing data cleared');
    } catch (error) {
      logger.error('Failed to clear A/B testing data', { error });
    }
  }
}

export default RecommendationABTestingService.getInstance();
