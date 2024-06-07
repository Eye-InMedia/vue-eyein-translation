import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/runtime/components/vue2T.vue";
import {createTranslationFunc, getLocaleFunc, getLocaleTranslationsFunc, getLocalesFunc, getSSRProps, getTranslationFunc, mountedUpdated, setLocaleFunc, loadLocaleFunc} from "./src/runtime/helpers/vue-plugin-functions.js";

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

            app.prototype.tr = getTranslationFunc(options);
            app.prototype.locale = options.localeState.value;
            app.prototype.__vueEyeinLocale = options.localeState.value;

            app.prototype.getLocales = getLocalesFunc(options);
            app.prototype.getLocale = getLocaleFunc(options);
            app.prototype.getLocaleTranslations = getLocaleTranslationsFunc(options);
            app.prototype.setLocale = setLocaleFunc(options);
            app.prototype.loadLocale = loadLocaleFunc(options);
            app.prototype.createTranslation = createTranslationFunc(options);

            app.component(`t`, TComponent);
        }
    }
}
