/**
 * Translation Content Manager
 * Manages translation content updates and validation
 */

import {
  LanguageCode,
  TranslationContent,
  TranslationCategory,
  TranslationValidationResult,
  TranslationUpdateRequest,
} from '../../types/translation.types';
import { SUPPORTED_LANGUAGES } from '../../config/constants';
import TranslationStorage from './TranslationStorage';

class TranslationContentManager {
  private storage: TranslationStorage;
  private requiredLanguages: LanguageCode[];

  constructor(storage: TranslationStorage) {
    this.storage = storage;
    this.requiredLanguages = SUPPORTED_LANGUAGES.map((lang) => lang.code as LanguageCode);
  }

  /**
   * Validate that all required translations exist
   */
  async validateTranslations(
    category: TranslationCategory,
    baseContent: TranslationContent
  ): Promise<TranslationValidationResult> {
    const result: TranslationValidationResult = {
      isValid: true,
      missingKeys: [],
      missingLanguages: [],
      errors: [],
    };

    // Get all keys from base content
    const allKeys = this.extractKeys(baseContent);

    // Check each required language
    for (const language of this.requiredLanguages) {
      const hasTranslations = await this.storage.hasTranslations(language, category);

      if (!hasTranslations) {
        result.isValid = false;
        result.missingLanguages.push(language);
        result.errors.push(`Missing translations for language: ${language}`);
        continue;
      }

      // Get translations for this language
      const translations = await this.storage.getTranslations(language, category);

      if (!translations) {
        result.isValid = false;
        result.missingLanguages.push(language);
        continue;
      }

      // Check if all keys exist
      const languageKeys = this.extractKeys(translations);
      const missingKeys = allKeys.filter((key) => !languageKeys.includes(key));

      if (missingKeys.length > 0) {
        result.isValid = false;
        result.missingKeys.push(...missingKeys.map((key) => `${language}.${key}`));
        result.errors.push(`Language ${language} is missing keys: ${missingKeys.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * Extract all keys from translation content
   */
  private extractKeys(content: TranslationContent, prefix: string = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(content)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        keys.push(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        keys.push(...this.extractKeys(value as TranslationContent, fullKey));
      }
    }

    return keys;
  }

  /**
   * Update translations for a specific key across all languages
   */
  async updateTranslation(request: TranslationUpdateRequest): Promise<void> {
    const { category, key, translations } = request;

    // Validate that all required languages are provided
    const providedLanguages = Object.keys(translations) as LanguageCode[];
    const missingLanguages = this.requiredLanguages.filter(
      (lang) => !providedLanguages.includes(lang)
    );

    if (missingLanguages.length > 0) {
      throw new Error(`Missing translations for languages: ${missingLanguages.join(', ')}`);
    }

    // Update each language
    for (const [language, translation] of Object.entries(translations)) {
      if (!translation) continue;

      const existingContent = await this.storage.getTranslations(
        language as LanguageCode,
        category
      );

      const updatedContent = this.setNestedValue(existingContent || {}, key, translation);

      await this.storage.storeTranslations(language as LanguageCode, category, updatedContent);
    }
  }

  /**
   * Set nested value in translation content
   */
  private setNestedValue(obj: TranslationContent, path: string, value: string): TranslationContent {
    const keys = path.split('.');
    const result = { ...obj };
    let current: any = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      } else {
        current[key] = { ...current[key] };
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  }

  /**
   * Bulk import translations for a category
   */
  async bulkImport(
    category: TranslationCategory,
    translations: { [language in LanguageCode]?: TranslationContent },
    version: string = '1.0.0'
  ): Promise<void> {
    const importPromises: Promise<void>[] = [];

    for (const [language, content] of Object.entries(translations)) {
      if (content) {
        importPromises.push(
          this.storage.storeTranslations(language as LanguageCode, category, content, version)
        );
      }
    }

    await Promise.all(importPromises);
  }

  /**
   * Export translations for a category
   */
  async exportTranslations(
    category: TranslationCategory
  ): Promise<{ [language in LanguageCode]?: TranslationContent }> {
    const exported: { [language in LanguageCode]?: TranslationContent } = {};

    for (const language of this.requiredLanguages) {
      const content = await this.storage.getTranslations(language, category);
      if (content) {
        exported[language] = content;
      }
    }

    return exported;
  }

  /**
   * Check if content is ready for release
   */
  async isReadyForRelease(category: TranslationCategory): Promise<boolean> {
    // Check if all required languages have translations
    for (const language of this.requiredLanguages) {
      const hasTranslations = await this.storage.hasTranslations(language, category);
      if (!hasTranslations) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get translation coverage statistics
   */
  async getCoverageStatistics(category: TranslationCategory) {
    const stats = {
      category,
      totalLanguages: this.requiredLanguages.length,
      translatedLanguages: 0,
      missingLanguages: [] as LanguageCode[],
      coverage: 0,
    };

    for (const language of this.requiredLanguages) {
      const hasTranslations = await this.storage.hasTranslations(language, category);
      if (hasTranslations) {
        stats.translatedLanguages++;
      } else {
        stats.missingLanguages.push(language);
      }
    }

    stats.coverage = (stats.translatedLanguages / stats.totalLanguages) * 100;

    return stats;
  }

  /**
   * Sync translations from remote source
   */
  async syncFromRemote(
    category: TranslationCategory,
    remoteTranslations: { [language in LanguageCode]?: TranslationContent },
    version: string
  ): Promise<void> {
    // Check versions and update if needed
    for (const [language, content] of Object.entries(remoteTranslations)) {
      if (!content) continue;

      const localVersion = await this.storage.getVersion(language as LanguageCode, category);

      // Update if version is different or doesn't exist
      if (!localVersion || localVersion !== version) {
        await this.storage.storeTranslations(language as LanguageCode, category, content, version);
      }
    }
  }

  /**
   * Get missing translations report
   */
  async getMissingTranslationsReport(): Promise<
    {
      category: TranslationCategory;
      missingLanguages: LanguageCode[];
    }[]
  > {
    const report: {
      category: TranslationCategory;
      missingLanguages: LanguageCode[];
    }[] = [];

    const categories = Object.values(TranslationCategory);

    for (const category of categories) {
      const missingLanguages: LanguageCode[] = [];

      for (const language of this.requiredLanguages) {
        const hasTranslations = await this.storage.hasTranslations(language, category);
        if (!hasTranslations) {
          missingLanguages.push(language);
        }
      }

      if (missingLanguages.length > 0) {
        report.push({ category, missingLanguages });
      }
    }

    return report;
  }

  /**
   * Initialize translation content manager
   */
  async initialize(): Promise<void> {
    await this.preloadLanguages();
  }

  /**
   * Preload all required languages
   */
  private async preloadLanguages(): Promise<void> {
    for (const language of this.requiredLanguages) {
      await this.storage.hasTranslations(language, TranslationCategory.UI);
    }
  }
}

export default TranslationContentManager;
