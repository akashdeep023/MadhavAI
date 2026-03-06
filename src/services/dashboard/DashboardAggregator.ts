/**
 * DashboardAggregator Service
 * Collects data from all modules for dashboard display
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import {
  DashboardData,
  CropStatus,
  QuickAction,
  RecommendationSummary,
  Insight,
} from '../../types/dashboard.types';
import {weatherService} from '../weather';
import {AlertScheduler} from '../alert/AlertScheduler';
import {marketService} from '../market/MarketService';
import {profileManager} from '../profile';
import {DatabaseService} from '../storage/DatabaseService';
import {UserProfile} from '../../types/profile.types';
import {DailyForecast} from '../../types/weather.types';
import {Alert} from '../../types/alert.types';
import {MarketPrice} from '../../types/market.types';

/**
 * Aggregates data from all modules for dashboard display
 */
export class DashboardAggregator {
  private weatherService: typeof weatherService;
  private alertScheduler: AlertScheduler;
  private marketService: typeof marketService;
  private profileManager: typeof profileManager;
  private db: DatabaseService;

  constructor(
    weatherSvc: typeof weatherService,
    alertScheduler: AlertScheduler,
    marketSvc: typeof marketService,
    profileMgr: typeof profileManager,
    db: DatabaseService,
  ) {
    this.weatherService = weatherSvc;
    this.alertScheduler = alertScheduler;
    this.marketService = marketSvc;
    this.profileManager = profileMgr;
    this.db = db;
  }

  /**
   * Collect all dashboard data for a user
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
   */
  async getDashboardData(_userId: string): Promise<DashboardData> {
    try {
      // Get user profile for location and crop information
      const profile = await this.profileManager.getProfile();

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Collect data from all modules in parallel for performance
      const [
        weather,
        upcomingAlerts,
        cropStatus,
        marketPrices,
        recommendations,
        insights,
      ] = await Promise.all([
        this.getWeatherData(profile),
        this.getUpcomingAlerts(profile.userId),
        this.getCropStatus(profile.userId),
        this.getMarketPrices(profile),
        this.getRecommendations(profile.userId),
        this.getPersonalizedInsights(profile.userId, profile),
      ]);

      // Generate quick actions based on user's crops and activities
      const quickActions = this.generateQuickActions(profile);

      return {
        weather,
        upcomingAlerts,
        cropStatus,
        marketPrices,
        recommendations,
        quickActions,
        insights,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error collecting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get current weather conditions
   * Requirement: 14.1
   */
  private async getWeatherData(
    profile: UserProfile,
  ): Promise<DailyForecast> {
    try {
      const forecast = await this.weatherService.getForecast(
        profile.location.coordinates.latitude,
        profile.location.coordinates.longitude
      );
      return forecast.current;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Return default weather data if fetch fails
      return {
        date: new Date(),
        condition: 'clear',
        temperature: {
          current: 0,
          min: 0,
          max: 0,
          feelsLike: 0,
        },
        humidity: 0,
        wind: {
          speed: 0,
          direction: 'N',
        },
        precipitation: {
          probability: 0,
          amount: 0,
          type: 'none',
        },
        uvIndex: 0,
        sunrise: new Date(),
        sunset: new Date(),
        description: 'Unknown',
      };
    }
  }

  /**
   * Get upcoming alerts for next 7 days
   * Requirement: 14.2
   */
  private async getUpcomingAlerts(userId: string): Promise<Alert[]> {
    try {
      const alerts = await this.alertScheduler.getUpcomingAlerts(userId, 7);
      // Filter only pending/scheduled alerts
      return alerts.filter(
        alert => alert.status === 'scheduled' || alert.status === 'sent',
      );
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Get current crop status
   * Requirement: 14.3
   */
  private async getCropStatus(userId: string): Promise<CropStatus[]> {
    try {
      // Query crop plans from database
      const cropPlans = await this.db.query(
        'SELECT * FROM crop_plans WHERE userId = ? AND status = ?',
        [userId, 'active'],
      );

      return cropPlans.map((plan: any) => ({
        cropName: plan.cropName,
        stage: plan.currentStage || 'growing',
        health: plan.health || 'good',
        daysToNextActivity: this.calculateDaysToNextActivity(plan),
        nextActivity: this.getNextActivity(plan),
        farmArea: plan.farmArea,
      }));
    } catch (error) {
      console.error('Error fetching crop status:', error);
      return [];
    }
  }

  /**
   * Get recent market prices for user's crops
   * Requirement: 14.4
   */
  private async getMarketPrices(profile: UserProfile): Promise<MarketPrice[]> {
    try {
      const prices = await this.marketService.getPrices(
        profile.location.coordinates.latitude,
        profile.location.coordinates.longitude,
        profile.primaryCrops,
        50 // 50 km radius
      );
      
      // Get the most recent price for each crop
      return prices.slice(0, 5);
    } catch (error) {
      console.error('Error fetching market prices:', error);
      return [];
    }
  }

  /**
   * Get recent recommendations
   * Requirement: 14.5
   */
  private async getRecommendations(
    userId: string,
  ): Promise<RecommendationSummary[]> {
    try {
      // Query recent recommendations from database
      const recommendations = await this.db.query(
        'SELECT * FROM recommendations WHERE userId = ? ORDER BY createdAt DESC LIMIT 5',
        [userId],
      );

      return recommendations.map((rec: any) => ({
        type: rec.type,
        title: rec.title,
        summary: rec.summary,
        confidence: rec.confidence || 0.8,
        createdAt: new Date(rec.createdAt),
      }));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }

  /**
   * Generate quick action widgets
   * Requirement: 14.6
   */
  private generateQuickActions(_profile: UserProfile): QuickAction[] {
    return [
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
        id: 'recommendations',
        type: 'navigation',
        title: 'Recommendations',
        icon: 'lightbulb',
        route: 'Recommendations',
      },
      {
        id: 'soil',
        type: 'navigation',
        title: 'Soil Health',
        icon: 'terrain',
        route: 'SoilHealth',
      },
    ];
  }

  /**
   * Get personalized insights based on current season and crop stage
   * Requirement: 14.7
   */
  private async getPersonalizedInsights(
    userId: string,
    _profile: UserProfile,
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Get current season
      const currentMonth = new Date().getMonth();
      const season = this.getCurrentSeason(currentMonth);

      // Get crop plans
      const cropPlans = await this.db.query(
        'SELECT * FROM crop_plans WHERE userId = ? AND status = ?',
        [userId, 'active'],
      );

      // Generate season-based insights
      if (season === 'monsoon' && cropPlans.length === 0) {
        insights.push({
          type: 'seasonal',
          message: 'Monsoon season is ideal for sowing. Check crop recommendations.',
          actionable: true,
          actionUrl: 'Recommendations',
          priority: 'high',
        });
      }

      // Generate crop stage insights
      for (const plan of cropPlans) {
        const daysToHarvest = this.calculateDaysToHarvest(plan);
        if (daysToHarvest <= 7 && daysToHarvest > 0) {
          insights.push({
            type: 'harvest',
            message: `${plan.cropName} is ready for harvest in ${daysToHarvest} days. Check market prices.`,
            actionable: true,
            actionUrl: 'Market',
            priority: 'high',
          });
        }
      }

      // Check for pending alerts
      const pendingAlerts = await this.alertScheduler.getUpcomingAlerts(userId, 1);
      if (pendingAlerts.length > 0) {
        insights.push({
          type: 'alert',
          message: `You have ${pendingAlerts.length} pending alert(s) for today.`,
          actionable: true,
          actionUrl: 'Alerts',
          priority: 'high',
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return insights;
    }
  }

  /**
   * Calculate days to next activity
   */
  private calculateDaysToNextActivity(plan: any): number {
    if (!plan.nextActivityDate) {
      return 0;
    }
    const nextDate = new Date(plan.nextActivityDate);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Get next activity name
   */
  private getNextActivity(plan: any): string {
    return plan.nextActivity || 'No upcoming activity';
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
}

export default DashboardAggregator;
