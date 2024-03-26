import path from "path";
import defaultOptions from "./src/defaultOptions.js";
import {handleHotUpdate, loadLocales, saveLocales, transformSourceCode} from "./src/vite/vite-plugin-functions";

let fileConfig = {};

try {
    const config = await import(path.join(`file://`, import.meta.dirname, `eyein-translation.config.js`));
    fileConfig = config.default;
} catch {
}

export default function vueEyeinTranslation(options = {}) {
    options = {...defaultOptions, ...fileConfig, ...options};

    let config;

    return {
        name: `vite-plugin-vue-eyein-translation`,
        enforce: `pre`,
        config(config) {
            if (!config.server) {
                config.server = {};
            }
            if (!config.server.watch) {
                config.server.watch = {};
            }
            if (!config.server.watch.ignored) {
                config.server.watch.ignored = [];
            }

            config.server.watch.ignored.push(`**/src/assets/locales/**`)
        },
        configResolved(resolvedConfig) {
            config = resolvedConfig
        },
        buildStart() {
            return loadLocales(options);
        },
        buildEnd() {
            return saveLocales(options, true);
        },
        transform(src, id) {
            return transformSourceCode(options, id, src)
        },
        async handleHotUpdate({file, server, modules, timestamp}) {
           return handleHotUpdate(options, file, server, modules, timestamp);
        }
    }
}
