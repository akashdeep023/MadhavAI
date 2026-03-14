/**
 * useTranslation Hook
 * React hook for accessing translation functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { LanguageCode, TranslationKey } from '../types/translation.types';
import TranslationService from '../services/translation/TranslationService';
import LanguagePreferenceManager from '../services/translation/LanguagePreferenceManager';

interface UseTranslationResult {
  t: (key: TranslationKey, params?: { [key: string]: string | number }) => string;
  translate: (key: TranslationKey, params?: { [key: string]: string | number }) => string;
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  changeLanguage: (language: LanguageCode) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

let translationServiceInstance: TranslationService | null = null;
let languagePreferenceManagerInstance: LanguagePreferenceManager | null = null;

/**
 * Initialize translation service instances (called once from App.tsx after services are ready)
 */
export function initializeTranslationServices(
  translationService: TranslationService,
  languagePreferenceManager: LanguagePreferenceManager
): void {
  translationServiceInstance = translationService;
  languagePreferenceManagerInstance = languagePreferenceManager;
}

/**
 * Hook for translation functionality
 */
export function useTranslation(): UseTranslationResult {
  // Sync language state from the already-initialized service instance
  const [language, setLanguageState] = useState<LanguageCode>(
    () => translationServiceInstance?.getCurrentLanguage() ?? 'hi'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // On mount, sync language in case service was initialized after hook first ran
  useEffect(() => {
    if (translationServiceInstance) {
      setLanguageState(translationServiceInstance.getCurrentLanguage());
    }
  }, []);

  // Translation function - service is already initialized by App.tsx, just call translate
  const t = useCallback(
    (key: TranslationKey, params?: { [key: string]: string | number }): string => {
      if (!translationServiceInstance) {
        return key;
      }
      return translationServiceInstance.translate(key, params);
    },
    // Re-memoize when language changes so components re-render with new translations
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  // Set language function
  const setLanguage = useCallback(async (newLanguage: LanguageCode): Promise<void> => {
    try {
      if (!translationServiceInstance || !languagePreferenceManagerInstance) {
        throw new Error('Translation services not initialized');
      }

      setIsLoading(true);
      await translationServiceInstance.setLanguage(newLanguage);
      await languagePreferenceManagerInstance.setRegistrationLanguage(newLanguage);
      setLanguageState(newLanguage);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to change language'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    t,
    translate: t,
    language,
    setLanguage,
    changeLanguage: setLanguage,
    isLoading,
    error,
  };
}
