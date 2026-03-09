/**
 * TextToSpeech Service
 * Handles text-to-speech conversion using device native APIs
 * Supports voice output in all 10 regional languages
 */

import {SupportedLanguage, TextToSpeechOptions} from '../../types/voice.types';

/**
 * Text-to-speech service for voice output
 * Mock implementation - in production would use @react-native-tts/tts or similar
 */
class TextToSpeech {
  private isSpeaking: boolean = false;
  private currentLanguage: SupportedLanguage = 'hi-IN';
  private defaultPitch: number = 1.0;
  private defaultRate: number = 1.0;
  private defaultVolume: number = 1.0;
  private speakCallback: (() => void) | null = null;
  // @ts-expect-error - Reserved for future use
  private _errorCallback: ((error: Error) => void) | null = null;

  /**
   * Check if text-to-speech is available on the device
   */
  async isAvailable(): Promise<boolean> {
    // In production, check device TTS capabilities
    // const voices = await Tts.voices();
    // return voices.length > 0;
    return true;
  }

  /**
   * Speak the given text
   */
  async speak(text: string, language: SupportedLanguage, options?: Partial<TextToSpeechOptions>): Promise<void> {
    if (this.isSpeaking) {
      await this.stop();
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    this.currentLanguage = language;
    this.isSpeaking = true;

    const pitch = options?.pitch ?? this.defaultPitch;
    const rate = options?.rate ?? this.defaultRate;
    const volume = options?.volume ?? this.defaultVolume;

    // In production, use native TTS
    // await Tts.setDefaultLanguage(language);
    // await Tts.setDefaultPitch(pitch);
    // await Tts.setDefaultRate(rate);
    // await Tts.setDefaultVolume(volume);
    // await Tts.speak(text);

    console.log(`Speaking in ${language}: "${text}"`);
    console.log(`Options: pitch=${pitch}, rate=${rate}, volume=${volume}`);

    // Simulate speaking duration
    const duration = this.estimateSpeakingDuration(text, rate);
    setTimeout(() => {
      this.isSpeaking = false;
      if (this.speakCallback) {
        this.speakCallback();
      }
    }, duration);
  }

  /**
   * Stop speaking
   */
  async stop(): Promise<void> {
    if (!this.isSpeaking) {
      return;
    }

    this.isSpeaking = false;

    // In production, stop native TTS
    // await Tts.stop();

    console.log('Stopped speaking');
  }

  /**
   * Pause speaking
   */
  async pause(): Promise<void> {
    if (!this.isSpeaking) {
      return;
    }

    // In production, pause native TTS
    // await Tts.pause();

    console.log('Paused speaking');
  }

  /**
   * Resume speaking
   */
  async resume(): Promise<void> {
    // In production, resume native TTS
    // await Tts.resume();

    console.log('Resumed speaking');
  }

  /**
   * Get available voices for a language
   */
  async getVoices(_language?: SupportedLanguage): Promise<string[]> {
    // In production, get available voices from device
    // const voices = await Tts.voices();
    // if (language) {
    //   return voices.filter(v => v.language === language).map(v => v.name);
    // }
    // return voices.map(v => v.name);

    return ['default'];
  }

  /**
   * Set default voice parameters
   */
  setDefaults(options: Partial<TextToSpeechOptions>): void {
    if (options.pitch !== undefined) {
      this.defaultPitch = Math.max(0.5, Math.min(2.0, options.pitch));
    }
    if (options.rate !== undefined) {
      this.defaultRate = Math.max(0.5, Math.min(2.0, options.rate));
    }
    if (options.volume !== undefined) {
      this.defaultVolume = Math.max(0.0, Math.min(1.0, options.volume));
    }
    if (options.language !== undefined) {
      this.currentLanguage = options.language;
    }
  }

  /**
   * Get current speaking state
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set callback for when speaking finishes
   */
  onFinish(callback: () => void): void {
    this.speakCallback = callback;

    // In production, set up event listeners
    // Tts.addEventListener('tts-finish', callback);
  }

  /**
   * Set callback for TTS errors
   */
  onError(callback: (error: Error) => void): void {
    this._errorCallback = callback;

    // In production, set up error listeners
    // Tts.addEventListener('tts-error', (event) => {
    //   callback(new Error(event.error));
    // });
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    // In production, query device for supported languages
    // const voices = await Tts.voices();
    // const languages = voices.map(v => v.language);
    // return [...new Set(languages)].filter(isSupportedLanguage);

    return [
      'hi-IN',
      'ta-IN',
      'te-IN',
      'kn-IN',
      'mr-IN',
      'bn-IN',
      'gu-IN',
      'pa-IN',
      'ml-IN',
      'or-IN',
    ];
  }

  /**
   * Estimate speaking duration in milliseconds
   */
  private estimateSpeakingDuration(text: string, rate: number): number {
    // Average speaking rate is about 150 words per minute
    // Adjust based on rate parameter
    const words = text.split(/\s+/).length;
    const baseWPM = 150;
    const adjustedWPM = baseWPM * rate;
    const minutes = words / adjustedWPM;
    return minutes * 60 * 1000;
  }

  /**
   * Destroy the TTS service and clean up resources
   */
  async destroy(): Promise<void> {
    if (this.isSpeaking) {
      await this.stop();
    }

    this.speakCallback = null;
    this._errorCallback = null;

    // In production, remove event listeners
    // Tts.removeAllListeners('tts-finish');
    // Tts.removeAllListeners('tts-error');

    console.log('Text-to-speech service destroyed');
  }
}

export default TextToSpeech;
