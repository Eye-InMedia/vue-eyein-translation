export default defineNuxtConfig({
    modules: ['../src/module'],
    vueEyeinTranslation: {
        locales: [`en-US`, `fr-CA`, `es-ES`],
        inlineLocales: `en-US||fr-CA`
    },
    devtools: {enabled: true}
})
