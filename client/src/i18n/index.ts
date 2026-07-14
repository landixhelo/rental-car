import { en } from "./en";
import { it } from "./it";
import { sq } from "./sq";
import type { Locale } from "./types";

export const dictionaries = { sq, en, it } as const;

export type { Locale, Dict } from "./types";
export { LOCALE_LABELS, LOCALES } from "./types";
export { sq, en, it };

export type TranslationKey = string;

/** Dot-path lookup, e.g. t("nav.cars") */
export function translate(
  dict: (typeof dictionaries)[Locale],
  key: string,
  vars?: Record<string, string | number>
): string {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  if (typeof cur !== "string") return key;
  if (!vars) return cur;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    cur
  );
}
