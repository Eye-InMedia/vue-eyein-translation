import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/vue/components/vue2T.vue";
import {createTranslationFunc, getLocaleFunc, getLocaleTranslationsFunc, getLocalesFunc, getSSRProps, getTranslationFunc, mountedUpdated, setLocaleFunc, loadLocaleFunc} from "./src/vue/vue-plugin-functions.js";

let fileConfig = {};

try {
    const config = await import(`/eyein-translation.config.js`);
    fileConfig = config.default;

    const locale = getLocaleFunc(fileConfig)();
    await loadLocaleFunc(fileConfig)(locale);
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
        loadLocaleFunc(options)(locale);

        app.prototype.tr = getTranslationFunc(options);
        app.prototype.locale = options.localeState.value;

        app.prototype.getLocales = getLocalesFunc(options);
        app.prototype.getLocale = getLocaleFunc(options);
        app.prototype.getLocaleTranslations = getLocaleTranslationsFunc(options);
        app.prototype.setLocale = setLocaleFunc(options);
        app.prototype.loadLocale = loadLocaleFunc(options);
        app.prototype.createTranslation = createTranslationFunc(options);

        app.component(`t`, TComponent);
    }
}

export default vueEyeinTranslation;
