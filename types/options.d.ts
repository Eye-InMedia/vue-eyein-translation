export interface AutoTranslateOptions {
    /** Locales to translate automatically when their translation is missing */
    locales?: string[];
    /** Receives the texts in the source locale, must resolve with the translated texts in the same order */
    translationFunction?: (fromLocale: string, toLocale: string, textsToTranslate: string[]) => Promise<string[]>;
}

export interface EyeinTranslationOptions {
    /** Available locales, the first one is the default locale */
    locales: string[];
    /** Locales written inline in templates, separated by `||` (e.g. `en-US||fr-CA`) */
    inlineLocales: string;
    /** Directory containing the `locales/` folder, relative to the project root */
    assetsDir: string;
    /** Additional directories containing `<locale>.locale` files */
    additionalLocalesDirs: string[];
    /** Delete unused translations from locale files at build time */
    purgeOldTranslations: boolean;
    /** Warn at build time when a translation is missing */
    warnMissingTranslations: boolean;
    debug: boolean;
    autoTranslate: AutoTranslateOptions;
}
