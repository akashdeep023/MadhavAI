/**
 * Translation Service Tests
 */

import TranslationService from '../TranslationService';
import TranslationStorage from '../TranslationStorage';
import {TranslationCategory} from '../../../types/translation.types';

// Mock TranslationStorage
jest.mock('../TranslationStorage');

describe('TranslationService', () => {
  let translationService: TranslationService;
  let mockStorage: jest.Mocked<TranslationStorage>;

  beforeEach(() => {
    mockStorage = {
      getTranslations: jest.fn(),
      initialize: jest.fn(),
    } as any;

    translationService = new TranslationService(mockStorage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default language (Hindi)', async () => {
      mockStorage.getTranslations.mockResolvedValue({
        common: {
          yes: 'हाँ',
          no: 'नहीं',
        },
      });

      await translationService.initialize();

      expect(translationService.getCurrentLanguage()).toBe('hi');
      expect(mockStorage.getTranslations).toHaveBeenCalled();
    });

    it('should initialize with specified language', async () => {
      mockStorage.getTranslations.mockResolvedValue({});

      await translationService.initialize('ta');

      expect(translationService.getCurrentLanguage()).toBe('ta');
    });
  });

  describe('translate', () => {
    beforeEach(async () => {
      mockStorage.getTranslations.mockImplementation((_lang, category) => {
        if (category === TranslationCategory.UI) {
          return Promise.resolve({
            common: {
              yes: 'हाँ',
              no: 'नहीं',
              save: 'सहेजें',
            },
            dashboard: {
              title: 'डैशबोर्ड',
              welcome: 'स्वागत है {name}',
            },
          });
        }
        return Promise.resolve(null);
      });

      await translationService.initialize('hi');
    });

    it('should translate simple key', () => {
      const result = translationService.translate('ui.common.yes');
      expect(result).toBe('हाँ');
    });

    it('should translate nested key', () => {
      const result = translationService.translate('ui.dashboard.title');
      expect(result).toBe('डैशबोर्ड');
    });

    it('should interpolate parameters', () => {
      const result = translationService.translate('ui.dashboard.welcome', {name: 'राज'});
      expect(result).toBe('स्वागत है राज');
    });

    it('should return key if translation not found', () => {
      const result = translationService.translate('ui.nonexistent.key');
      expect(result).toBe('ui.nonexistent.key');
    });
  });

  describe('language management', () => {
    it('should change language', async () => {
      mockStorage.getTranslations.mockResolvedValue({});

      await translationService.initialize('hi');
      await translationService.setLanguage('ta');

      expect(translationService.getCurrentLanguage()).toBe('ta');
    });

    it('should throw error for unsupported language', async () => {
      await translationService.initialize('hi');

      await expect(
        translationService.setLanguage('xx' as any)
      ).rejects.toThrow('Language xx is not supported');
    });

    it('should check if language is supported', () => {
      expect(translationService.isLanguageSupported('hi')).toBe(true);
      expect(translationService.isLanguageSupported('ta')).toBe(true);
      expect(translationService.isLanguageSupported('xx')).toBe(false);
    });

    it('should get supported languages', () => {
      const languages = translationService.getSupportedLanguages();
      expect(languages).toHaveLength(11); // 10 regional + English
      expect(languages.map(l => l.code)).toContain('hi');
      expect(languages.map(l => l.code)).toContain('ta');
      expect(languages.map(l => l.code)).toContain('en');
    });
  });

  describe('preload languages', () => {
    it('should preload multiple languages', async () => {
      mockStorage.getTranslations.mockResolvedValue({});

      await translationService.initialize('hi');
      const callCountBefore = mockStorage.getTranslations.mock.calls.length;
      
      await translationService.preloadLanguages(['ta', 'te', 'kn']);

      const callCountAfter = mockStorage.getTranslations.mock.calls.length;
      expect(callCountAfter).toBeGreaterThan(callCountBefore);
    });
  });

  describe('statistics', () => {
    it('should return translation statistics', async () => {
      mockStorage.getTranslations.mockResolvedValue({});

      await translationService.initialize('hi');
      await translationService.setLanguage('ta');

      const stats = translationService.getStatistics();

      expect(stats).toHaveProperty('currentLanguage', 'ta');
      expect(stats).toHaveProperty('loadedLanguages');
      expect(stats).toHaveProperty('totalLanguages', 11);
      expect(stats).toHaveProperty('totalCategories');
    });
  });
});
