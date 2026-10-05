import {defineNuxtModule, addPlugin, createResolver, addComponent, addImportsDir, addVitePlugin} from "@nuxt/kit";
import viteEyeinTranslation from "../vite-plugin-vue-eyein-translation.js";

export default defineNuxtModule({
    meta: {
        name: `vue-eyein-translation`,
        configKey: `vueEyeinTranslation`,
        compatibility: {
            nuxt: `>=3.0.0`
        }
    },
    defaults: {
        locales: [],
        inlineLocales: `en-US`,
        assetsDir: `assets`,
        additionalLocalesDirs: [],
    },
    setup(options) {
        const {resolve} = createResolver(import.meta.url);

        // Vite Plugin
        addVitePlugin(viteEyeinTranslation(options));

        // Nuxt Plugin
        addPlugin(resolve(`./runtime/plugin`));

        // Vue Component
        addComponent({
            name: `t`,
            filePath: resolve(`./runtime/components/t.vue`)
        });

        // Nuxt Composables
        addImportsDir(resolve(`./runtime/composables`));
    },
});
