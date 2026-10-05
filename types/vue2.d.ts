import type {EyeinTranslationOptions} from "./options";

declare const vueEyeinTranslation: {
    loadLocale(locale: string): Promise<void>;
    loadBrowserLocale(): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vue 2 constructor
    install(Vue: any, options?: Partial<EyeinTranslationOptions>): void;
};
export default vueEyeinTranslation;
