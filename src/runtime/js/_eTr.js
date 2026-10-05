import {reactive} from "vue";
import {createTranslationRuntime as createRuntime} from "./translationRuntime.js";
import {createLocaleLoader} from "./localeLoader.js";

let localeFilesPromises = {};
/*{localeFilesPromisesImport}*/

let assetsDir = ``;
/*{assetsDir}*/

let additionalLocalesDirs = [];
/*{additionalLocalesDirs}*/

let locales = [`en-US`];
/*{locales}*/

let translations = reactive({});
/*{translations}*/

if (import.meta.hot) {
    let localesImportsOrder = [];
    /*{localesImportsOrder}*/

    // [] will be replaced by locales imports paths
    import.meta.hot.accept([], (modules) => {
        let i = 0;
        for (const module of modules) {
            const locale = localesImportsOrder[i];
            i++;
            if (!module) {
                continue;
            }
            for (const key in module.default) {
                translations[locale][key] = module.default[key];
            }
        }
    });
}

const loadLocale = createLocaleLoader({locales, translations, localeFilesPromises, assetsDir, additionalLocalesDirs});

export function createTranslationRuntime(initialLocale = null) {
    return createRuntime({locales, translations, loadLocale}, initialLocale);
}

const _eTr = createTranslationRuntime();

export default _eTr;
