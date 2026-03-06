/**
 * Translation Loader
 * Loads translation files and initializes translation storage
 */

import {LanguageCode, TranslationCategory, TranslationContent} from '../../types/translation.types';
import TranslationStorage from './TranslationStorage';
import TranslationContentManager from './TranslationContentManager';

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
    const uiTranslations: {[key in LanguageCode]?: TranslationContent} = {
      hi: require('./translations/ui.hi.json'),
      // Other languages would be loaded here
    };

    await this.contentManager.bulkImport(
      TranslationCategory.UI,
      uiTranslations,
      '1.0.0'
    );
  }

  /**
   * Check if translations need update
   */
  async needsUpdate(language: LanguageCode, category: TranslationCategory, version: string): Promise<boolean> {
    const currentVersion = await this.storage.getVersion(language, category);
    return !currentVersion || currentVersion !== version;
  }
}

export default TranslationLoader;
