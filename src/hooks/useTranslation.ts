/**
 * useTranslation Hook
 * React hook for accessing translation functionality
 */

import {useState, useEffect, useCallback} from 'react';
import {LanguageCode, TranslationKey} from '../types/translation.types';
import TranslationService from '../services/translation/TranslationService';
import LanguagePreferenceManager from '../services/translation/LanguagePreferenceManager';

interface UseTranslationResult {
  t: (key: TranslationKey, params?: {[key: string]: string | number}) => string;
  translate: (key: TranslationKey, params?: {[key: string]: string | number}) => string;
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  changeLanguage: (language: LanguageCode) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

let translationServiceInstance: TranslationService | null = null;
let languagePreferenceManagerInstance: LanguagePreferenceManager | null = null;

/**
 * Initialize translation service instances
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
  const [language, setLanguageState] = useState<LanguageCode>('hi');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        if (!translationServiceInstance || !languagePreferenceManagerInstance) {
          throw new Error('Translation services not initialized');
        }

        // Get user's language preference
        const preferredLanguage = await languagePreferenceManagerInstance.getLanguagePreference();
        
        // Initialize translation service with preferred language
        await translationServiceInstance.initialize(preferredLanguage);
        
        setLanguageState(preferredLanguage);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize translations'));
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Translation function
  const t = useCallback(
    (key: TranslationKey, params?: {[key: string]: string | number}): string => {
      if (!translationServiceInstance) {
        return key;
      }

      return translationServiceInstance.translate(key, params);
    },
    []
  );

  // Set language function
  const setLanguage = useCallback(
    async (newLanguage: LanguageCode): Promise<void> => {
      try {
        if (!translationServiceInstance || !languagePreferenceManagerInstance) {
          throw new Error('Translation services not initialized');
        }

        setIsLoading(true);
        
        // Update translation service
        await translationServiceInstance.setLanguage(newLanguage);
        
        // Update preference (userId would come from auth context in real app)
        // For now, just update local preference
        await languagePreferenceManagerInstance.setRegistrationLanguage(newLanguage);
        
        setLanguageState(newLanguage);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to change language'));
        setIsLoading(false);
      }
    },
    []
  );

  return {
    t,
    translate: t, // Alias for convenience
    language,
    setLanguage,
    changeLanguage: setLanguage, // Alias for convenience
    isLoading,
    error,
  };
}
