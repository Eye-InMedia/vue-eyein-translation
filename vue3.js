import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/runtime/components/t.vue";
import {createTranslationFunc, getLocaleFunc, getLocaleTranslationsFunc, getLocalesFunc, getSSRProps, getTranslationFunc, loadLocaleFunc, mountedUpdated, setLocaleFunc} from "./src/runtime/helpers/vue-plugin-functions.js";

export default async function loadVueEyeinTranslation(options) {
    options = {...defaultOptions, ...options};

    if (options.locales.length === 0) {
        throw new Error(`locales option cannot be empty`);
    }

    if (!options.localeState) {
        throw new Error(`No localeState provided`);
    }

    try {
        const locale = getLocaleFunc(options)();
        await loadLocaleFunc(options)(locale);
    } catch (e) {
        console.error(e);
    }

    return {
        install(app) {
            app.directive(`t`, {
                bind: mountedUpdated(app, options),
                update: mountedUpdated(app, options),
                mounted: mountedUpdated(app, options),
                updated: mountedUpdated(app, options),
                getSSRProps: getSSRProps(app, options)
            });

            app.config.globalProperties.tr = getTranslationFunc(options);
            app.config.globalProperties.locale = options.localeState;
            app.config.globalProperties.__vueEyeinLocale = options.localeState;

            app.config.globalProperties.getLocales = getLocalesFunc(options);
            app.config.globalProperties.getLocale = getLocaleFunc(options);
            app.config.globalProperties.getLocaleTranslations = getLocaleTranslationsFunc(options);
            app.config.globalProperties.setLocale = setLocaleFunc(options);
            app.config.globalProperties.loadLocale = loadLocaleFunc(options);
            app.config.globalProperties.createTranslation = createTranslationFunc(options);

            app.provide(`tr`, getTranslationFunc(options));
            app.provide(`locale`, options.localeState);
            app.provide(`__vueEyeinLocale`, options.localeState);

            app.provide(`getLocales`, getLocalesFunc(options));
            app.provide(`getLocale`, getLocaleFunc(options));
            app.provide(`getLocaleTranslations`, getLocaleTranslationsFunc(options));
            app.provide(`setLocale`, setLocaleFunc(options));
            app.provide(`loadLocale`, loadLocaleFunc(options));
            app.provide(`createTranslation`, createTranslationFunc(options));

            app.component(`t`, TComponent);
        }
    }
}
