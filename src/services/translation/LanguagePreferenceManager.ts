/**
 * Language Preference Manager
 * Manages user language preferences and persistence
 */

import {LanguageCode, LanguagePreferenceUpdate} from '../../types/translation.types';
import {encryptedStorage} from '../storage/EncryptedStorage';
import {profileManager} from '../profile/ProfileManager';

class LanguagePreferenceManager {
  private storage: typeof encryptedStorage;
  private profileManager: typeof profileManager;
  private readonly PREFERENCE_KEY = 'user_language_preference';
  private currentLanguage: LanguageCode | null = null;

  constructor(
    storage: typeof encryptedStorage = encryptedStorage,
    profileMgr: typeof profileManager = profileManager
  ) {
    this.storage = storage;
    this.profileManager = profileMgr;
  }

  /**
   * Initialize language preference manager
   */
  async initialize(): Promise<void> {
    // Load saved language preference
    const savedLanguage = await this.getStoredLanguage();
    if (savedLanguage) {
      this.currentLanguage = savedLanguage;
    }
  }

  /**
   * Set user language preference
   */
  async setLanguagePreference(
    userId: string,
    language: LanguageCode
  ): Promise<void> {
    // Update in-memory state
    this.currentLanguage = language;

    // Store in encrypted storage
    await this.storage.setItem(this.PREFERENCE_KEY, language);

    // Update user profile
    try {
      await this.profileManager.updateProfile({
        languagePreference: language,
      });
    } catch (error) {
      console.error('Failed to update profile language preference:', error);
      // Continue even if profile update fails - local preference is saved
    }

    // Log preference change
    const update: LanguagePreferenceUpdate = {
      userId,
      languageCode: language,
      timestamp: new Date(),
    };

    await this.logPreferenceChange(update);
  }

  /**
   * Get current language preference
   */
  async getLanguagePreference(userId?: string): Promise<LanguageCode> {
    // Try to get from memory first
    if (this.currentLanguage) {
      return this.currentLanguage;
    }

    // Try to get from storage
    const storedLanguage = await this.getStoredLanguage();
    if (storedLanguage) {
      this.currentLanguage = storedLanguage;
      return storedLanguage;
    }

    // Try to get from user profile
    if (userId) {
      try {
        const profile = await this.profileManager.getProfile();
        if (profile && profile.languagePreference) {
          const language = profile.languagePreference as LanguageCode;
          this.currentLanguage = language;
          await this.storage.setItem(this.PREFERENCE_KEY, language);
          return language;
        }
      } catch (error) {
        console.error('Failed to get language from profile:', error);
      }
    }

    // Default to Hindi
    return 'hi';
  }

  /**
   * Get stored language from encrypted storage
   */
  private async getStoredLanguage(): Promise<LanguageCode | null> {
    try {
      const language = await this.storage.getItem(this.PREFERENCE_KEY);
      return language as LanguageCode | null;
    } catch (error) {
      console.error('Failed to get stored language:', error);
      return null;
    }
  }

  /**
   * Clear language preference
   */
  async clearLanguagePreference(): Promise<void> {
    this.currentLanguage = null;
    await this.storage.removeItem(this.PREFERENCE_KEY);
  }

  /**
   * Log preference change for analytics
   */
  private async logPreferenceChange(update: LanguagePreferenceUpdate): Promise<void> {
    try {
      // Store in user-specific history array
      const historyKey = `language_history_${update.userId}`;
      const existingHistory = await this.storage.getItem<LanguagePreferenceUpdate[]>(historyKey) || [];
      
      existingHistory.push(update);
      
      // Keep only last 50 entries
      if (existingHistory.length > 50) {
        existingHistory.shift();
      }
      
      await this.storage.setItem(historyKey, existingHistory);
    } catch (error) {
      console.error('Failed to log preference change:', error);
    }
  }

  /**
   * Get language preference history
   */
  async getPreferenceHistory(userId: string): Promise<LanguagePreferenceUpdate[]> {
    try {
      // Note: EncryptedStorage doesn't support getAllKeys, so we'll use a simpler approach
      // Store history in a single key as an array
      const historyKey = `language_history_${userId}`;
      const historyData = await this.storage.getItem<LanguagePreferenceUpdate[]>(historyKey);
      
      if (!historyData) {
        return [];
      }

      // Convert timestamp strings back to Date objects
      return historyData.map(update => ({
        ...update,
        timestamp: new Date(update.timestamp),
      })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to get preference history:', error);
      return [];
    }
  }

  /**
   * Check if language preference is set
   */
  async hasLanguagePreference(): Promise<boolean> {
    const language = await this.getStoredLanguage();
    return language !== null;
  }

  /**
   * Get language preference for registration
   */
  async getRegistrationLanguage(): Promise<LanguageCode> {
    // During registration, use stored preference or default
    const storedLanguage = await this.getStoredLanguage();
    return storedLanguage || 'hi';
  }

  /**
   * Set registration language (before user account is created)
   */
  async setRegistrationLanguage(language: LanguageCode): Promise<void> {
    this.currentLanguage = language;
    await this.storage.setItem(this.PREFERENCE_KEY, language);
  }
}

export default LanguagePreferenceManager;
