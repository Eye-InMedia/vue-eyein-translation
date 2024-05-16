import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/vue/components/t.vue";
import SelectLocaleComponent from "./src/vue/components/select-locale.vue";
import {createTranslationFunc, getLocaleFunc, getLocaleTranslationsFunc, getLocalesFunc, getSSRProps, getTranslationFunc, loadLocale, mountedUpdated, setLocaleFunc} from "./src/vue/vue-plugin-functions.js";

let fileConfig = {};

const vueEyeinTranslation = {
    async install(app, options) {
        try {
            const config = await import(`/eyein-translation.config.js`);
            fileConfig = config.default;

            const locale = getLocaleFunc(fileConfig)();
            await loadLocale(locale, fileConfig);
        } catch {
        }

        options = {...defaultOptions, ...fileConfig, ...options};

        if (options.locales.length === 0) {
            throw new Error(`locales option cannot be empty`);
        }

        app.directive(`t`, {
            bind: mountedUpdated(app, options),
            update: mountedUpdated(app, options),
            mounted: mountedUpdated(app, options),
            updated: mountedUpdated(app, options),
            getSSRProps: getSSRProps(app, options)
        });

        if (!options.localeState) {
            options.localeState = app.observable({
                value: null
            });
        }

        app.config.globalProperties.tr = getTranslationFunc(options);
        app.config.globalProperties.locale = options.localeState;

        app.config.globalProperties.getLocales = getLocalesFunc(options);
        app.config.globalProperties.getLocale = getLocaleFunc(options);
        app.config.globalProperties.getLocaleTranslations = getLocaleTranslationsFunc(options);
        app.config.globalProperties.setLocale = setLocaleFunc(options);
        app.config.globalProperties.createTranslation = createTranslationFunc(options);

        app.provide(`tr`, getTranslationFunc(options));
        app.provide(`locale`, options.localeState);

        app.provide(`getLocales`, getLocalesFunc(options));
        app.provide(`getLocale`, getLocaleFunc(options));
        app.provide(`getLocaleTranslations`, getLocaleTranslationsFunc(options));
        app.provide(`setLocale`, setLocaleFunc(options));
        app.provide(`createTranslation`, createTranslationFunc(options));

        app.component(`t`, TComponent);
        app.component(`select-locale`, SelectLocaleComponent);
    }
}

export default vueEyeinTranslation;
