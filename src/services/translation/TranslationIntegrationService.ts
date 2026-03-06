/**
 * Translation Integration Service
 * Integrates translations across all modules (alerts, recommendations, training, schemes)
 */

import {LanguageCode} from '../../types/translation.types';
import TranslationService from './TranslationService';
import {getVoiceIntegrationManager} from '../voice/VoiceIntegrationManager';
import {languageToVoiceCode} from '../../utils/languageMapper';

class TranslationIntegrationService {
  private translationService: TranslationService;

  constructor(translationService: TranslationService) {
    this.translationService = translationService;
  }

  /**
   * Change language across all modules
   */
  async changeLanguage(language: LanguageCode): Promise<void> {
    // Update translation service
    await this.translationService.setLanguage(language);

    // Update voice interface
    const voiceManager = getVoiceIntegrationManager();
    const voiceCode = languageToVoiceCode(language);
    await voiceManager.changeLanguage(voiceCode);

    // Notify other modules about language change
    this.notifyLanguageChange(language);
  }

  /**
   * Notify modules about language change
   */
  private notifyLanguageChange(language: LanguageCode): void {
    // Emit event for other modules to react to language change
    // This could be implemented with an event emitter or state management
    console.log(`Language changed to: ${language}`);
  }

  /**
   * Translate alert message
   */
  translateAlert(alertType: string, params?: {[key: string]: string | number}): string {
    const key = `alerts.${alertType}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Translate recommendation
   */
  translateRecommendation(
    recommendationType: string,
    field: string,
    params?: {[key: string]: string | number}
  ): string {
    const key = `recommendations.${recommendationType}.${field}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Translate scheme information
   */
  translateScheme(
    schemeId: string,
    field: string,
    params?: {[key: string]: string | number}
  ): string {
    const key = `schemes.${schemeId}.${field}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Translate training content
   */
  translateTraining(
    contentId: string,
    field: string,
    params?: {[key: string]: string | number}
  ): string {
    const key = `training.${contentId}.${field}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Translate weather information
   */
  translateWeather(field: string, params?: {[key: string]: string | number}): string {
    const key = `weather.${field}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Translate market information
   */
  translateMarket(field: string, params?: {[key: string]: string | number}): string {
    const key = `market.${field}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Translate soil health information
   */
  translateSoil(field: string, params?: {[key: string]: string | number}): string {
    const key = `soil.${field}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Translate error message
   */
  translateError(errorCode: string, params?: {[key: string]: string | number}): string {
    const key = `errors.${errorCode}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Translate common UI element
   */
  translateUI(field: string, params?: {[key: string]: string | number}): string {
    const key = `ui.${field}`;
    return this.translationService.translate(key, params);
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): LanguageCode {
    return this.translationService.getCurrentLanguage();
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.translationService.isLanguageSupported(language);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return this.translationService.getSupportedLanguages();
  }
}

export default TranslationIntegrationService;
