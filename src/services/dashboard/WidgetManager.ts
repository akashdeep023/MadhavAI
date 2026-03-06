/**
 * WidgetManager Service
 * Manages dashboard widgets and quick actions
 * Requirements: 14.6, 14.7
 */

import {
  WidgetConfig,
  DashboardPreferences,
  QuickAction,
  Insight,
} from '../../types/dashboard.types';
import {DatabaseService} from '../storage/DatabaseService';
import {UserProfile} from '../../types/profile.types';

/**
 * Default widget configuration
 */
const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'weather',
    type: 'weather',
    title: 'Weather',
    enabled: true,
    order: 1,
    refreshInterval: 3600, // 1 hour
  },
  {
    id: 'alerts',
    type: 'alerts',
    title: 'Alerts',
    enabled: true,
    order: 2,
  },
  {
    id: 'crop-status',
    type: 'crop-status',
    title: 'Crop Status',
    enabled: true,
    order: 3,
  },
  {
    id: 'market-prices',
    type: 'market-prices',
    title: 'Market Prices',
    enabled: true,
    order: 4,
    refreshInterval: 86400, // 24 hours
  },
  {
    id: 'recommendations',
    type: 'recommendations',
    title: 'Recommendations',
    enabled: true,
    order: 5,
  },
  {
    id: 'insights',
    type: 'insights',
    title: 'Insights',
    enabled: true,
    order: 6,
  },
];

/**
 * Manages dashboard widgets and their configuration
 */
export class WidgetManager {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Get dashboard preferences for a user
   * Requirement: 14.6
   */
  async getDashboardPreferences(
    userId: string,
  ): Promise<DashboardPreferences> {
    try {
      const prefs = await this.db.query(
        'SELECT * FROM dashboard_preferences WHERE userId = ?',
        [userId],
      );

      if (prefs.length === 0) {
        // Return default preferences
        return this.getDefaultPreferences();
      }

      return JSON.parse(prefs[0].preferences);
    } catch (error) {
      console.error('Error fetching dashboard preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update dashboard preferences
   * Requirement: 14.6
   */
  async updateDashboardPreferences(
    userId: string,
    preferences: DashboardPreferences,
  ): Promise<void> {
    try {
      await this.db.execute(
        `INSERT OR REPLACE INTO dashboard_preferences (userId, preferences, updatedAt)
         VALUES (?, ?, ?)`,
        [userId, JSON.stringify(preferences), new Date().toISOString()],
      );
    } catch (error) {
      console.error('Error updating dashboard preferences:', error);
      throw error;
    }
  }

  /**
   * Get enabled widgets for a user
   * Requirement: 14.6
   */
  async getEnabledWidgets(userId: string): Promise<WidgetConfig[]> {
    const preferences = await this.getDashboardPreferences(userId);
    return preferences.widgets
      .filter(widget => widget.enabled)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Enable/disable a widget
   * Requirement: 14.6
   */
  async toggleWidget(
    userId: string,
    widgetId: string,
    enabled: boolean,
  ): Promise<void> {
    const preferences = await this.getDashboardPreferences(userId);

    const widget = preferences.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.enabled = enabled;
      await this.updateDashboardPreferences(userId, preferences);
    }
  }

  /**
   * Reorder widgets
   * Requirement: 14.6
   */
  async reorderWidgets(
    userId: string,
    widgetOrder: string[],
  ): Promise<void> {
    const preferences = await this.getDashboardPreferences(userId);

    // Update order based on array position
    widgetOrder.forEach((widgetId, index) => {
      const widget = preferences.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.order = index + 1;
      }
    });

    await this.updateDashboardPreferences(userId, preferences);
  }

  /**
   * Generate quick action widgets for all major features
   * Requirement: 14.6
   */
  generateQuickActions(_profile: UserProfile): QuickAction[] {
    const actions: QuickAction[] = [
      {
        id: 'weather',
        type: 'navigation',
        title: 'Weather Forecast',
        icon: 'weather-partly-cloudy',
        route: 'Weather',
      },
      {
        id: 'schemes',
        type: 'navigation',
        title: 'Government Schemes',
        icon: 'file-document',
        route: 'Schemes',
      },
      {
        id: 'fertilizer',
        type: 'navigation',
        title: 'Fertilizer Guide',
        icon: 'flask',
        route: 'Fertilizer',
      },
      {
        id: 'seeds',
        type: 'navigation',
        title: 'Seed Selection',
        icon: 'seed',
        route: 'Seeds',
      },
      {
        id: 'market',
        type: 'navigation',
        title: 'Market Prices',
        icon: 'currency-inr',
        route: 'Market',
      },
      {
        id: 'training',
        type: 'navigation',
        title: 'Training',
        icon: 'school',
        route: 'Training',
      },
      {
        id: 'crop-planner',
        type: 'navigation',
        title: 'Crop Planner',
        icon: 'calendar-check',
        route: 'CropPlanner',
      },
      {
        id: 'soil',
        type: 'navigation',
        title: 'Soil Health',
        icon: 'terrain',
        route: 'SoilHealth',
      },
    ];

    return actions;
  }

  /**
   * Generate personalized insights based on current season and crop stage
   * Requirement: 14.7
   */
  async generatePersonalizedInsights(
    userId: string,
    profile: UserProfile,
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Get current season
      const currentMonth = new Date().getMonth();
      const season = this.getCurrentSeason(currentMonth);

      // Get active crop plans
      const cropPlans = await this.db.query(
        'SELECT * FROM crop_plans WHERE userId = ? AND status = ?',
        [userId, 'active'],
      );

      // Season-based insights
      insights.push(...this.getSeasonalInsights(season, cropPlans));

      // Crop stage insights
      insights.push(...this.getCropStageInsights(cropPlans));

      // Weather-based insights
      const weatherInsights = await this.getWeatherInsights(profile);
      insights.push(...weatherInsights);

      // Market-based insights
      const marketInsights = await this.getMarketInsights(profile);
      insights.push(...marketInsights);

      return insights;
    } catch (error) {
      console.error('Error generating personalized insights:', error);
      return insights;
    }
  }

  /**
   * Get seasonal insights
   */
  private getSeasonalInsights(
    season: string,
    cropPlans: any[],
  ): Insight[] {
    const insights: Insight[] = [];

    if (season === 'monsoon' && cropPlans.length === 0) {
      insights.push({
        type: 'seasonal',
        message:
          'Monsoon season is ideal for sowing. Check crop recommendations for your region.',
        actionable: true,
        actionUrl: 'Recommendations',
        priority: 'high',
      });
    } else if (season === 'summer' && cropPlans.length > 0) {
      insights.push({
        type: 'seasonal',
        message:
          'Summer season requires careful irrigation. Monitor soil moisture regularly.',
        actionable: true,
        actionUrl: 'CropPlanner',
        priority: 'medium',
      });
    } else if (season === 'winter') {
      insights.push({
        type: 'seasonal',
        message:
          'Winter crops like wheat and mustard are suitable for this season.',
        actionable: true,
        actionUrl: 'Recommendations',
        priority: 'medium',
      });
    }

    return insights;
  }

  /**
   * Get crop stage insights
   */
  private getCropStageInsights(cropPlans: any[]): Insight[] {
    const insights: Insight[] = [];

    for (const plan of cropPlans) {
      const daysToHarvest = this.calculateDaysToHarvest(plan);

      if (daysToHarvest <= 7 && daysToHarvest > 0) {
        insights.push({
          type: 'harvest',
          message: `${plan.cropName} is ready for harvest in ${daysToHarvest} days. Check current market prices.`,
          actionable: true,
          actionUrl: 'Market',
          priority: 'high',
        });
      } else if (plan.currentStage === 'flowering') {
        insights.push({
          type: 'crop-care',
          message: `${plan.cropName} is in flowering stage. Ensure adequate water and nutrients.`,
          actionable: true,
          actionUrl: 'Fertilizer',
          priority: 'medium',
        });
      }
    }

    return insights;
  }

  /**
   * Get weather-based insights
   */
  private async getWeatherInsights(_profile: UserProfile): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Check for weather alerts
      const alerts = await this.db.query(
        'SELECT * FROM weather_alerts WHERE startTime > ?',
        [new Date().toISOString()],
      );

      if (alerts.length > 0) {
        const alert = alerts[0];
        insights.push({
          type: 'weather',
          message: `Weather alert: ${alert.type}. Take necessary precautions.`,
          actionable: true,
          actionUrl: 'Weather',
          priority: 'high',
        });
      }
    } catch (error) {
      console.error('Error fetching weather insights:', error);
    }

    return insights;
  }

  /**
   * Get market-based insights
   */
  private async getMarketInsights(profile: UserProfile): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Check for favorable prices
      for (const crop of profile.primaryCrops) {
        const prices = await this.db.query(
          'SELECT * FROM market_prices WHERE cropName = ? ORDER BY date DESC LIMIT 30',
          [crop],
        );

        if (prices.length > 0) {
          const currentPrice = prices[0].price;
          const avgPrice =
            prices.reduce((sum: number, p: any) => sum + p.price, 0) /
            prices.length;

          if (currentPrice > avgPrice * 1.15) {
            insights.push({
              type: 'price',
              message: `${crop} prices are 15% above average. Good time to sell.`,
              actionable: true,
              actionUrl: 'Market',
              priority: 'high',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching market insights:', error);
    }

    return insights;
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): DashboardPreferences {
    return {
      widgets: DEFAULT_WIDGETS,
      showWeather: true,
      showAlerts: true,
      showCropStatus: true,
      showMarketPrices: true,
      showRecommendations: true,
      autoRefresh: true,
      refreshInterval: 300, // 5 minutes
    };
  }

  /**
   * Get current season based on month
   */
  private getCurrentSeason(month: number): string {
    if (month >= 2 && month <= 5) {
      return 'summer';
    } else if (month >= 6 && month <= 9) {
      return 'monsoon';
    } else if (month >= 10 && month <= 11) {
      return 'post-monsoon';
    } else {
      return 'winter';
    }
  }

  /**
   * Calculate days to harvest
   */
  private calculateDaysToHarvest(plan: any): number {
    if (!plan.expectedHarvestDate) {
      return 0;
    }
    const harvestDate = new Date(plan.expectedHarvestDate);
    const today = new Date();
    const diffTime = harvestDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

export default WidgetManager;
