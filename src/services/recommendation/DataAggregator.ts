/**
 * Data Aggregator Service
 * Collects data from all sources for recommendation generation
 * Requirements: 16.1
 */

import { FarmingContext, Season } from '../../types/recommendation.types';
import { UserProfile } from '../../types/profile.types';
import { SoilHealthData } from '../../types/soil.types';
import { WeatherForecast } from '../../types/weather.types';
import { MarketData } from '../../types/market.types';
import { profileAPI } from '../api/profileApi';
import { profileManager } from '../profile/ProfileManager';
import { soilApi } from '../api/soilApi';
import { soilHealthStorage } from '../soil/SoilHealthStorage';
import { weatherAPI } from '../api/weatherApi';
import { marketAPI } from '../api/marketApi';
import { config } from '../../config/env';

/**
 * Data aggregator for collecting all required data sources
 */
export class DataAggregator {
  /**
   * Aggregate all data sources for a user
   */
  async aggregateData(userId: string): Promise<FarmingContext> {
    try {
      // Fetch all data in parallel
      const [userProfile, soilRecords, weatherForecast, marketData] = await Promise.all([
        this.getUserProfile(userId),
        this.getSoilData(userId),
        this.getWeatherData(userId),
        this.getMarketData(userId),
      ]);

      // Get current season
      const currentSeason = this.getCurrentSeason();

      return {
        userProfile,
        soilData: soilRecords.length > 0 ? soilRecords[0] : null,
        weatherForecast,
        marketData,
        currentSeason,
        timestamp: new Date(),
      };
    } catch {
      throw new Error('Failed to aggregate data');
    }
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      // Try local storage first
      const localProfile = await profileManager.getProfile();
      if (localProfile) {
        return localProfile;
      }

      // Only try API if enabled
      if (config.ENABLE_API) {
        return await profileAPI.getProfile(userId);
      }

      // Return default profile if no data available
      return this.getDefaultProfile(userId);
    } catch {
      // Return default profile on error
      return this.getDefaultProfile(userId);
    }
  }

  /**
   * Get default profile for demo purposes
   */
  private getDefaultProfile(userId: string): UserProfile {
    return {
      userId: userId,
      mobileNumber: '9876543210',
      name: 'Demo Farmer',
      farmSize: 5,
      primaryCrops: ['wheat', 'rice'],
      soilType: 'loamy',
      location: {
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Demo Village',
        pincode: '411001',
        coordinates: {
          latitude: 18.5204,
          longitude: 73.8567,
        },
      },
      languagePreference: 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get soil health data
   */
  private async getSoilData(userId: string): Promise<SoilHealthData[]> {
    try {
      // Try local storage first
      const localRecords = await soilHealthStorage.getUserSoilHealthRecords(userId);
      
      // Only try API if enabled
      if (config.ENABLE_API) {
        try {
          const apiRecords = await soilApi.getSoilHealthByUser(userId);
          // Combine and deduplicate
          const allRecords = [...localRecords, ...apiRecords];
          const uniqueRecords = Array.from(
            new Map(allRecords.map(record => [record.id, record])).values()
          );
          return uniqueRecords;
        } catch {
          // API failed, use local records
          return localRecords;
        }
      }
      
      return localRecords;
    } catch {
      // Soil data is optional, return empty array if not available
      return [];
    }
  }

  /**
   * Get weather forecast
   */
  private async getWeatherData(userId: string): Promise<WeatherForecast | null> {
    try {
      // Get profile (from local or default)
      const profile = await this.getUserProfile(userId);
      if (!profile.location) {
        return null;
      }

      // Only try API if enabled
      if (config.ENABLE_API) {
        return await weatherAPI.getForecast(
          profile.location.coordinates.latitude,
          profile.location.coordinates.longitude
        );
      }

      // Return null if API not enabled
      return null;
    } catch {
      // Weather data is optional
      return null;
    }
  }

  /**
   * Get market data
   */
  private async getMarketData(userId: string): Promise<MarketData | null> {
    try {
      // Get profile (from local or default)
      const profile = await this.getUserProfile(userId);
      if (!profile.location || !profile.primaryCrops || profile.primaryCrops.length === 0) {
        return null;
      }

      // Only try API if enabled
      if (!config.ENABLE_API) {
        return null;
      }
      
      // Get market data for the first crop
      const cropName = profile.primaryCrops[0];
      const [prices, mandis, trend] = await Promise.all([
        marketAPI.getPrices(
          profile.location.coordinates.latitude,
          profile.location.coordinates.longitude,
          [cropName]
        ),
        marketAPI.getNearbyMandis(
          profile.location.coordinates.latitude,
          profile.location.coordinates.longitude
        ),
        marketAPI.getPriceTrend(
          profile.location.coordinates.latitude,
          profile.location.coordinates.longitude,
          cropName
        ),
      ]);

      return {
        prices,
        trends: [trend],
        mandis,
        lastUpdated: new Date(),
        source: 'Government Market API',
      };
    } catch {
      // Market data is optional
      return null;
    }
  }

  /**
   * Determine current season based on month
   */
  private getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1; // 1-12

    // Kharif: June to October (monsoon season)
    if (month >= 6 && month <= 10) {
      return 'kharif';
    }
    // Rabi: November to March (winter season)
    else if (month >= 11 || month <= 3) {
      return 'rabi';
    }
    // Zaid: April to May (summer season)
    else {
      return 'zaid';
    }
  }

  /**
   * Validate farming context completeness
   */
  validateContext(context: FarmingContext): {
    isValid: boolean;
    missingData: string[];
  } {
    const missingData: string[] = [];

    if (!context.userProfile) {
      missingData.push('User profile');
    }

    if (!context.userProfile.location) {
      missingData.push('User location');
    }

    if (!context.userProfile.farmSize || !context.userProfile.primaryCrops) {
      missingData.push('Farm data');
    }

    if (!context.soilData) {
      missingData.push('Soil health data');
    }

    if (!context.weatherForecast) {
      missingData.push('Weather forecast');
    }

    if (!context.marketData) {
      missingData.push('Market data');
    }

    return {
      isValid: missingData.length === 0,
      missingData,
    };
  }
}

// Export singleton instance
export const dataAggregator = new DataAggregator();
