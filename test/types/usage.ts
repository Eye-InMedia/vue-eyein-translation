// Type checked with `tsc -p test/types`, never executed
import type {ComputedRef} from "vue";
import {defineNuxtConfig} from "nuxt/config";
import vueEyeinTranslationModule, {type ModuleOptions, type ETr} from "vue-eyein-translation";
import vue3Plugin from "vue-eyein-translation/vue3.js";
import vue2Plugin from "vue-eyein-translation/vue2.js";
import viteEyeinTranslation from "vue-eyein-translation/vite-plugin-vue-eyein-translation.js";

const options: ModuleOptions = {
    locales: [`en-US`, `fr-CA`],
    inlineLocales: `en-US||fr-CA`,
    autoTranslate: {
        locales: [`es-ES`],
        translationFunction: async (from, to, texts) => texts
    }
};

defineNuxtConfig({
    modules: [[vueEyeinTranslationModule, options]],
    vueEyeinTranslation: options
});

// @ts-expect-error locales must be an array
defineNuxtConfig({vueEyeinTranslation: {locales: `en-US`}});

viteEyeinTranslation({locales: [`en-US`]});
await vue3Plugin.loadLocale(`fr-CA`);
await vue2Plugin.loadBrowserLocale();

declare const eTr: ETr;
const text: string = eTr.tr({"en-US": `Hello`});
const computedText: ComputedRef<string> = eTr.trComputed(`@@id`);
export {text, computedText};
