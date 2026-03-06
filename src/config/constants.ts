/**
 * Application constants
 */

// Storage limits
export const STORAGE_LIMIT_MB = 500;
export const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024;

// Timeouts
export const OTP_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
export const SESSION_TIMEOUT_DAYS = 30;
export const API_TIMEOUT_MS = 30000; // 30 seconds

// Retry configuration
export const MAX_RETRY_ATTEMPTS = 5;
export const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

// Sync configuration
export const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const WEATHER_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const PRICE_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cache durations
export const WEATHER_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PRICE_CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Alert configuration
export const ALERT_ADVANCE_DAYS = [7, 3, 1]; // Days before deadline to send alerts
export const SEVERE_WEATHER_ALERT_HOURS = 24; // Hours before severe weather

// Recommendation configuration
export const RECOMMENDATION_TIMEOUT_MS = 5000; // 5 seconds
export const NEARBY_MANDI_RADIUS_KM = 50;
export const PRICE_CHANGE_THRESHOLD_PERCENT = 15;

// Content configuration
export const LESSON_MIN_DURATION_SECONDS = 3 * 60; // 3 minutes
export const LESSON_MAX_DURATION_SECONDS = 5 * 60; // 5 minutes
export const TRAINING_CONTENT_SYNC_HOURS = 24;
export const SCHEME_UPDATE_SYNC_HOURS = 12;

// Soil health
export const SOIL_TEST_VALIDITY_YEARS = 2;

// Dashboard configuration
export const DASHBOARD_LOAD_TIMEOUT_MS = 2000; // 2 seconds
export const UPCOMING_ALERTS_DAYS = 7;

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceCode: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceCode: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceCode: 'kn-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', voiceCode: 'mr-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', voiceCode: 'bn-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', voiceCode: 'gu-IN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', voiceCode: 'pa-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', voiceCode: 'ml-IN' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', voiceCode: 'or-IN' },
  { code: 'en', name: 'English', nativeName: 'English', voiceCode: 'hi-IN' },
] as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Using cached data.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  OTP_INVALID: 'Invalid OTP. Please check and try again.',
  STORAGE_FULL: 'Storage limit reached. Clearing old data.',
  SYNC_FAILED: 'Synchronization failed. Will retry automatically.',
  API_TIMEOUT: 'Request timed out. Please try again.',
  INSUFFICIENT_DATA: 'Insufficient data for recommendations. Please provide more information.',
} as const;
