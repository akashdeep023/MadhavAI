/**
 * DashboardService
 * Main service for dashboard functionality with performance optimization
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.8, 14.9
 */

import {DashboardData, Action, Insight} from '../../types/dashboard.types';
import {DashboardAggregator} from './DashboardAggregator';
import {PriorityEngine} from './PriorityEngine';
import {DASHBOARD_LOAD_TIMEOUT_MS} from '../../config/constants';

/**
 * Main dashboard service with performance optimization
 */
export class DashboardService {
  private aggregator: DashboardAggregator;
  private priorityEngine: PriorityEngine;
  private cache: Map<string, {data: DashboardData; timestamp: number}>;
  private cacheTimeout: number = 60000; // 1 minute cache

  constructor(aggregator: DashboardAggregator, priorityEngine: PriorityEngine) {
    this.aggregator = aggregator;
    this.priorityEngine = priorityEngine;
    this.cache = new Map();
  }

  /**
   * Get dashboard data with 2-second timeout guarantee
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.9
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    try {
      // Check cache first for offline mode performance
      const cached = this.getCachedData(userId);
      if (cached) {
        return cached;
      }

      // Race between data fetch and timeout
      const dataPromise = this.aggregator.getDashboardData(userId);
      const timeoutPromise = this.createTimeout(DASHBOARD_LOAD_TIMEOUT_MS);

      const data = await Promise.race([dataPromise, timeoutPromise]);

      if (!data) {
        throw new Error('Dashboard load timeout');
      }

      // Prioritize information before returning
      const prioritizedData = this.prioritizeData(data);

      // Cache the result
      this.cacheData(userId, prioritizedData);

      return prioritizedData;
    } catch (error) {
      console.error('Error loading dashboard:', error);

      // Return cached data if available, even if stale
      const cached = this.cache.get(userId);
      if (cached) {
        return cached.data;
      }

      throw error;
    }
  }

  /**
   * Get upcoming actions for the next N days
   * Requirement: 14.2
   */
  async getUpcomingActions(userId: string, days: number): Promise<Action[]> {
    try {
      const data = await this.getDashboardData(userId);

      // Convert alerts to actions
      const actions: Action[] = data.upcomingAlerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        description: alert.message,
        dueDate: new Date(alert.scheduledTime),
        priority: alert.priority,
        completed: alert.status === 'read' || alert.status === 'dismissed',
      }));

      // Filter by days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days);

      return actions.filter(action => action.dueDate <= cutoffDate);
    } catch (error) {
      console.error('Error fetching upcoming actions:', error);
      return [];
    }
  }

  /**
   * Get personalized insights
   * Requirement: 14.5, 14.7
   */
  async getPersonalizedInsights(userId: string): Promise<Insight[]> {
    try {
      const data = await this.getDashboardData(userId);
      return data.insights;
    } catch (error) {
      console.error('Error fetching insights:', error);
      return [];
    }
  }

  /**
   * Prioritize dashboard data
   * Requirement: 14.8
   */
  private prioritizeData(data: DashboardData): DashboardData {
    // Prioritize alerts - time-sensitive first
    const prioritizedAlerts = this.priorityEngine.prioritizeAlerts(
      data.upcomingAlerts,
    );

    // Prioritize insights
    const prioritizedInsights = this.priorityEngine.prioritizeInsights(
      data.insights,
    );

    return {
      ...data,
      upcomingAlerts: prioritizedAlerts,
      insights: prioritizedInsights,
    };
  }

  /**
   * Get cached data if available and fresh
   */
  private getCachedData(userId: string): DashboardData | null {
    const cached = this.cache.get(userId);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    // Return cached data if less than cache timeout
    if (age < this.cacheTimeout) {
      return cached.data;
    }

    // Remove stale cache
    this.cache.delete(userId);
    return null;
  }

  /**
   * Cache dashboard data
   */
  private cacheData(userId: string, data: DashboardData): void {
    this.cache.set(userId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<null> {
    return new Promise(resolve => {
      setTimeout(() => resolve(null), ms);
    });
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Refresh dashboard data (bypass cache)
   */
  async refreshDashboard(userId: string): Promise<DashboardData> {
    this.clearCache(userId);
    return this.getDashboardData(userId);
  }

  /**
   * Prefetch dashboard data for performance
   */
  async prefetchDashboard(userId: string): Promise<void> {
    try {
      await this.getDashboardData(userId);
    } catch (error) {
      console.error('Error prefetching dashboard:', error);
    }
  }
}

export default DashboardService;
