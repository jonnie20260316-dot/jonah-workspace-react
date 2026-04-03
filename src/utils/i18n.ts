import { DEFAULT_LANG } from "../constants";
import type { Lang } from "../types";

let _lang: Lang = DEFAULT_LANG;

export function setLang(lang: Lang) {
  _lang = lang;
}

export function getLang(): Lang {
  return _lang;
}

export function pick(zh: string, en: string): string {
  return _lang === "zh" ? zh : en;
}
