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
        appPath: `src/app.vue`,
        nuxt: true
    },
    setup(options, nuxt) {
        nuxt.options.runtimeConfig.public.vueEyeinTranslation = options

        const resolver = createResolver(import.meta.url)

        addComponent({
            name: `t`,
            filePath: resolver.resolve(`runtime/components/t.vue`)
        })

        addImportsDir(resolver.resolve('runtime/composables'))

        addPlugin(resolver.resolve(`./runtime/plugin`))

        addVitePlugin(viteEyeinTranslation(options));
    },
})
