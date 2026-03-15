/**
 * Authentication related type definitions
 */

export interface OTPResponse {
  success: boolean;
  expiresAt: Date;
  attemptsRemaining: number;
  message?: string;
  devOtp?: string; // Returned by backend when SNS SMS is inactive
  smsActive?: boolean; // false = SMS not sent, show OTP in-app
}

export interface AuthToken {
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface OTPValidationResult {
  isValid: boolean;
  attemptsRemaining: number;
  isExpired: boolean;
  isLocked: boolean;
}

export interface OTPRecord {
  mobileNumber: string;
  otp: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  authToken: string;
  deviceId: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}
