import {defineNuxtConfig} from "nuxt/config";

export default defineNuxtConfig({
    modules: [`../src/module`],
    devtools: {enabled: true},
    compatibilityDate: `2024-12-09`,
    vueEyeinTranslation: {
        locales: [`en-US`, `fr-CA`],
        inlineLocales: `en-US||fr-CA`,
        debug: true
    },
});
