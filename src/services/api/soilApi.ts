/**
 * Soil Health API Client
 * Requirements: 10.1, 10.6
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/env';
import { SoilHealthData, SoilAnalysis, SoilImprovement } from '../../types/soil.types';
import { logger } from '../../utils/logger';

interface UploadSoilHealthCardRequest {
  userId: string;
  imageData?: string; // Base64 encoded image
  textData?: string; // Plain text data
}

interface AnalyzeSoilRequest {
  soilHealthId: string;
}

interface GetImprovementsRequest {
  soilHealthId: string;
}

interface GetCropRecommendationsRequest {
  soilHealthId: string;
  count?: number;
}

class SoilApi {
  private client: AxiosInstance;
  private readonly baseUrl = '/soil';

  constructor() {
    this.client = axios.create({
      baseURL: config.API_BASE_URL,
      timeout: config.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Upload soil health card data
   */
  async uploadSoilHealthCard(request: UploadSoilHealthCardRequest): Promise<SoilHealthData> {
    try {
      logger.info(`Uploading soil health card for user ${request.userId}`);

      const response = await this.client.post<SoilHealthData>(
        `${this.baseUrl}/upload`,
        request
      );

      logger.info(`Soil health card uploaded successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to upload soil health card', error);
      throw error;
    }
  }

  /**
   * Get soil health data by ID
   */
  async getSoilHealthById(soilHealthId: string): Promise<SoilHealthData> {
    try {
      logger.info(`Fetching soil health data: ${soilHealthId}`);

      const response = await this.client.get<SoilHealthData>(
        `${this.baseUrl}/${soilHealthId}`
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch soil health data: ${soilHealthId}`, error);
      throw error;
    }
  }

  /**
   * Get all soil health records for a user
   */
  async getSoilHealthByUser(userId: string): Promise<SoilHealthData[]> {
    try {
      logger.info(`Fetching soil health records for user: ${userId}`);

      const response = await this.client.get<SoilHealthData[]>(
        `${this.baseUrl}/user/${userId}`
      );

      logger.info(`Found ${response.data.length} soil health records`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch soil health records for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Analyze soil health data
   */
  async analyzeSoilHealth(request: AnalyzeSoilRequest): Promise<SoilAnalysis> {
    try {
      logger.info(`Analyzing soil health: ${request.soilHealthId}`);

      const response = await this.client.post<SoilAnalysis>(
        `${this.baseUrl}/analyze`,
        request
      );

      logger.info(`Soil analysis completed: ${response.data.overallRating}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to analyze soil health: ${request.soilHealthId}`, error);
      throw error;
    }
  }

  /**
   * Get soil improvement recommendations
   */
  async getImprovements(request: GetImprovementsRequest): Promise<SoilImprovement[]> {
    try {
      logger.info(`Fetching improvements for soil: ${request.soilHealthId}`);

      const response = await this.client.post<SoilImprovement[]>(
        `${this.baseUrl}/improvements`,
        request
      );

      logger.info(`Found ${response.data.length} improvement recommendations`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch improvements: ${request.soilHealthId}`, error);
      throw error;
    }
  }

  /**
   * Get crop recommendations based on soil health
   */
  async getCropRecommendations(request: GetCropRecommendationsRequest): Promise<any[]> {
    try {
      logger.info(`Fetching crop recommendations for soil: ${request.soilHealthId}`);

      const response = await this.client.post<any[]>(
        `${this.baseUrl}/crop-recommendations`,
        request
      );

      logger.info(`Found ${response.data.length} crop recommendations`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch crop recommendations: ${request.soilHealthId}`, error);
      throw error;
    }
  }

  /**
   * Delete soil health record
   */
  async deleteSoilHealth(soilHealthId: string): Promise<void> {
    try {
      logger.info(`Deleting soil health record: ${soilHealthId}`);

      await this.client.delete(`${this.baseUrl}/${soilHealthId}`);

      logger.info(`Soil health record deleted: ${soilHealthId}`);
    } catch (error) {
      logger.error(`Failed to delete soil health record: ${soilHealthId}`, error);
      throw error;
    }
  }
}

export const soilApi = new SoilApi();
