/**
 * Translation and Multilanguage Support Types
 */

/**
 * Supported language codes (ISO 639-1)
 */
export type LanguageCode = 'hi' | 'ta' | 'te' | 'kn' | 'mr' | 'bn' | 'gu' | 'pa' | 'ml' | 'or' | 'en';

/**
 * Language information
 */
export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  voiceCode: string; // For voice interface (e.g., 'hi-IN')
}

/**
 * Translation key paths for type safety
 */
export type TranslationKey = string;

/**
 * Translation content structure
 */
export interface TranslationContent {
  [key: string]: string | TranslationContent;
}

/**
 * Translation bundle for a specific language
 */
export interface TranslationBundle {
  language: LanguageCode;
  version: string;
  translations: TranslationContent;
  lastUpdated: Date;
}

/**
 * Translation metadata
 */
export interface TranslationMetadata {
  key: string;
  languages: LanguageCode[];
  category: TranslationCategory;
  lastUpdated: Date;
}

/**
 * Translation categories
 */
export enum TranslationCategory {
  UI = 'ui',
  ALERTS = 'alerts',
  RECOMMENDATIONS = 'recommendations',
  SCHEMES = 'schemes',
  TRAINING = 'training',
  WEATHER = 'weather',
  MARKET = 'market',
  SOIL = 'soil',
  ERRORS = 'errors',
  COMMON = 'common',
}

/**
 * Translation validation result
 */
export interface TranslationValidationResult {
  isValid: boolean;
  missingKeys: string[];
  missingLanguages: LanguageCode[];
  errors: string[];
}

/**
 * Translation storage entry
 */
export interface TranslationStorageEntry {
  language: LanguageCode;
  category: TranslationCategory;
  content: TranslationContent;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Translation update request
 */
export interface TranslationUpdateRequest {
  category: TranslationCategory;
  key: string;
  translations: {
    [language in LanguageCode]?: string;
  };
}

/**
 * Language preference update
 */
export interface LanguagePreferenceUpdate {
  userId: string;
  languageCode: LanguageCode;
  timestamp: Date;
}
