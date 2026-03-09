/**
 * VoiceService Tests
 */

import VoiceService from '../VoiceService';

describe('VoiceService', () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    voiceService = new VoiceService();
  });

  afterEach(async () => {
    await voiceService.destroy();
  });

  describe('initialization', () => {
    it('should initialize with default language', () => {
      expect(voiceService.getCurrentLanguage()).toBe('hi-IN');
    });

    it('should be available', async () => {
      const isAvailable = await voiceService.isAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('language support', () => {
    it('should support all 10 regional languages', async () => {
      const languages = await voiceService.getSupportedLanguages();
      expect(languages).toHaveLength(10);
      expect(languages).toContain('hi-IN');
      expect(languages).toContain('ta-IN');
      expect(languages).toContain('te-IN');
      expect(languages).toContain('kn-IN');
      expect(languages).toContain('mr-IN');
      expect(languages).toContain('bn-IN');
      expect(languages).toContain('gu-IN');
      expect(languages).toContain('pa-IN');
      expect(languages).toContain('ml-IN');
      expect(languages).toContain('or-IN');
    });

    it('should change language', () => {
      voiceService.setLanguage('ta-IN');
      expect(voiceService.getCurrentLanguage()).toBe('ta-IN');
    });
  });

  describe('speech recognition', () => {
    it('should start listening', async () => {
      await voiceService.startListening('hi-IN');
      const state = voiceService.getState();
      expect(state.isListening).toBe(true);
    });

    it('should stop listening', async () => {
      await voiceService.startListening('hi-IN');
      await voiceService.stopListening();
      const state = voiceService.getState();
      expect(state.isListening).toBe(false);
    });

    it('should throw error if already listening', async () => {
      await voiceService.startListening('hi-IN');
      await expect(voiceService.startListening('hi-IN')).rejects.toThrow('Already listening');
    });

    it('should cancel listening', async () => {
      await voiceService.startListening('hi-IN');
      await voiceService.cancel();
      const state = voiceService.getState();
      expect(state.isListening).toBe(false);
    });
  });

  describe('voice commands', () => {
    it('should process weather command', async () => {
      const result = await voiceService.processVoiceCommand('show weather');
      expect(result.understood).toBe(true);
      expect(result.action).toBe('weather');
    });

    it('should process market prices command', async () => {
      const result = await voiceService.processVoiceCommand('show market prices');
      expect(result.understood).toBe(true);
      expect(result.action).toBe('market_prices');
    });

    it('should process schemes command', async () => {
      const result = await voiceService.processVoiceCommand('show schemes');
      expect(result.understood).toBe(true);
      expect(result.action).toBe('schemes');
    });

    it('should handle unknown command', async () => {
      const result = await voiceService.processVoiceCommand('xyz unknown command');
      expect(result.understood).toBe(false);
      expect(result.action).toBe('unknown');
    });

    it('should handle empty command', async () => {
      const result = await voiceService.processVoiceCommand('');
      expect(result.understood).toBe(false);
    });
  });

  describe('text-to-speech', () => {
    it('should speak text', async () => {
      await expect(voiceService.speak('Hello farmer', 'hi-IN')).resolves.not.toThrow();
    });

    it('should stop speaking', async () => {
      await voiceService.speak('Hello farmer', 'hi-IN');
      await expect(voiceService.stopSpeaking()).resolves.not.toThrow();
    });
  });

  describe('state management', () => {
    it('should return current state', () => {
      const state = voiceService.getState();
      expect(state).toHaveProperty('isListening');
      expect(state).toHaveProperty('isSpeaking');
      expect(state).toHaveProperty('currentLanguage');
      expect(state).toHaveProperty('isAvailable');
    });
  });
});
