import { useSyncExternalStore } from 'react';
import { getLang, setLang, subscribeLang, type Lang } from './lang';
import { UI, type UiText } from './ui';

export type { Lang, UiText };
export { getLang, setLang };
export * from './content';

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, getLang);
}

export function useT(): UiText {
  return UI[useLang()];
}

export function uiText(lang: Lang = getLang()): UiText {
  return UI[lang];
}
