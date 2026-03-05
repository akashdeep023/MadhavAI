/**
 * Global type definitions for the Farmer Decision Support Platform
 */

// User types
export interface Location {
  state: string;
  district: string;
  village: string;
  pincode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface UserProfile {
  userId: string;
  mobileNumber: string;
  name: string;
  location: Location;
  farmSize: number; // in acres
  primaryCrops: string[];
  soilType: string;
  languagePreference: string;
  createdAt: Date;
  updatedAt: Date;
}

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
