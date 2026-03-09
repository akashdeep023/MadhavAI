/**
 * useVoice Hook
 * React hook for voice interface integration
 */

import {useState, useEffect, useCallback} from 'react';
import {
  SupportedLanguage,
  VoiceCommandResult,
} from '../types/voice.types';
import {getVoiceIntegrationManager} from '../services/voice/VoiceIntegrationManager';

/**
 * Hook for voice interface functionality
 */
export function useVoice(language: SupportedLanguage = 'hi-IN') {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const voiceManager = getVoiceIntegrationManager();

  // Initialize voice service
  useEffect(() => {
    const init = async () => {
      try {
        await voiceManager.initialize(language);
        const available = await voiceManager.isVoiceAvailable();
        setIsAvailable(available);
      } catch (err) {
        setError(err as Error);
        setIsAvailable(false);
      }
    };

    init();

    return () => {
      // Cleanup on unmount
      voiceManager.stopListening().catch(console.error);
      voiceManager.stopSpeaking().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Update state from voice service
  useEffect(() => {
    const updateState = () => {
      const state = voiceManager.getState();
      setIsListening(state.isListening);
      setIsSpeaking(state.isSpeaking);
    };

    const interval = setInterval(updateState, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Start listening for voice input
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      await voiceManager.startListening();
      setIsListening(true);
    } catch (err) {
      setError(err as Error);
      setIsListening(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Stop listening and get transcript
   */
  const stopListening = useCallback(async () => {
    try {
      const result = await voiceManager.stopListening();
      setTranscript(result);
      setIsListening(false);
      return result;
    } catch (err) {
      setError(err as Error);
      setIsListening(false);
      return '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Process voice command
   */
  const processCommand = useCallback(
    async (command: string): Promise<VoiceCommandResult> => {
      try {
        setError(null);
        return await voiceManager.processVoiceCommand(command);
      } catch (err) {
        setError(err as Error);
        return {
          understood: false,
          action: 'error',
          parameters: {},
          response: 'Error processing command',
        };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * Speak text
   */
  const speak = useCallback(async (text: string) => {
    try {
      setError(null);
      setIsSpeaking(true);
      await voiceManager.speak(text);
      setIsSpeaking(false);
    } catch (err) {
      setError(err as Error);
      setIsSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(async () => {
    try {
      await voiceManager.stopSpeaking();
      setIsSpeaking(false);
    } catch (err) {
      setError(err as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Listen and process in one step
   */
  const listenAndProcess = useCallback(async (): Promise<VoiceCommandResult> => {
    try {
      setError(null);
      await startListening();

      // Wait for user to speak (in production, this would be event-driven)
      await new Promise<void>(resolve => setTimeout(resolve, 3000));

      const result = await stopListening();
      if (result) {
        return await processCommand(result);
      }

      return {
        understood: false,
        action: 'unknown',
        parameters: {},
        response: 'No speech detected',
      };
    } catch (err) {
      setError(err as Error);
      return {
        understood: false,
        action: 'error',
        parameters: {},
        response: 'Error processing voice input',
      };
    }
  }, [startListening, stopListening, processCommand]);

  return {
    isListening,
    isSpeaking,
    transcript,
    error,
    isAvailable,
    startListening,
    stopListening,
    processCommand,
    speak,
    stopSpeaking,
    listenAndProcess,
    voiceManager,
  };
}
