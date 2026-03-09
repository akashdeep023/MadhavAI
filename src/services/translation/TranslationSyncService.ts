/**
 * Translation Sync Service
 * Syncs translations from remote and stores locally for offline access
 */

import {
  LanguageCode,
  TranslationCategory,
  TranslationContent,
} from '../../types/translation.types';
import TranslationStorage from './TranslationStorage';
import TranslationContentManager from './TranslationContentManager';

interface RemoteTranslationSource {
  fetchTranslations(
    language: LanguageCode,
    category: TranslationCategory
  ): Promise<{content: TranslationContent; version: string} | null>;
}

interface SyncResult {
  success: boolean;
  syncedLanguages: LanguageCode[];
  syncedCategories: TranslationCategory[];
  errors: string[];
  timestamp: Date;
}

class TranslationSyncService {
  private storage: TranslationStorage;
  // @ts-expect-error - Reserved for future use
  private _contentManager: TranslationContentManager;
  private remoteSource?: RemoteTranslationSource;
  private isSyncing: boolean = false;

  constructor(
    storage: TranslationStorage,
    contentManager: TranslationContentManager,
    remoteSource?: RemoteTranslationSource
  ) {
    this.storage = storage;
    this._contentManager = contentManager;
    this.remoteSource = remoteSource;
  }

  /**
   * Sync all translations from remote
   */
  async syncAll(languages: LanguageCode[]): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;

    const result: SyncResult = {
      success: true,
      syncedLanguages: [],
      syncedCategories: [],
      errors: [],
      timestamp: new Date(),
    };

    try {
      const categories = Object.values(TranslationCategory);

      for (const language of languages) {
        for (const category of categories) {
          try {
            const synced = await this.syncTranslation(language, category);
            
            if (synced) {
              if (!result.syncedLanguages.includes(language)) {
                result.syncedLanguages.push(language);
              }
              if (!result.syncedCategories.includes(category)) {
                result.syncedCategories.push(category);
              }
            }
          } catch (error) {
            result.success = false;
            result.errors.push(
              `Failed to sync ${language}/${category}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync specific translation
   */
  private async syncTranslation(
    language: LanguageCode,
    category: TranslationCategory
  ): Promise<boolean> {
    if (!this.remoteSource) {
      return false;
    }

    try {
      const remote = await this.remoteSource.fetchTranslations(language, category);

      if (!remote) {
        return false;
      }

      // Check if update is needed
      const localVersion = await this.storage.getVersion(language, category);

      if (localVersion === remote.version) {
        return false; // Already up to date
      }

      // Store updated translation
      await this.storage.storeTranslations(
        language,
        category,
        remote.content,
        remote.version
      );

      return true;
    } catch (error) {
      console.error(`Failed to sync ${language}/${category}:`, error);
      throw error;
    }
  }

  /**
   * Sync specific language
   */
  async syncLanguage(language: LanguageCode): Promise<SyncResult> {
    return this.syncAll([language]);
  }

  /**
   * Sync specific category for all languages
   */
  async syncCategory(
    category: TranslationCategory,
    languages: LanguageCode[]
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;

    const result: SyncResult = {
      success: true,
      syncedLanguages: [],
      syncedCategories: [category],
      errors: [],
      timestamp: new Date(),
    };

    try {
      for (const language of languages) {
        try {
          const synced = await this.syncTranslation(language, category);
          
          if (synced && !result.syncedLanguages.includes(language)) {
            result.syncedLanguages.push(language);
          }
        } catch (error) {
          result.success = false;
          result.errors.push(
            `Failed to sync ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync time for a language and category
   */
  async getLastSyncTime(
    language: LanguageCode,
    category: TranslationCategory
  ): Promise<Date | null> {
    return this.storage.getLastUpdateTime(language, category);
  }

  /**
   * Preload translations for offline use
   */
  async preloadForOffline(languages: LanguageCode[]): Promise<void> {
    // Sync all translations for specified languages
    await this.syncAll(languages);
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics() {
    const stats = await this.storage.getStatistics();
    
    return {
      storedLanguages: stats.length,
      totalSize: stats.reduce((sum, stat) => sum + stat.total_size, 0),
      details: stats,
    };
  }
}

export default TranslationSyncService;
