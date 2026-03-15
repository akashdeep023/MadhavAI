/**
 * Authentication API Client
 * Handles API calls for authentication endpoints
 * Requirements: 1.1, 1.2
 *
 * Note: This is a client-side API layer for the mobile app.
 * The actual backend Lambda functions would be implemented separately.
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/env';
import { AuthToken, OTPResponse } from '../../types/auth.types';
import { logger } from '../../utils/logger';

interface SendOTPRequest {
  mobileNumber: string;
}

interface VerifyOTPRequest {
  mobileNumber: string;
  otp: string;
  deviceId: string;
}

interface RefreshTokenRequest {
  token: string;
}

interface LogoutRequest {
  token: string;
}

class AuthAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = this.createClient();
  }

  private createClient(): AxiosInstance {
    const axiosClient = axios.create({
      baseURL: config.API_BASE_URL,
      timeout: config.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    axiosClient.interceptors.request.use(
      (requestConfig) => {
        logger.debug(`API Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
        return requestConfig;
      },
      (error) => {
        logger.error('API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    axiosClient.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('API Response Error', error);
        return Promise.reject(error);
      }
    );

    return axiosClient;
  }

  /**
   * Send OTP to mobile number
   * POST /auth/send-otp
   */
  async sendOTP(mobileNumber: string): Promise<OTPResponse> {
    try {
      const request: SendOTPRequest = { mobileNumber };
      const response = await this.client.post<any>('/auth/send-otp', request);
      const data = response.data;
      // Backend returns expiresIn (seconds), map to expiresAt Date expected by frontend
      return {
        success: data.success,
        message: data.message,
        attemptsRemaining: data.attemptsRemaining ?? 3,
        expiresAt: new Date(Date.now() + (data.expiresIn ?? 600) * 1000),
        devOtp: data.devOtp,
        smsActive: data.smsActive,
      };
    } catch (error) {
      logger.error('Send OTP API error', error);
      throw error;
    }
  }

  /**
   * Verify OTP and authenticate user
   * POST /auth/verify-otp
   */
  async verifyOTP(
    mobileNumber: string,
    otp: string,
    deviceId: string
  ): Promise<{ success: boolean; authToken?: AuthToken; message: string }> {
    try {
      const request: VerifyOTPRequest = { mobileNumber, otp, deviceId };
      const response = await this.client.post('/auth/verify-otp', request);
      const data = response.data;

      if (data.success && data.authToken) {
        return {
          success: true,
          message: data.message,
          authToken: {
            token: data.authToken.token,
            userId: `user_${mobileNumber}`, // backend doesn't return userId, derive it
            expiresAt: new Date(data.authToken.expiresAt),
          },
        };
      }

      return { success: false, message: data.message || 'Verification failed' };
    } catch (error) {
      logger.error('Verify OTP API error', error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   * POST /auth/refresh-token
   */
  async refreshToken(token: string): Promise<AuthToken> {
    try {
      const request: RefreshTokenRequest = { token };
      const response = await this.client.post<AuthToken>('/auth/refresh-token', request);
      return response.data;
    } catch (error) {
      logger.error('Refresh token API error', error);
      throw error;
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  async logout(token: string): Promise<void> {
    try {
      const request: LogoutRequest = { token };
      await this.client.post('/auth/logout', request);
    } catch (error) {
      logger.error('Logout API error', error);
      throw error;
    }
  }
}

export const authAPI = new AuthAPI();
