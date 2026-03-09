/**
 * VoiceIntegrationManager
 * Manages voice interface integration across all modules
 * Ensures voice interface works offline
 */

import {SupportedLanguage, VoiceCommandResult} from '../../types/voice.types';
import VoiceService from './VoiceService';
import TextToSpeech from './TextToSpeech';
import VoiceNavigation from './VoiceNavigation';
import DashboardVoiceSummary from './DashboardVoiceSummary';
import VoiceRecommendationReader from './VoiceRecommendationReader';

/**
 * Voice integration manager for cross-module voice functionality
 */
class VoiceIntegrationManager {
  private voiceService: VoiceService;
  private tts: TextToSpeech;
  private navigation: VoiceNavigation;
  private dashboardSummary: DashboardVoiceSummary;
  private recommendationReader: VoiceRecommendationReader;
  private currentLanguage: SupportedLanguage = 'hi-IN';
  // @ts-expect-error - Reserved for future use
  private _isOfflineMode: boolean = false;

  constructor() {
    this.voiceService = new VoiceService();
    this.tts = this.voiceService.getTextToSpeech();
    this.navigation = new VoiceNavigation(this.tts);
    this.dashboardSummary = new DashboardVoiceSummary(this.tts);
    this.recommendationReader = new VoiceRecommendationReader(this.tts);
  }

  /**
   * Initialize voice interface
   */
  async initialize(language: SupportedLanguage): Promise<void> {
    this.currentLanguage = language;
    this.voiceService.setLanguage(language);
    this.navigation.setLanguage(language);
    this.dashboardSummary.setLanguage(language);
    this.recommendationReader.setLanguage(language);

    // Check if voice is available
    const isAvailable = await this.voiceService.isAvailable();
    if (!isAvailable) {
      console.warn('Voice interface not available on this device');
    }
  }

  /**
   * Set offline mode
   */
  setOfflineMode(isOffline: boolean): void {
    this._isOfflineMode = isOffline;
    // Voice interface should work offline as it uses device native APIs
  }

  /**
   * Get voice service instance
   */
  getVoiceService(): VoiceService {
    return this.voiceService;
  }

  /**
   * Get navigation service
   */
  getNavigation(): VoiceNavigation {
    return this.navigation;
  }

  /**
   * Get dashboard summary service
   */
  getDashboardSummary(): DashboardVoiceSummary {
    return this.dashboardSummary;
  }

  /**
   * Get recommendation reader service
   */
  getRecommendationReader(): VoiceRecommendationReader {
    return this.recommendationReader;
  }

  /**
   * Process voice command and execute action
   */
  async processVoiceCommand(command: string): Promise<VoiceCommandResult> {
    return await this.voiceService.processVoiceCommand(command);
  }

  /**
   * Start listening for voice input
   */
  async startListening(): Promise<void> {
    await this.voiceService.startListening(this.currentLanguage);
  }

  /**
   * Stop listening and get transcript
   */
  async stopListening(): Promise<string> {
    return await this.voiceService.stopListening();
  }

  /**
   * Speak text
   */
  async speak(text: string): Promise<void> {
    await this.voiceService.speak(text, this.currentLanguage);
  }

  /**
   * Stop speaking
   */
  async stopSpeaking(): Promise<void> {
    await this.voiceService.stopSpeaking();
  }

  /**
   * Change language
   */
  async changeLanguage(language: SupportedLanguage): Promise<void> {
    this.currentLanguage = language;
    this.voiceService.setLanguage(language);
    this.navigation.setLanguage(language);
    this.dashboardSummary.setLanguage(language);
    this.recommendationReader.setLanguage(language);
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Check if voice is available
   */
  async isVoiceAvailable(): Promise<boolean> {
    return await this.voiceService.isAvailable();
  }

  /**
   * Get voice service state
   */
  getState() {
    return this.voiceService.getState();
  }

  /**
   * Destroy and clean up resources
   */
  async destroy(): Promise<void> {
    await this.voiceService.destroy();
  }
}

// Singleton instance
let instance: VoiceIntegrationManager | null = null;

/**
 * Get singleton instance of VoiceIntegrationManager
 */
export function getVoiceIntegrationManager(): VoiceIntegrationManager {
  if (!instance) {
    instance = new VoiceIntegrationManager();
  }
  return instance;
}

export default VoiceIntegrationManager;
