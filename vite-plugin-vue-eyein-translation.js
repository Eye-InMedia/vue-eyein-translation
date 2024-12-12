import defaultOptions from "./src/defaultOptions.js";
import transformVueFile from "./src/vite/transformVueFile.js";
import transformLocaleFile from "./src/vite/transformLocaleFile.js";
import transformAppFile from "./src/vite/transformAppFile.js";
import saveLocales from "./src/vite/saveLocales.js";
import loadLocales from "./src/vite/loadLocales.js";
import path from "path";
import MagicString from "magic-string";

export default function viteEyeinTranslation(options = {}) {
    options = {...defaultOptions, ...options};

    let config;
    let translations;
    let additionalTranslations;
    let hmr = false;

    return {
        name: `vite-plugin-vue-eyein-translation`,
        enforce: `pre`,
        configResolved(resolvedConfig) {
            config = resolvedConfig;
            hmr = config.command === `serve`;
        },
        buildStart() {
            const result = loadLocales({options});
            translations = result.translations;
            additionalTranslations = result.additionalTranslations;
        },
        buildEnd() {
            saveLocales({options, translations, additionalTranslations, hmr});
        },
        transform(code, fileId) {
            const appFileId = path.join(process.cwd(), options.appPath).replace(/\\/g, `/`);

            /**
             * @type {MagicString|null}
             */
            let src = null;
            if (appFileId === fileId) {
                src = new MagicString(code);
                transformAppFile({options, fileId, src, hmr});
                transformVueFile({options, translations, additionalTranslations, fileId, src, hmr});
            } else if (/\.vue$/.test(fileId)) {
                src = new MagicString(code);
                transformVueFile({options, translations, additionalTranslations, fileId, src, hmr});
            } else if (/\/locales\/.+\.locale/.test(fileId)) {
                src = new MagicString(code);
                transformLocaleFile({options, fileId, src, hmr});
            }

            if (src) {
                return {
                    code: src.toString(),
                    map: src.generateMap({hires: true})
                };
            }

            return null;
        },
        handleHotUpdate({file, server, modules, timestamp}) {
            if (!/\.locale$/.test(file)) {
                return null;
            }

            return modules;
        }
    }
}
