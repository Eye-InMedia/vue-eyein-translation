import MagicString from "magic-string";
import defaultOptions from "./src/defaultOptions.js";
import transformVueFile from "./src/vite/transformVueFile.js";
import transformLocaleFile from "./src/vite/transformLocaleFile.js";
import saveLocales from "./src/vite/saveLocales.js";
import loadLocales from "./src/vite/loadLocales.js";
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
        async buildEnd(error) {
            if (error) {
                // Files that were not transformed would look unused: do not save nor purge locales
                return;
            }

            if (errors.length > 0) {
                console.error(errors.map(e => e.stack).join(`\n`));
                throw new AggregateError(errors, `[Eye-In Translation] ${errors.length} error(s) found during build`);
            }

            await saveLocales({options, translations, additionalTranslations, hmr});
        },
        transform(code, fileId) {
            /**
             * @type {MagicString|null}
             */
            let src = null;
            const [filePath, query = ``] = fileId.split(`?`);
            if (/\/_eTr\.js/.test(fileId)) {
                src = new MagicString(code);
                transformVueEyeinTranslationFile({options, translations, additionalTranslations, fileId, src, hmr, errors});
            } else if (/\.vue$/.test(filePath) && !new URLSearchParams(query).has(`vue`) && !filePath.includes(`/node_modules/`)) {
                // Every request containing the full SFC must be transformed, not only `file.vue`:
                // Nuxt also imports pages as `file.vue?macro=true`, and @vitejs/plugin-vue caches descriptors
                // by file path regardless of the query. An untransformed `?macro=true` descriptor can then be used
                // to compile `file.vue?vue&type=script` sub-requests, leaving staticTr() calls uncompiled at random.
                // `?vue&type=...` sub-requests are skipped because they only contain an already transformed block.
                src = new MagicString(code);
                transformVueFile({options, translations, additionalTranslations, fileId: filePath, src, hmr, errors});
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
        handleHotUpdate({file, modules}) {
            if (!/\.locale$/.test(file)) {
                return null;
            }

            return modules;
        }
    };
}
