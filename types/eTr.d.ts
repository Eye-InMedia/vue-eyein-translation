import type {ComputedRef} from "vue";

/** Compiled translation object, a JSON string of it, an `@@id` string or an object with one translation per locale */
export type TranslationValue = string | Record<string, unknown>;

export interface ETr {
    loadLocale(locale: string): Promise<void>;
    getLocaleOptions(locale: string): Record<string, unknown>;
    getLocales(): string[];
    getLocale(): string | null;
    getDefaultLocale(): string;
    setLocale(locale: string): void;
    tr(value: TranslationValue, data?: Record<string, unknown> | null, locale?: string | null): string;
    trComputed(value: TranslationValue, data?: Record<string, unknown> | null): ComputedRef<string>;
    getNearestLocale(navigatorLocales?: readonly string[]): string;
    detectBrowserLocale(): string;
}
