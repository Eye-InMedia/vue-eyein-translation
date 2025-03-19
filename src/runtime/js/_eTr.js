import pluralize from "./pluralize.js";
import replaceDataBindings from "./replaceDataBindings.js";
import {applyFilter} from "./filters.js";
import {computed, reactive, ref} from "vue";

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

let localeState = ref(null);

if (import.meta.hot) {
    let localesImportsOrder = [];
    /*{localesImportsOrder}*/

    // [] will be replaced by locales imports paths
    import.meta.hot.accept([], modules => {
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

const _eTr = {
    async loadLocale(locale) {
        try {
            if (!locale) {
                throw new Error(`Cannot load locale "${locale}"`);
            }

            if (translations.hasOwnProperty(locale)) {
                // locale already loaded
                return;
            }

            for (const url in localeFilesPromises) {
                if (!url.includes(`${locale}.locale`)) {
                    continue;
                }

                let isAdditionalLocale = false;
                for (const localesDir of additionalLocalesDirs) {
                    if (url.startsWith(`/` + localesDir)) {
                        isAdditionalLocale = true;
                        break;
                    }
                }

                if (!isAdditionalLocale && !url.startsWith(`/` + assetsDir)) {
                    continue;
                }

                const localeFile = await localeFilesPromises[url]();

                if (isAdditionalLocale) {
                    translations[locale] = {...localeFile, ...translations[locale]};
                } else {
                    translations[locale] = {...translations[locale], ...localeFile};
                }
            }
        } catch (e) {
            console.error(e);
        }
    },

    getLocaleOptions(locale) {
        if (!translations.hasOwnProperty(locale)) {
            return {};
        }

        return Object.keys(translations[locale])
            .filter(key => key.startsWith(`$`))
            .reduce((obj, key) => {
                obj[key] = translations[locale][key];
                return obj;
            }, {});
    },

    getLocales() {
        return locales;
    },

    getLocale() {
        return localeState.value;
    },

    setLocale(locale) {
        if (!translations.hasOwnProperty(locale)) {
            console.error(`test`)
            _eTr.loadLocale(locale)
                .then(() => {
                    localeState.value = locale;
                });
        } else {
            localeState.value = locale;
        }
    },

    tr(value, data = null, locale = null) {
        if (typeof value === `string`) {
            if (value.startsWith(`@@`)) {
                value = {id: value.replace(`@@`, ``)};
            } else {
                try {
                    value = JSON.parse(value);
                } catch {
                    console.error(`Invalid translation format: ${value}`);
                    return value;
                }
            }
        }

        locale ||= localeState.value;

        if (!locale) {
            throw new Error(`Unknown locale to translate: ${JSON.stringify(value)}, localeState: ${JSON.stringify(localeState)}`);
        }

        const shortLocale = locale.split(`-`).shift();

        let result = null;
        if (value.hasOwnProperty(locale)) {
            // exact matching locale inside translation object
            result = value[locale];
        } else if (value.hasOwnProperty(shortLocale)) {
            // partial matching locale inside translation object (ex: fr-CA matches fr translation)
            result = value[shortLocale];
        } else if (value.id) {
            if (translations.hasOwnProperty(locale) && translations[locale].hasOwnProperty(value.id) && translations[locale][value.id]) {
                // exact matching locale using external locale file
                result = translations[locale][value.id];
            } else {
                const similarLocale = locales.find(l => l.startsWith(shortLocale));

                if (similarLocale && translations.hasOwnProperty(similarLocale) && translations[similarLocale].hasOwnProperty(value.id) && translations[similarLocale][value.id]) {
                    // partial matching locale using external locale file(ex: fr-CA matches fr translation)
                    result = translations[similarLocale][value.id];
                }
            }
        }

        if (result === ``) {
            return ``;
        }

        if (result === null) {
            if (typeof value === `string`) {
                return `Missing ${locale} translation for: ${value}`;
            } else if (typeof value === `object` && value.hasOwnProperty(`en-US`) && value[`en-US`]) {
                return `Missing ${locale} translation for: ${value[`en-US`]}`;
            } else if (value.id) {
                return `Missing ${locale} translation for @@${value.id}`;
            } else {
                return `Missing ${locale} translation`;
            }
        }

        if (!data && value.data) {
            data = value.data;
        } else if (!data) {
            data = {};
        }

        // Replace double {{variable}} by single {variable}
        result = result.replace(/\{\{(.+)}}/g, `{$1}`);

        // Pluralization
        result = pluralize(result, data, locale);

        // Data binding
        result = replaceDataBindings(result, data, locale, translations[locale]);

        if (value.filters) {
            for (const filter of value.filters) {
                result = applyFilter(filter, result, locale, translations[locale]);
            }
        }

        return result;
    },

    trComputed(value, data = null) {
        return computed(() => _eTr.tr(value, data, localeState.value));
    },

    getNearestLocale(navigatorLocales = [`en-US`]) {
        for (const navigatorLocale of navigatorLocales) {
            if (locales.includes(navigatorLocale)) {
                return navigatorLocale;
            }

            const shortNavigatorLocale = navigatorLocale.substring(0, 2);

            const similarLocale = locales.find(l => l.startsWith(shortNavigatorLocale));
            if (similarLocale) {
                return similarLocale;
            }
        }

        return locales[0];
    },

    getSSRProps(binding) {
        if (!binding.arg) {
            return;
        }

        if (!binding.value) {
            return;
        }

        let ssrProps = {};

        const locale = localeState.value;

        let result = _eTr.tr(binding.value, null);

        const filters = Object.keys(binding.modifiers);
        for (const filter of filters) {
            result = applyFilter(filter, result, locale, translations[locale]);
        }

        ssrProps[binding.arg] = result;

        return ssrProps;
    },

    mountedUpdated(el, binding) {
        const ssrProps = _eTr.getSSRProps(binding);
        if (!ssrProps) {
            return;
        }

        const attribute = Object.keys(ssrProps).pop();
        const value = Object.values(ssrProps).pop();

        el.setAttribute(attribute, value);
    },

    detectBrowserLocale() {
        if (!globalThis.localStorage || !globalThis.navigator) {
            return null;
        }

        const locale = localStorage.getItem(`locale`);
        if (!locale) {
            return _eTr.getNearestLocale(navigator.languages);
        }

        return locale;
    }
}

export default _eTr;
