export default defineNuxtConfig({
    compatibilityDate: `2024-11-11`,
    devtools: {enabled: true},
    modules: ['../src/module'],
    vueEyeinTranslation: {
        locales: [`en-US`, `fr-CA`],
        inlineLocales: `en-US||fr-CA`,
        appPath: `playground/app.vue`
    }
})
