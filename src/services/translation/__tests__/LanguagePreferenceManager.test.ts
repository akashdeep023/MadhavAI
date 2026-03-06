/**
 * Language Preference Manager Tests
 */

import LanguagePreferenceManager from '../LanguagePreferenceManager';
import {LanguageCode} from '../../../types/translation.types';

describe('LanguagePreferenceManager', () => {
  let preferenceManager: LanguagePreferenceManager;
  let mockStorage: any;
  let mockProfileManager: any;

  beforeEach(() => {
    mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    mockProfileManager = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    };

    preferenceManager = new LanguagePreferenceManager(mockStorage, mockProfileManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize and load saved language', async () => {
      mockStorage.getItem.mockResolvedValue('ta');

      await preferenceManager.initialize();

      expect(mockStorage.getItem).toHaveBeenCalledWith('user_language_preference');
    });

    it('should handle missing saved language', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      await preferenceManager.initialize();

      expect(mockStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('setLanguagePreference', () => {
    it('should set language preference', async () => {
      mockStorage.setItem.mockResolvedValue(undefined);
      mockProfileManager.updateProfile.mockResolvedValue({});

      await preferenceManager.setLanguagePreference('user123', 'ta');

      expect(mockStorage.setItem).toHaveBeenCalledWith('user_language_preference', 'ta');
      expect(mockProfileManager.updateProfile).toHaveBeenCalledWith({
        languagePreference: 'ta',
      });
    });

    it('should continue if profile update fails', async () => {
      mockStorage.setItem.mockResolvedValue(undefined);
      mockProfileManager.updateProfile.mockRejectedValue(new Error('Profile update failed'));

      await expect(
        preferenceManager.setLanguagePreference('user123', 'ta')
      ).resolves.not.toThrow();

      expect(mockStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getLanguagePreference', () => {
    it('should return stored language', async () => {
      mockStorage.getItem.mockResolvedValue('ta');

      const language = await preferenceManager.getLanguagePreference();

      expect(language).toBe('ta');
    });

    it('should return language from profile if not in storage', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      mockProfileManager.getProfile.mockResolvedValue({
        languagePreference: 'te',
      });

      const language = await preferenceManager.getLanguagePreference('user123');

      expect(language).toBe('te');
      expect(mockStorage.setItem).toHaveBeenCalledWith('user_language_preference', 'te');
    });

    it('should return default language (Hindi) if not found', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      mockProfileManager.getProfile.mockResolvedValue(null);

      const language = await preferenceManager.getLanguagePreference('user123');

      expect(language).toBe('hi');
    });
  });

  describe('registration language', () => {
    it('should get registration language', async () => {
      mockStorage.getItem.mockResolvedValue('ta');

      const language = await preferenceManager.getRegistrationLanguage();

      expect(language).toBe('ta');
    });

    it('should return default for registration if not set', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      const language = await preferenceManager.getRegistrationLanguage();

      expect(language).toBe('hi');
    });

    it('should set registration language', async () => {
      mockStorage.setItem.mockResolvedValue(undefined);

      await preferenceManager.setRegistrationLanguage('ta');

      expect(mockStorage.setItem).toHaveBeenCalledWith('user_language_preference', 'ta');
    });
  });

  describe('preference history', () => {
    it('should get preference history for user', async () => {
      const mockHistory = [
        {
          userId: 'user123',
          languageCode: 'ta' as LanguageCode,
          timestamp: new Date('2024-01-01'),
        },
        {
          userId: 'user123',
          languageCode: 'hi' as LanguageCode,
          timestamp: new Date('2024-01-02'),
        },
      ];

      mockStorage.getItem.mockResolvedValue(mockHistory);

      const history = await preferenceManager.getPreferenceHistory('user123');

      expect(history).toHaveLength(2);
      expect(history[0].languageCode).toBe('hi'); // Most recent first
    });

    it('should return empty array if no history', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      const history = await preferenceManager.getPreferenceHistory('user123');

      expect(history).toEqual([]);
    });
  });

  describe('hasLanguagePreference', () => {
    it('should return true if preference exists', async () => {
      mockStorage.getItem.mockResolvedValue('ta');

      const hasPreference = await preferenceManager.hasLanguagePreference();

      expect(hasPreference).toBe(true);
    });

    it('should return false if no preference', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      const hasPreference = await preferenceManager.hasLanguagePreference();

      expect(hasPreference).toBe(false);
    });
  });

  describe('clearLanguagePreference', () => {
    it('should clear language preference', async () => {
      mockStorage.removeItem.mockResolvedValue(undefined);

      await preferenceManager.clearLanguagePreference();

      expect(mockStorage.removeItem).toHaveBeenCalledWith('user_language_preference');
    });
  });
});
