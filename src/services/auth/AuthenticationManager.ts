/**
 * Authentication Manager
 * Handles complete authentication flow including OTP and session management
 * Requirements: 1.1, 1.2, 1.3, 15.6
 */

import { AuthToken, OTPResponse } from '../../types/auth.types';
import { otpService } from './OTPService';
import { sessionManager } from './SessionManager';
import { authAPI } from '../api/authApi';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { ERROR_MESSAGES } from '../../config/constants';

export interface LoginResult {
  success: boolean;
  authToken?: AuthToken;
  message: string;
}

class AuthenticationManager {
  /**
   * Step 1: Send OTP to user's mobile number
   * Property 1: OTP Generation and Delivery
   * @param mobileNumber - User's mobile number
   * @returns OTP response with status
   */
  async sendOTP(mobileNumber: string): Promise<OTPResponse> {
    try {
      logger.info(`Sending OTP to ${mobileNumber}`);
      if (config.ENABLE_API) {
        return await authAPI.sendOTP(mobileNumber);
      }
      return await otpService.sendOTP(mobileNumber);
    } catch (error) {
      logger.error('Failed to send OTP', error);
      return {
        success: false,
        expiresAt: new Date(),
        attemptsRemaining: 0,
        message: ERROR_MESSAGES.AUTH_FAILED,
      };
    }
  }

  /**
   * Step 2: Verify OTP and create session
   * Property 2: Valid OTP Authentication
   * Property 3: Invalid OTP Handling
   * @param mobileNumber - User's mobile number
   * @param otp - OTP entered by user
   * @param deviceId - Device identifier
   * @returns Login result with auth token if successful
   */
  async verifyOTP(mobileNumber: string, otp: string, deviceId: string): Promise<LoginResult> {
    try {
      if (config.ENABLE_API) {
        return await authAPI.verifyOTP(mobileNumber, otp, deviceId);
      }

      // Local OTP validation (offline / dev mode)
      const validation = otpService.validateOTP(mobileNumber, otp);

      if (!validation.isValid) {
        let message: string;

        if (validation.isExpired) {
          message = ERROR_MESSAGES.OTP_EXPIRED;
        } else if (validation.isLocked) {
          message = 'Too many failed attempts. Please request a new OTP.';
        } else if (validation.attemptsRemaining > 0) {
          message = `Invalid OTP. ${validation.attemptsRemaining} attempts remaining.`;
        } else {
          message = ERROR_MESSAGES.OTP_INVALID;
        }

        logger.warn(`OTP verification failed for ${mobileNumber}: ${message}`);

        return {
          success: false,
          message,
        };
      }

      // OTP is valid - create user session
      // In a real app, you would:
      // 1. Check if user exists in database
      // 2. Create user if first-time registration
      // 3. Get userId from database

      // For now, use mobile number as userId (mock)
      const userId = `user_${mobileNumber}`;

      const authToken = sessionManager.createSession(userId, deviceId);

      // Clear OTP after successful authentication
      otpService.clearOTP(mobileNumber);

      logger.info(`User ${userId} authenticated successfully`);

      return {
        success: true,
        authToken,
        message: 'Authentication successful',
      };
    } catch (error) {
      logger.error('OTP verification error', error);
      return {
        success: false,
        message: ERROR_MESSAGES.AUTH_FAILED,
      };
    }
  }

  /**
   * Logout user and invalidate session
   * @param token - Session token
   */
  async logout(token: string): Promise<void> {
    try {
      sessionManager.invalidateSession(token);
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout error', error);
    }
  }

  /**
   * Refresh authentication token
   * @param token - Current session token
   * @returns New auth token if successful, null otherwise
   */
  async refreshToken(token: string): Promise<AuthToken | null> {
    try {
      const newToken = sessionManager.refreshSession(token);

      if (newToken) {
        logger.info('Token refreshed successfully');
      } else {
        logger.warn('Token refresh failed - invalid or expired session');
      }

      return newToken;
    } catch (error) {
      logger.error('Token refresh error', error);
      return null;
    }
  }

  /**
   * Validate current session
   * @param token - Session token
   * @returns true if session is valid, false otherwise
   */
  validateSession(token: string): boolean {
    const session = sessionManager.validateSession(token);
    return session !== null;
  }

  /**
   * Get user ID from session token
   * @param token - Session token
   * @returns User ID if session is valid, null otherwise
   */
  getUserIdFromToken(token: string): string | null {
    const session = sessionManager.validateSession(token);
    return session?.userId || null;
  }
}

export const authenticationManager = new AuthenticationManager();
