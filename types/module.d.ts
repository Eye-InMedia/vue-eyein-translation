import type {NuxtModule} from "@nuxt/schema";
import type {ETr} from "./eTr";
import type {EyeinTranslationOptions} from "./options";

export type {AutoTranslateOptions, EyeinTranslationOptions} from "./options";
export type {ETr, TranslationValue} from "./eTr";

export type ModuleOptions = Partial<EyeinTranslationOptions>;

declare const module: NuxtModule<ModuleOptions>;
export default module;

declare module "@nuxt/schema" {
    interface NuxtConfig {
        vueEyeinTranslation?: ModuleOptions;
    }
    interface NuxtOptions {
        vueEyeinTranslation?: ModuleOptions;
    }
}

declare module "vue" {
    interface ComponentCustomProperties {
        _eTr: ETr;
    }
}

declare module "#app" {
    interface NuxtApp {
        $eyeinTranslation: ETr;
    }
}
