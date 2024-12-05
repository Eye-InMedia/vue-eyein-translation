import {defineNuxtModule, addPlugin, createResolver, addVitePlugin, addComponent, addImportsDir} from '@nuxt/kit';
import viteEyeinTranslation from "../vite-plugin-vue-eyein-translation.js";

export default defineNuxtModule({
    meta: {
        name: `vue-eyein-translation`,
        configKey: `vueEyeinTranslation`,
    },
    defaults: {
        locales: [],
        inlineLocales: `en-US`,
        assetsDir: `assets`,
        additionalLocalesDirs: [],
        appPath: `app.vue`,
        nuxt: true
    },
    async setup(options, nuxt) {
        nuxt.options.runtimeConfig.public.vueEyeinTranslation = JSON.parse(JSON.stringify(options));

        const {resolve} = createResolver(import.meta.url)

        await addComponent({
            name: `t`,
            filePath: resolve(`./runtime/components/t.vue`)
        })

        addImportsDir(resolve('./runtime/composables'))

        addPlugin(resolve(`./runtime/plugin`))

        addVitePlugin(viteEyeinTranslation(options));
    },
})
