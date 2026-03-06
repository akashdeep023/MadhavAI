/**
 * Dashboard Types
 * Type definitions for dashboard module
 */

import {DailyForecast} from './weather.types';
import {Alert} from './alert.types';
import {MarketPrice} from './market.types';

/**
 * Crop status information
 */
export interface CropStatus {
  cropName: string;
  stage: string; // "sowing" | "growing" | "flowering" | "harvesting"
  health: string; // "good" | "fair" | "poor"
  daysToNextActivity: number;
  nextActivity: string;
  farmArea: number;
}

/**
 * Quick action for dashboard
 */
export interface QuickAction {
  id: string;
  type: string;
  title: string;
  icon: string;
  route: string;
  badge?: number;
}

/**
 * Personalized insight
 */
export interface Insight {
  type: string;
  message: string;
  actionable: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Recommendation summary for dashboard
 */
export interface RecommendationSummary {
  type: 'crop' | 'fertilizer' | 'seed' | 'soil';
  title: string;
  summary: string;
  confidence: number;
  createdAt: Date;
}

/**
 * Complete dashboard data
 */
export interface DashboardData {
  weather: DailyForecast;
  upcomingAlerts: Alert[];
  cropStatus: CropStatus[];
  marketPrices: MarketPrice[];
  recommendations: RecommendationSummary[];
  quickActions: QuickAction[];
  insights: Insight[];
  lastUpdated: Date;
}

/**
 * Dashboard widget configuration
 */
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  order: number;
  refreshInterval?: number; // in seconds
}

/**
 * Dashboard preferences
 */
export interface DashboardPreferences {
  widgets: WidgetConfig[];
  showWeather: boolean;
  showAlerts: boolean;
  showCropStatus: boolean;
  showMarketPrices: boolean;
  showRecommendations: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
}

/**
 * Action item for upcoming activities
 */
export interface Action {
  id: string;
  type: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  cropName?: string;
}

/**
 * Priority score for information display
 */
export interface PriorityScore {
  item: any;
  score: number;
  reason: string;
}
