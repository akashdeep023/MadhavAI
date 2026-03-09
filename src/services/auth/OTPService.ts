/**
 * OTP Service
 * Handles OTP generation, validation, and SMS delivery
 * Requirements: 1.1, 1.3, 15.5
 */

import { OTPResponse, OTPRecord, OTPValidationResult } from '../../types/auth.types';
import { OTP_EXPIRATION_MS } from '../../config/constants';
import { logger } from '../../utils/logger';

const MAX_ATTEMPTS = 3;

class OTPService {
  private otpStore: Map<string, OTPRecord> = new Map();

  /**
   * Generate a cryptographically secure 6-digit OTP
   * Property 56: OTP Security - Uses secure random generation
   */
  private generateSecureOTP(): string {
    // Use crypto.getRandomValues for secure random number generation
    const array = new Uint32Array(1);
    // Check if crypto API is available (works in both browser and React Native)
     
    if (
      typeof (globalThis as any).crypto !== 'undefined' &&
      (globalThis as any).crypto.getRandomValues
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).crypto.getRandomValues(array);
      const otp = (array[0] % 900000) + 100000; // Ensures 6-digit number
      return otp.toString();
    }

    // Fallback for environments without crypto (should not happen in production)
    logger.warn('Crypto API not available, using Math.random fallback');
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate and send OTP to mobile number
   * Property 1: OTP Generation and Delivery
   * @param mobileNumber - User's mobile number
   * @returns OTPResponse with success status and expiration time
   */
  async sendOTP(mobileNumber: string): Promise<OTPResponse> {
    try {
      // Validate mobile number format (Indian mobile numbers: 10 digits)
      if (!this.isValidMobileNumber(mobileNumber)) {
        return {
          success: false,
          expiresAt: new Date(),
          attemptsRemaining: 0,
          message: 'Invalid mobile number format',
        };
      }

      // Generate secure OTP
      const otp = this.generateSecureOTP();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + OTP_EXPIRATION_MS);

      // Store OTP record
      const otpRecord: OTPRecord = {
        mobileNumber,
        otp,
        createdAt: now,
        expiresAt,
        attempts: 0,
        isUsed: false,
      };

      this.otpStore.set(mobileNumber, otpRecord);

      // Send OTP via SMS gateway
      await this.sendSMS(mobileNumber, otp);

      logger.info(`OTP generated for ${mobileNumber}`);

      return {
        success: true,
        expiresAt,
        attemptsRemaining: MAX_ATTEMPTS,
        message: 'OTP sent successfully',
      };
    } catch (error) {
      logger.error('Failed to send OTP', error);
      return {
        success: false,
        expiresAt: new Date(),
        attemptsRemaining: 0,
        message: 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Validate OTP entered by user
   * Property 2: Valid OTP Authentication
   * Property 3: Invalid OTP Handling
   * @param mobileNumber - User's mobile number
   * @param otp - OTP entered by user
   * @returns Validation result with status and remaining attempts
   */
  validateOTP(mobileNumber: string, otp: string): OTPValidationResult {
    const otpRecord = this.otpStore.get(mobileNumber);

    // No OTP found for this mobile number
    if (!otpRecord) {
      return {
        isValid: false,
        attemptsRemaining: 0,
        isExpired: false,
        isLocked: false,
      };
    }

    // Check if OTP is already used
    if (otpRecord.isUsed) {
      return {
        isValid: false,
        attemptsRemaining: 0,
        isExpired: false,
        isLocked: true,
      };
    }

    // Check if OTP is expired (5 minutes)
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      return {
        isValid: false,
        attemptsRemaining: MAX_ATTEMPTS - otpRecord.attempts,
        isExpired: true,
        isLocked: false,
      };
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      return {
        isValid: false,
        attemptsRemaining: 0,
        isExpired: false,
        isLocked: true,
      };
    }

    // Validate OTP
    if (otpRecord.otp === otp) {
      // Mark OTP as used
      otpRecord.isUsed = true;
      this.otpStore.set(mobileNumber, otpRecord);

      logger.info(`OTP validated successfully for ${mobileNumber}`);

      return {
        isValid: true,
        attemptsRemaining: MAX_ATTEMPTS - otpRecord.attempts,
        isExpired: false,
        isLocked: false,
      };
    }

    // Invalid OTP - increment attempts
    otpRecord.attempts += 1;
    this.otpStore.set(mobileNumber, otpRecord);

    const attemptsRemaining = MAX_ATTEMPTS - otpRecord.attempts;
    const isLocked = attemptsRemaining === 0;

    logger.warn(
      `Invalid OTP attempt for ${mobileNumber}. Attempts remaining: ${attemptsRemaining}`
    );

    return {
      isValid: false,
      attemptsRemaining,
      isExpired: false,
      isLocked,
    };
  }

  /**
   * Clear OTP record for a mobile number
   * @param mobileNumber - User's mobile number
   */
  clearOTP(mobileNumber: string): void {
    this.otpStore.delete(mobileNumber);
    logger.info(`OTP cleared for ${mobileNumber}`);
  }

  /**
   * Validate Indian mobile number format
   * @param mobileNumber - Mobile number to validate
   * @returns true if valid, false otherwise
   */
  private isValidMobileNumber(mobileNumber: string): boolean {
    // Indian mobile numbers: 10 digits, starting with 6-9
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(mobileNumber);
  }

  /**
   * Send SMS via gateway (mock implementation)
   * In production, integrate with SMS gateway like AWS SNS, Twilio, etc.
   * @param mobileNumber - Recipient mobile number
   * @param otp - OTP to send
   */
  private async sendSMS(mobileNumber: string, otp: string): Promise<void> {
    // Mock SMS sending - In production, integrate with actual SMS gateway
    logger.info(`[SMS Gateway] Sending OTP ${otp} to ${mobileNumber}`);

    // Simulate network delay
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));

    // In production, use AWS SNS or similar service:
    // const sns = new AWS.SNS();
    // await sns.publish({
    //   PhoneNumber: `+91${mobileNumber}`,
    //   Message: `Your MADHAV AI verification code is: ${otp}. Valid for 5 minutes.`,
    // }).promise();
  }

  /**
   * Get OTP record for testing purposes
   * Should be removed or protected in production
   */
  getOTPForTesting(mobileNumber: string): string | undefined {
    const record = this.otpStore.get(mobileNumber);
    return record?.otp;
  }
}

export const otpService = new OTPService();
