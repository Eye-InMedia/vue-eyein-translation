export default defineNuxtConfig({
    compatibilityDate: `2024-12-09`,
    devtools: {enabled: true},
    modules: [`../src/module`],
    vueEyeinTranslation: {
        locales: [`en-US`, `fr-CA`],
        inlineLocales: `en-US||fr-CA`,
        debug: true
    }
})
