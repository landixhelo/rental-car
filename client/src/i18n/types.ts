export type Locale = "sq" | "en" | "it";

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Dict = DeepString<typeof import("./sq").sq>;

export const LOCALE_LABELS: Record<Locale, string> = {
  sq: "Shqip",
  en: "English",
  it: "Italiano",
};

export const LOCALES: Locale[] = ["sq", "en", "it"];
