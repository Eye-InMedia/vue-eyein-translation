import defaultOptions from "./src/defaultOptions.js";
import {handleHotUpdate, loadLocales, saveLocales, transformSourceCode, updateViteConfig} from "./src/vite/vite-plugin-functions.js";

export default async function viteEyeinTranslation(options = {}) {
    options = {...defaultOptions, ...options};

    let config;

    return {
        name: `vite-plugin-vue-eyein-translation`,
        enforce: `pre`,
        config(c) {
           return updateViteConfig(options, c);
        },
        configResolved(resolvedConfig) {
            config = resolvedConfig;
        },
        buildStart() {
            return loadLocales(options);
        },
        buildEnd() {
            return saveLocales(options, true);
        },
        transform(src, id) {
            return transformSourceCode(options, id, src, config.command === `serve`);
        },
        async handleHotUpdate({file, server, modules, timestamp}) {
           return handleHotUpdate(options, file, server, modules, timestamp);
        }
    }
}
