export type Lang = 'en' | 'zh';

const STORAGE_KEY = 'rebuttal_wars.lang';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function detect(): Lang {
  try {
    const stored = storage()?.getItem(STORAGE_KEY) ?? null;
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    // ignore
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) return 'zh';
  return 'en';
}

let current: Lang = detect();
const listeners = new Set<() => void>();

function syncDocument(lang: Lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }
}

syncDocument(current);

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    storage()?.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  syncDocument(lang);
  listeners.forEach((l) => l());
}

export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
