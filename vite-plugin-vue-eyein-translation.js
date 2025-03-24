import defaultOptions from "./src/defaultOptions.js";
import transformVueFile from "./src/vite/transformVueFile.js";
import transformLocaleFile from "./src/vite/transformLocaleFile.js";
import saveLocales from "./src/vite/saveLocales.js";
import loadLocales from "./src/vite/loadLocales.js";
import MagicString from "magic-string";
import transformVueEyeinTranslationFile from "./src/vite/transformVueEyeinTranslationFile.js";

export default function viteEyeinTranslation(options = {}) {
    options = {...defaultOptions, ...options};

    let config;
    let translations;
    let additionalTranslations;
    let hmr = false;
    let errors = [];

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
            errors = [];
        },
        buildEnd() {
            if (errors.length > 0) {
                console.error(errors.map(e => e.stack).join(`\n`));
                throw new AggregateError(errors);
            }

            saveLocales({options, translations, additionalTranslations, hmr});
        },
        transform(code, fileId) {
            /**
             * @type {MagicString|null}
             */
            let src = null;
            if (/\/_eTr\.js/.test(fileId)) {
                src = new MagicString(code);
                transformVueEyeinTranslationFile({options, translations, additionalTranslations, fileId, src, hmr, errors});
            } else if (/\.vue$/.test(fileId)) {
                src = new MagicString(code);
                transformVueFile({options, translations, additionalTranslations, fileId, src, hmr, errors});
            } else if (/\/locales\/.+\.locale/.test(fileId)) {
                src = new MagicString(code);
                transformLocaleFile({options, fileId, src, hmr, errors});
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
