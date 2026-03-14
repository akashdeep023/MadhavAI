/**
 * useTranslation Hook
 * Loads translations directly from bundled JSON files — no DB, no async delay.
 */

import { useState, useCallback, useEffect } from 'react';
import { LanguageCode } from '../types/translation.types';
import { encryptedStorage } from '../services/storage/EncryptedStorage';

// Import all locale JSONs directly
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';
import kn from '../locales/kn.json';
import mr from '../locales/mr.json';
import bn from '../locales/bn.json';
import gu from '../locales/gu.json';
import pa from '../locales/pa.json';
import ml from '../locales/ml.json';
import or from '../locales/or.json';

const LOCALES: Record<LanguageCode, Record<string, any>> = {
  en, hi, ta, te, kn, mr, bn, gu, pa, ml, or,
};

// Global language state so all hook instances stay in sync
let currentLanguage: LanguageCode = 'hi';
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((fn) => fn());
}

/** Resolve a dot-notation key like "dashboard.title" from a nested object */
function resolve(obj: Record<string, any>, key: string): string {
  // Strip leading "ui." prefix if present
  const path = key.startsWith('ui.') ? key.slice(3) : key;
  const parts = path.split('.');
  let cur: any = obj;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in cur) {
      cur = cur[part];
    } else {
      return key; // key not found — return raw key so it's obvious
    }
  }
  return typeof cur === 'string' ? cur : key;
}

function translate(key: string, lang: LanguageCode, params?: Record<string, string | number>): string {
  const locale = LOCALES[lang] ?? LOCALES['hi'];
  let text = resolve(locale, key);

  // Fallback to English if not found in current language
  if (text === key && lang !== 'en') {
    text = resolve(LOCALES['en'], key);
  }

  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

export function useTranslation() {
  const [lang, setLang] = useState<LanguageCode>(currentLanguage);

  // Subscribe to global language changes
  useEffect(() => {
    // Sync in case language changed before this component mounted
    setLang(currentLanguage);

    const update = () => setLang(currentLanguage);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(key, lang, params),
    [lang],
  );

  const setLanguage = useCallback(async (newLang: LanguageCode) => {
    currentLanguage = newLang;
    // Persist preference
    await encryptedStorage.setItem('preferred_language', newLang);
    notifyAll();
  }, []);

  return {
    t,
    translate: t,
    language: lang,
    setLanguage,
    changeLanguage: setLanguage,
    isLoading: false,
    error: null,
  };
}

/** Call once at app start to restore saved language preference */
export async function initializeTranslationServices(): Promise<void> {
  try {
    const saved = await encryptedStorage.getItem<LanguageCode>('preferred_language');
    if (saved && saved in LOCALES) {
      currentLanguage = saved;
      notifyAll();
    }
  } catch {
    // default 'hi' stays
  }
}
