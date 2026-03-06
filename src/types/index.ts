/**
 * Global type definitions for the Farmer Decision Support Platform
 */

// Authentication types
export interface AuthToken {
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface OTPResponse {
  success: boolean;
  expiresAt: Date;
  attemptsRemaining: number;
}

// Common types
export type Language = 
  | 'hi' // Hindi
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'kn' // Kannada
  | 'mr' // Marathi
  | 'bn' // Bengali
  | 'gu' // Gujarati
  | 'pa' // Punjabi
  | 'ml' // Malayalam
  | 'or' // Odia
  | 'en'; // English

export type AlertType = 
  | 'sowing'
  | 'fertilizer'
  | 'irrigation'
  | 'pest_control'
  | 'harvest'
  | 'weather'
  | 'scheme'
  | 'market_price';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type RiskLevel = 'low' | 'medium' | 'high';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

// Re-export all types
export * from './auth.types';
export * from './profile.types';
export * from './weather.types';
export * from './market.types';
export * from './soil.types';
export * from './recommendation.types';
export * from './sync.types';
export * from './scheme.types';
export * from './training.types';
export * from './alert.types';
export * from './voice.types';
export * from './translation.types';
export * from './dashboard.types';
