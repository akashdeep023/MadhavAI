/**
 * Language Mapper Utility
 * Maps between different language code formats
 */

import {LanguageCode} from '../types/translation.types';
import {SupportedLanguage} from '../types/voice.types';

/**
 * Map language code to voice code
 */
export function languageToVoiceCode(language: LanguageCode): SupportedLanguage {
  const mapping: {[key in LanguageCode]: SupportedLanguage} = {
    hi: 'hi-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    mr: 'mr-IN',
    bn: 'bn-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    ml: 'ml-IN',
    or: 'or-IN',
    en: 'hi-IN', // Fallback to Hindi for English
  };

  return mapping[language];
}

/**
 * Map voice code to language code
 */
export function voiceToLanguageCode(voiceCode: SupportedLanguage): LanguageCode {
  const mapping: {[key in SupportedLanguage]: LanguageCode} = {
    'hi-IN': 'hi',
    'ta-IN': 'ta',
    'te-IN': 'te',
    'kn-IN': 'kn',
    'mr-IN': 'mr',
    'bn-IN': 'bn',
    'gu-IN': 'gu',
    'pa-IN': 'pa',
    'ml-IN': 'ml',
    'or-IN': 'or',
  };

  return mapping[voiceCode];
}

/**
 * Get language name in native script
 */
export function getLanguageNativeName(language: LanguageCode): string {
  const names: {[key in LanguageCode]: string} = {
    hi: 'हिन्दी',
    ta: 'தமிழ்',
    te: 'తెలుగు',
    kn: 'ಕನ್ನಡ',
    mr: 'मराठी',
    bn: 'বাংলা',
    gu: 'ગુજરાતી',
    pa: 'ਪੰਜਾਬੀ',
    ml: 'മലയാളം',
    or: 'ଓଡ଼ିଆ',
    en: 'English',
  };

  return names[language];
}

/**
 * Get language name in English
 */
export function getLanguageEnglishName(language: LanguageCode): string {
  const names: {[key in LanguageCode]: string} = {
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    mr: 'Marathi',
    bn: 'Bengali',
    gu: 'Gujarati',
    pa: 'Punjabi',
    ml: 'Malayalam',
    or: 'Odia',
    en: 'English',
  };

  return names[language];
}
