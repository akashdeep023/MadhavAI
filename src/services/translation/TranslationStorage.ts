/**
 * Translation Storage
 * Manages local storage of translations for offline access
 */

import {
  LanguageCode,
  TranslationContent,
  TranslationCategory,
} from '../../types/translation.types';
import {DatabaseService} from '../storage/DatabaseService';

class TranslationStorage {
  private db: DatabaseService;
  private readonly TABLE_NAME = 'translations';

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Initialize translation storage
   */
  async initialize(): Promise<void> {
    await this.db.open();
    await this.createTable();
  }

  /**
   * Create translations table
   */
  private async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        language TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        version TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(language, category)
      )
    `;

    await this.db.execute(query);

    // Create indexes for faster lookups
    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_translations_language 
      ON ${this.TABLE_NAME}(language)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_translations_category 
      ON ${this.TABLE_NAME}(category)
    `);
  }

  /**
   * Store translations for a language and category
   */
  async storeTranslations(
    language: LanguageCode,
    category: TranslationCategory,
    content: TranslationContent,
    version: string = '1.0.0'
  ): Promise<void> {
    const now = Date.now();
    const contentJson = JSON.stringify(content);

    const query = `
      INSERT OR REPLACE INTO ${this.TABLE_NAME} 
      (language, category, content, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      language,
      category,
      contentJson,
      version,
      now,
      now,
    ]);
  }

  /**
   * Get translations for a language and category
   */
  async getTranslations(
    language: LanguageCode,
    category: TranslationCategory
  ): Promise<TranslationContent | null> {
    const query = `
      SELECT content FROM ${this.TABLE_NAME}
      WHERE language = ? AND category = ?
    `;

    const results = await this.db.query<{content: string}>(query, [language, category]);

    if (results.length > 0) {
      return JSON.parse(results[0].content);
    }

    return null;
  }

  /**
   * Get all translations for a language
   */
  async getAllTranslationsForLanguage(
    language: LanguageCode
  ): Promise<Map<TranslationCategory, TranslationContent>> {
    const query = `
      SELECT category, content FROM ${this.TABLE_NAME}
      WHERE language = ?
    `;

    const results = await this.db.query<{category: string; content: string}>(query, [language]);
    const translations = new Map<TranslationCategory, TranslationContent>();

    for (const row of results) {
      translations.set(row.category as TranslationCategory, JSON.parse(row.content));
    }

    return translations;
  }

  /**
   * Get translation version
   */
  async getVersion(language: LanguageCode, category: TranslationCategory): Promise<string | null> {
    const query = `
      SELECT version FROM ${this.TABLE_NAME}
      WHERE language = ? AND category = ?
    `;

    const results = await this.db.query<{version: string}>(query, [language, category]);

    if (results.length > 0) {
      return results[0].version;
    }

    return null;
  }

  /**
   * Check if translations exist for a language and category
   */
  async hasTranslations(language: LanguageCode, category: TranslationCategory): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM ${this.TABLE_NAME}
      WHERE language = ? AND category = ?
    `;

    const results = await this.db.query<{count: number}>(query, [language, category]);

    if (results.length > 0) {
      return results[0].count > 0;
    }

    return false;
  }

  /**
   * Delete translations for a language and category
   */
  async deleteTranslations(language: LanguageCode, category: TranslationCategory): Promise<void> {
    const query = `
      DELETE FROM ${this.TABLE_NAME}
      WHERE language = ? AND category = ?
    `;

    await this.db.execute(query, [language, category]);
  }

  /**
   * Delete all translations for a language
   */
  async deleteLanguage(language: LanguageCode): Promise<void> {
    const query = `
      DELETE FROM ${this.TABLE_NAME}
      WHERE language = ?
    `;

    await this.db.execute(query, [language]);
  }

  /**
   * Get all stored languages
   */
  async getStoredLanguages(): Promise<LanguageCode[]> {
    const query = `
      SELECT DISTINCT language FROM ${this.TABLE_NAME}
    `;

    const results = await this.db.query<{language: string}>(query);
    const languages: LanguageCode[] = [];

    for (const row of results) {
      languages.push(row.language as LanguageCode);
    }

    return languages;
  }

  /**
   * Get storage statistics
   */
  async getStatistics() {
    const query = `
      SELECT 
        language,
        COUNT(*) as category_count,
        SUM(LENGTH(content)) as total_size
      FROM ${this.TABLE_NAME}
      GROUP BY language
    `;

    const results = await this.db.query<{
      language: string;
      category_count: number;
      total_size: number;
    }>(query);

    return results;
  }

  /**
   * Clear all translations
   */
  async clearAll(): Promise<void> {
    const query = `DELETE FROM ${this.TABLE_NAME}`;
    await this.db.execute(query);
  }

  /**
   * Get last update time for a language and category
   */
  async getLastUpdateTime(
    language: LanguageCode,
    category: TranslationCategory
  ): Promise<Date | null> {
    const query = `
      SELECT updated_at FROM ${this.TABLE_NAME}
      WHERE language = ? AND category = ?
    `;

    const results = await this.db.query<{updated_at: number}>(query, [language, category]);

    if (results.length > 0) {
      return new Date(results[0].updated_at);
    }

    return null;
  }
}

export default TranslationStorage;
