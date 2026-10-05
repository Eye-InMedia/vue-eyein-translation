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

let localeModules = [];
let translations = reactive({});
/*{translations}*/

if (import.meta.hot) {
    let localesImportsOrder = [];
    /*{localesImportsOrder}*/

    // [] will be replaced by locales imports paths
    import.meta.hot.accept([], (modules) => {
        modules.forEach((module, index) => {
            if (module) localeModules[index] = module.default;
        });
        for (const locale of new Set(localesImportsOrder)) {
            const dictionaries = localeModules.filter((_, index) => localesImportsOrder[index] === locale);
            translations[locale] = dictionaries.reduce((merged, dictionary) => ({...merged, ...dictionary}), {});
        }
    });
}

const loadLocale = createLocaleLoader({locales, translations, localeFilesPromises, assetsDir, additionalLocalesDirs});

export function createTranslationRuntime(initialLocale = null) {
    return createRuntime({locales, translations, loadLocale}, initialLocale);
}

const _eTr = createTranslationRuntime();

export default _eTr;
