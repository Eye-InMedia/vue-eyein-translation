import defaultOptions from "./src/defaultOptions.js";
import transformVueFile from "./src/vite/transformVueFile.js";
import transformLocaleFile from "./src/vite/transformLocaleFile.js";
import transformAppFile from "./src/vite/transformAppFile.js";
import saveLocales from "./src/vite/saveLocales.js";
import loadLocales from "./src/vite/loadLocales.js";
import path from "path";

export default async function viteEyeinTranslation(options = {}) {
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
        async buildStart() {
            const result = await loadLocales({options});
            translations = result.translations;
            additionalTranslations = result.additionalTranslations;
        },
        async buildEnd() {
            await saveLocales({options, translations, additionalTranslations, hmr});
        },
        transform(src, fileId) {
            const appFileId = path.join(process.cwd(), options.appPath).replace(/\\/g, `/`);

            let srcUpdated = false;
            if (appFileId === fileId) {
                src = transformAppFile({options, fileId, src, hmr});
                srcUpdated = true;
            }

            if (/\.vue$/.test(fileId)) {
                src = transformVueFile({options, translations, additionalTranslations, fileId, src, hmr});
                srcUpdated = true;
            } else if (/\/locales\/.+\.locale/.test(fileId)) {
                src = transformLocaleFile({options, fileId, src, hmr});
                srcUpdated = true;
            }

            if (srcUpdated) {
                return src;
            } else {
                return null;
            }
        },
        async handleHotUpdate({file, server, modules, timestamp}) {
            if (!/\/locales\/.+\.locale/.test(file)) {
                return null;
            }

            return modules;
        }
    }
}
