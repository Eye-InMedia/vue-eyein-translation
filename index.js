import defaultOptions from "./src/defaultOptions";
import TComponent from "./src/vue/components/t.vue";
import SelectLocaleComponent from "./src/vue/components/select-locale.vue";
import {createTranslationFunc, getLocaleFunc, getLocaleTranslationsFunc, getLocalesFunc, getSSRProps, getTranslationFunc, loadLocale, mountedUpdated, setLocaleFunc} from "./src/vue/vue-eyein-translation";

let fileConfig = {};

try {
    const config = await import(`/eyein-translation.config.js`);
    fileConfig = config.default;

    const locale = getLocaleFunc(fileConfig)();
    await loadLocale(locale, fileConfig);
} catch {
}

const vueEyeinTranslation = {
    install(app, options) {
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

        const locale = getLocaleFunc(options)();
        loadLocale(locale, options);

        if (app.config?.globalProperties) {
            app.config.globalProperties.locale = options.localeState.value;

            app.config.globalProperties.t = getTranslationFunc(options);

            app.config.globalProperties.getLocales = getLocalesFunc(options);
            app.config.globalProperties.getLocale = getLocaleFunc(options);
            app.config.globalProperties.getLocaleTranslations = getLocaleTranslationsFunc(options);
            app.config.globalProperties.setLocale = setLocaleFunc(options);
            app.config.globalProperties.createTranslation = createTranslationFunc(options);

            app.provide(`t`, getTranslationFunc(options));

            app.provide(`getLocales`, getLocalesFunc(options));
            app.provide(`getLocale`, getLocaleFunc(options));
            app.provide(`getLocaleTranslations`, getLocaleTranslationsFunc(options));
            app.provide(`setLocale`, setLocaleFunc(options));
            app.provide(`createTranslation`, createTranslationFunc(options));
        } else {
            app.prototype.locale = options.localeState.value;

            app.prototype.t = getTranslationFunc(options);

            app.prototype.getLocales = getLocalesFunc(options);
            app.prototype.getLocale = getLocaleFunc(options);
            app.prototype.getLocaleTranslations = getLocaleTranslationsFunc(options);
            app.prototype.setLocale = setLocaleFunc(options);
            app.prototype.createTranslation = createTranslationFunc(options);
        }

        app.component(`t`, TComponent);
        app.component(`select-locale`, SelectLocaleComponent);
    }
}

export default vueEyeinTranslation;
