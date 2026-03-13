/**
 * Soil Health API Service
 * Handles backend integration for soil health card image upload and analysis
 * Requirements: 10.1, 10.6
 */

import axios, { AxiosError } from 'axios';
import { config } from '../../config/env';
import { SoilHealthData } from '../../types/soil.types';

export interface PresignedUrlResponse {
  uploadUrl: string;
  imageKey: string;
  expiresIn: number;
}

export interface AnalysisRequest {
  imageKey: string;
  userId: string;
}

export interface AnalysisResponse {
  analysisId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface AnalysisResult {
  analysisId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  soilData?: SoilHealthData;
  extractedData?: {
    parameters: Record<string, { value: number; confidence: number }>;
    labName?: string;
    sampleId?: string;
    testDate?: string;
  };
  analysis?: {
    overallHealth: string;
    explanation: string;
    deficiencies: string[];
    suitableCrops: Array<{ crop: string; reason: string }>;
    improvements: Array<{ action: string; priority: string; timeframe: string }>;
    insights: string[];
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

class SoilHealthAPIService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.API_BASE_URL;
    this.timeout = config.API_TIMEOUT;
  }

  /**
   * Request a presigned URL for uploading soil health card image to S3
   */
  async getPresignedUrl(
    userId: string,
    fileName: string,
    fileType: string
  ): Promise<PresignedUrlResponse> {
    try {
      const response = await axios.post<PresignedUrlResponse>(
        `${this.baseUrl}/soil-health/upload/presigned-url`,
        {
          userId,
          fileName,
          fileType,
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get presigned URL');
      throw error;
    }
  }

  /**
   * Upload image file to S3 using presigned URL
   */
  async uploadImageToS3(presignedUrl: string, file: Blob | File, fileType: string): Promise<void> {
    try {
      await axios.put(presignedUrl, file, {
        timeout: this.timeout * 2, // Double timeout for file upload
        headers: {
          'Content-Type': fileType,
        },
      });
    } catch (error) {
      this.handleError(error, 'Failed to upload image to S3');
      throw error;
    }
  }

  /**
   * Trigger analysis of uploaded soil health card image
   */
  async triggerAnalysis(imageKey: string, userId: string): Promise<AnalysisResponse> {
    try {
      const response = await axios.post<AnalysisResponse>(
        `${this.baseUrl}/soil-health/analyze`,
        {
          imageKey,
          userId,
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to trigger analysis');
      throw error;
    }
  }

  /**
   * Get analysis results by analysis ID
   * Polls this endpoint to check processing status
   */
  async getAnalysisResult(analysisId: string): Promise<AnalysisResult> {
    try {
      const response = await axios.get<AnalysisResult>(
        `${this.baseUrl}/soil-health/analysis/${analysisId}`,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get analysis result');
      throw error;
    }
  }

  /**
   * Poll for analysis completion
   * Checks status every 2 seconds for up to 60 seconds
   */
  async pollAnalysisResult(
    analysisId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<AnalysisResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getAnalysisResult(analysisId);

      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }

      // Wait before next poll
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Analysis timeout: Processing took too long');
  }

  /**
   * Complete upload workflow: get presigned URL, upload file, trigger analysis, poll for results
   */
  async uploadAndAnalyze(
    userId: string,
    file: Blob | File,
    fileName: string,
    fileType: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<AnalysisResult> {
    try {
      // Step 1: Get presigned URL
      onProgress?.('Getting upload URL', 10);
      const { uploadUrl, imageKey } = await this.getPresignedUrl(userId, fileName, fileType);

      // Step 2: Upload to S3
      onProgress?.('Uploading image', 30);
      await this.uploadImageToS3(uploadUrl, file, fileType);

      // Step 3: Trigger analysis
      onProgress?.('Starting analysis', 50);
      const { analysisId } = await this.triggerAnalysis(imageKey, userId);

      // Step 4: Poll for results
      onProgress?.('Processing image', 70);
      const result = await this.pollAnalysisResult(analysisId);

      onProgress?.('Complete', 100);
      return result;
    } catch (error) {
      this.handleError(error, 'Upload and analysis workflow failed');
      throw error;
    }
  }

  /**
   * Check if API is available
   */
  isApiEnabled(): boolean {
    return config.ENABLE_API && !!this.baseUrl;
  }

  /**
   * Handle API errors with consistent error messages
   */
  private handleError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const message = (axiosError.response?.data as { message?: string })?.message;

      console.error(`[SoilHealthAPI] ${context}:`, {
        status,
        message: message || axiosError.message,
        url: axiosError.config?.url,
      });
    } else {
      console.error(`[SoilHealthAPI] ${context}:`, error);
    }
  }
}

export const soilHealthAPI = new SoilHealthAPIService();
