import type {App} from "vue";
import type {EyeinTranslationOptions} from "./options";

declare const vueEyeinTranslation: {
    loadLocale(locale: string): Promise<void>;
    loadBrowserLocale(): Promise<void>;
    install(app: App, options?: Partial<EyeinTranslationOptions>): void;
};
export default vueEyeinTranslation;
