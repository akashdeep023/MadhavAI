/**
 * Environment configuration
 * Manages environment-specific settings for development, staging, and production
 * Loads secrets from .env file using react-native-config
 */

import Config from 'react-native-config';

export type Environment = 'development' | 'staging' | 'production';

interface EnvConfig {
  API_BASE_URL: string;
  API_TIMEOUT: number;
  ENABLE_LOGGING: boolean;
  ENABLE_API: boolean; // Set to false for local-only mode, true when backend is ready
  STORAGE_LIMIT_MB: number;
  SYNC_INTERVAL_MS: number;
  MAX_RETRY_ATTEMPTS: number;
  OTA_API_BASE_URL: string; // For OTA updates, A/B testing, version checks
}

const ENV: Environment = (__DEV__ ? 'development' : 'production') as Environment;

// Helper to get env variable with fallback
const getEnvVar = (key: string, fallback: string): string => {
  return Config[key] || fallback;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const value = Config[key];
  return value ? parseInt(value, 10) : fallback;
};

const getEnvBoolean = (key: string, fallback: boolean): boolean => {
  const value = Config[key];
  return value ? value.toLowerCase() === 'true' : fallback;
};

const configs: Record<Environment, EnvConfig> = {
  development: {
    API_BASE_URL: getEnvVar('API_BASE_URL', 'http://localhost:3000/api'),
    API_TIMEOUT: getEnvNumber('API_TIMEOUT', 30000),
    ENABLE_LOGGING: true,
    ENABLE_API: getEnvBoolean('ENABLE_API', false), // Set to true when backend is available
    STORAGE_LIMIT_MB: getEnvNumber('STORAGE_LIMIT_MB', 500),
    SYNC_INTERVAL_MS: getEnvNumber('SYNC_INTERVAL_MS', 60000), // 1 minute for dev
    MAX_RETRY_ATTEMPTS: getEnvNumber('MAX_RETRY_ATTEMPTS', 3),
    OTA_API_BASE_URL: getEnvVar('OTA_API_BASE_URL', 'https://api.madhavai.app'),
  },
  staging: {
    API_BASE_URL: getEnvVar('API_BASE_URL', 'https://staging-api.madhavai.com/api'),
    API_TIMEOUT: getEnvNumber('API_TIMEOUT', 30000),
    ENABLE_LOGGING: true,
    ENABLE_API: getEnvBoolean('ENABLE_API', true), // API available in staging
    STORAGE_LIMIT_MB: getEnvNumber('STORAGE_LIMIT_MB', 500),
    SYNC_INTERVAL_MS: getEnvNumber('SYNC_INTERVAL_MS', 300000), // 5 minutes
    MAX_RETRY_ATTEMPTS: getEnvNumber('MAX_RETRY_ATTEMPTS', 5),
    OTA_API_BASE_URL: getEnvVar('OTA_API_BASE_URL', 'https://staging-api.madhavai.app'),
  },
  production: {
    API_BASE_URL: getEnvVar(
      'API_BASE_URL',
      'https://1s6y4bwfaf.execute-api.ap-south-1.amazonaws.com/production'
    ),
    API_TIMEOUT: getEnvNumber('API_TIMEOUT', 30000),
    ENABLE_LOGGING: false,
    ENABLE_API: getEnvBoolean('ENABLE_API', true), // API available in production
    STORAGE_LIMIT_MB: getEnvNumber('STORAGE_LIMIT_MB', 500),
    SYNC_INTERVAL_MS: getEnvNumber('SYNC_INTERVAL_MS', 360000), // 6 minutes
    MAX_RETRY_ATTEMPTS: getEnvNumber('MAX_RETRY_ATTEMPTS', 5),
    OTA_API_BASE_URL: getEnvVar('OTA_API_BASE_URL', 'https://api.madhavai.app'),
  },
};

export const config: EnvConfig = configs[ENV];
export const environment: Environment = ENV;
