/**
 * Translation Service
 * Manages translations for all supported languages
 */

import {
  LanguageCode,
  TranslationContent,
  TranslationKey,
  TranslationCategory,
} from '../../types/translation.types';
import { SUPPORTED_LANGUAGES } from '../../config/constants';
import TranslationStorage from './TranslationStorage.ts';

class TranslationService {
  private currentLanguage: LanguageCode = 'hi';
  private translations: Map<LanguageCode, Map<TranslationCategory, TranslationContent>> = new Map();
  private storage: TranslationStorage;
  private fallbackLanguage: LanguageCode = 'hi';

  constructor(storage: TranslationStorage) {
    this.storage = storage;
  }

  /**
   * Initialize translation service
   */
  async initialize(language: LanguageCode = 'hi'): Promise<void> {
    this.currentLanguage = language;
    await this.loadTranslations(language);
  }

  /**
   * Load translations for a specific language
   */
  private async loadTranslations(language: LanguageCode): Promise<void> {
    try {
      const categories = Object.values(TranslationCategory);
      const languageTranslations = new Map<TranslationCategory, TranslationContent>();

      for (const category of categories) {
        const content = await this.storage.getTranslations(language, category);
        if (content) {
          languageTranslations.set(category, content);
        }
      }

      this.translations.set(language, languageTranslations);
    } catch (error) {
      console.error(`Failed to load translations for ${language}:`, error);
      // Load fallback language if current language fails
      if (language !== this.fallbackLanguage) {
        await this.loadTranslations(this.fallbackLanguage);
      }
    }
  }

  /**
   * Get translation for a key
   */
  translate(key: TranslationKey, params?: { [key: string]: string | number }): string {
    const translation = this.getTranslation(key, this.currentLanguage);

    if (!translation) {
      // Try fallback language
      const fallbackTranslation = this.getTranslation(key, this.fallbackLanguage);
      if (fallbackTranslation) {
        return this.interpolate(fallbackTranslation, params);
      }
      // Return key if no translation found
      return key;
    }

    return this.interpolate(translation, params);
  }

  /**
   * Get translation for a specific language
   */
  translateFor(
    key: TranslationKey,
    language: LanguageCode,
    params?: { [key: string]: string | number }
  ): string {
    const translation = this.getTranslation(key, language);

    if (!translation) {
      return key;
    }

    return this.interpolate(translation, params);
  }

  /**
   * Get translation from loaded translations
   * Keys are like "weather.forecast" - first segment is the top-level JSON key
   */
  private getTranslation(key: TranslationKey, language: LanguageCode): string | null {
    const languageTranslations = this.translations.get(language);
    if (!languageTranslations) {
      return null;
    }

    // The entire JSON is stored under TranslationCategory.UI
    const uiContent = languageTranslations.get(TranslationCategory.UI);
    if (!uiContent) {
      return null;
    }

    return this.getNestedValue(uiContent, key);
  }

  /**
   * Get nested value from translation content
   */
  private getNestedValue(obj: TranslationContent, path: string): string | null {
    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  /**
   * Interpolate parameters into translation string
   */
  private interpolate(text: string, params?: { [key: string]: string | number }): string {
    if (!params) {
      return text;
    }

    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Set current language
   */
  async setLanguage(language: LanguageCode): Promise<void> {
    if (!this.isLanguageSupported(language)) {
      throw new Error(`Language ${language} is not supported`);
    }

    this.currentLanguage = language;

    // Load translations if not already loaded
    if (!this.translations.has(language)) {
      await this.loadTranslations(language);
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): language is LanguageCode {
    return SUPPORTED_LANGUAGES.some((lang) => lang.code === language);
  }

  /**
   * Get language info
   */
  getLanguageInfo(code: LanguageCode) {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  }

  /**
   * Preload translations for multiple languages
   */
  async preloadLanguages(languages: LanguageCode[]): Promise<void> {
    const loadPromises = languages.map((lang) => {
      if (!this.translations.has(lang)) {
        return this.loadTranslations(lang);
      }
      return Promise.resolve();
    });

    await Promise.all(loadPromises);
  }

  /**
   * Clear cached translations
   */
  clearCache(): void {
    this.translations.clear();
  }

  /**
   * Reload translations for current language
   */
  async reload(): Promise<void> {
    this.translations.delete(this.currentLanguage);
    await this.loadTranslations(this.currentLanguage);
  }

  /**
   * Check if translations are loaded for a language
   */
  isLanguageLoaded(language: LanguageCode): boolean {
    return this.translations.has(language);
  }

  /**
   * Get translation statistics
   */
  getStatistics() {
    const loadedLanguages = Array.from(this.translations.keys());
    const totalCategories = Object.values(TranslationCategory).length;

    return {
      currentLanguage: this.currentLanguage,
      loadedLanguages,
      totalLanguages: SUPPORTED_LANGUAGES.length,
      totalCategories,
    };
  }
}

export default TranslationService;
