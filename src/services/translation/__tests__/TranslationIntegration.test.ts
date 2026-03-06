/**
 * Translation Integration Tests
 * Tests the integration between TranslationService, TranslationStorage, and LanguagePreferenceManager
 */

import TranslationService from '../TranslationService';
import TranslationStorage from '../TranslationStorage';
import LanguagePreferenceManager from '../LanguagePreferenceManager';

describe('Translation Integration', () => {
  let translationService: TranslationService;
  let translationStorage: TranslationStorage;
  let preferenceManager: LanguagePreferenceManager;
  let mockDb: any;
  let mockEncryptedStorage: any;
  let mockProfileManager: any;

  beforeEach(() => {
    // Mock database
    mockDb = {
      open: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
    };

    // Mock encrypted storage
    mockEncryptedStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    // Mock profile manager
    mockProfileManager = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    };

    translationStorage = new TranslationStorage(mockDb);
    translationService = new TranslationService(translationStorage);
    preferenceManager = new LanguagePreferenceManager(
      mockEncryptedStorage,
      mockProfileManager
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('end-to-end translation workflow', () => {
    it('should handle complete translation workflow', async () => {
      // Setup: Store translations in storage
      const mockTranslations = {
        common: {
          yes: 'हाँ',
          no: 'नहीं',
        },
      };

      mockDb.query.mockResolvedValue([
        {
          content: JSON.stringify(mockTranslations),
        },
      ]);

      // Initialize translation service
      await translationService.initialize('hi');

      // Translate a key
      const result = translationService.translate('ui.common.yes');
      expect(result).toBe('हाँ');
    });

    it('should handle language preference changes', async () => {
      // User sets language preference
      mockEncryptedStorage.setItem.mockResolvedValue(undefined);
      mockProfileManager.updateProfile.mockResolvedValue({});

      await preferenceManager.setLanguagePreference('user123', 'ta');

      // Verify preference was stored
      expect(mockEncryptedStorage.setItem).toHaveBeenCalledWith(
        'user_language_preference',
        'ta'
      );

      // Get preference back
      mockEncryptedStorage.getItem.mockResolvedValue('ta');
      const language = await preferenceManager.getLanguagePreference();
      expect(language).toBe('ta');

      // Change translation service language
      mockDb.query.mockResolvedValue([]);
      await translationService.setLanguage('ta');
      expect(translationService.getCurrentLanguage()).toBe('ta');
    });

    it('should handle offline scenario', async () => {
      // Simulate offline: translations already in local storage
      const mockTranslations = {
        dashboard: {
          title: 'डैशबोर्ड',
        },
      };

      mockDb.query.mockResolvedValue([
        {
          content: JSON.stringify(mockTranslations),
        },
      ]);

      await translationService.initialize('hi');

      // Should be able to translate without network
      const result = translationService.translate('ui.dashboard.title');
      expect(result).toBe('डैशबोर्ड');
    });

    it('should handle missing translations gracefully', async () => {
      mockDb.query.mockResolvedValue([]);

      await translationService.initialize('hi');

      // Should return key if translation not found
      const result = translationService.translate('ui.missing.key');
      expect(result).toBe('ui.missing.key');
    });
  });

  describe('multi-language support', () => {
    it('should support switching between languages', async () => {
      const hindiTranslations = {
        common: {greeting: 'नमस्ते'},
      };

      const tamilTranslations = {
        common: {greeting: 'வணக்கம்'},
      };

      mockDb.query.mockImplementation((_query: string, params?: any[]) => {
        const [language] = params || [];
        if (language === 'hi') {
          return Promise.resolve([{content: JSON.stringify(hindiTranslations)}]);
        } else if (language === 'ta') {
          return Promise.resolve([{content: JSON.stringify(tamilTranslations)}]);
        }
        return Promise.resolve([]);
      });

      // Start with Hindi
      await translationService.initialize('hi');
      let result = translationService.translate('ui.common.greeting');
      expect(result).toBe('नमस्ते');

      // Switch to Tamil
      await translationService.setLanguage('ta');
      result = translationService.translate('ui.common.greeting');
      expect(result).toBe('வணக்கம்');
    });
  });

  describe('registration flow', () => {
    it('should handle language selection during registration', async () => {
      // User selects Tamil during registration
      mockEncryptedStorage.setItem.mockResolvedValue(undefined);

      await preferenceManager.setRegistrationLanguage('ta');

      // Verify it was stored
      expect(mockEncryptedStorage.setItem).toHaveBeenCalledWith(
        'user_language_preference',
        'ta'
      );

      // Later, get the registration language
      mockEncryptedStorage.getItem.mockResolvedValue('ta');
      const language = await preferenceManager.getRegistrationLanguage();
      expect(language).toBe('ta');
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      // Should not throw, but log error
      await expect(translationService.initialize('hi')).resolves.not.toThrow();
    });

    it('should handle profile update errors gracefully', async () => {
      mockEncryptedStorage.setItem.mockResolvedValue(undefined);
      mockProfileManager.updateProfile.mockRejectedValue(
        new Error('Network error')
      );

      // Should continue even if profile update fails
      await expect(
        preferenceManager.setLanguagePreference('user123', 'ta')
      ).resolves.not.toThrow();

      // Local preference should still be saved
      expect(mockEncryptedStorage.setItem).toHaveBeenCalled();
    });
  });
});
