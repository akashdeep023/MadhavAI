/**
 * Translation Loader
 * Loads translation files and initializes translation storage
 */

import {
  LanguageCode,
  TranslationCategory,
  TranslationContent,
} from '../../types/translation.types';
import TranslationStorage from './TranslationStorage';
import TranslationContentManager from './TranslationContentManager';

import enTranslations from '../../locales/en.json';
import hiTranslations from '../../locales/hi.json';
import taTranslations from '../../locales/ta.json';
import teTranslations from '../../locales/te.json';
import knTranslations from '../../locales/kn.json';
import mrTranslations from '../../locales/mr.json';
import bnTranslations from '../../locales/bn.json';
import guTranslations from '../../locales/gu.json';
import paTranslations from '../../locales/pa.json';
import mlTranslations from '../../locales/ml.json';
import orTranslations from '../../locales/or.json';

class TranslationLoader {
  private storage: TranslationStorage;
  private contentManager: TranslationContentManager;

  constructor(storage: TranslationStorage, contentManager: TranslationContentManager) {
    this.storage = storage;
    this.contentManager = contentManager;
  }

  /**
   * Load all translations from bundled files
   */
  async loadBundledTranslations(): Promise<void> {
    // Load UI translations
    await this.loadUITranslations();

    // Additional categories can be loaded here
    // await this.loadAlertTranslations();
    // await this.loadRecommendationTranslations();
  }

  /**
   * Load UI translations for all languages
   */
  private async loadUITranslations(): Promise<void> {
    const uiTranslations: { [key in LanguageCode]?: TranslationContent } = {
      en: enTranslations,
      hi: hiTranslations,
      ta: taTranslations,
      te: teTranslations,
      kn: knTranslations,
      mr: mrTranslations,
      bn: bnTranslations,
      gu: guTranslations,
      pa: paTranslations,
      ml: mlTranslations,
      or: orTranslations,
    };

    await this.contentManager.bulkImport(TranslationCategory.UI, uiTranslations, '1.0.0');
  }

  /**
   * Check if translations need update
   */
  async needsUpdate(
    language: LanguageCode,
    category: TranslationCategory,
    version: string
  ): Promise<boolean> {
    const currentVersion = await this.storage.getVersion(language, category);
    return !currentVersion || currentVersion !== version;
  }
}

export default TranslationLoader;
