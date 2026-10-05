import {computed, ref, toRaw} from "vue";
import pluralize from "./pluralize.js";
import replaceDataBindings from "./replaceDataBindings.js";
import {applyFilter} from "./filters.js";
import {nearestLocale, detectBrowserLocale} from "./localeSelection.js";

// Track presence through Vue proxies while avoiding shadowed object methods.
const owns = (object, key) => key in Object(object) && Object.prototype.hasOwnProperty.call(object, key);

function translationEntry(dictionary, id) {
    // Vue instruments this property as a method. Track its key without calling it.
    if (id === `hasOwnProperty` && id in dictionary) return toRaw(dictionary)[id];
    return dictionary[id];
}

export function createTranslationRuntime({locales, translations, loadLocale}, initialLocale = null) {
    const localeState = ref(initialLocale);
    let changeRevision = 0;
    const _eTr = {
        loadLocale,

        getLocaleOptions(locale) {
            if (!owns(translations, locale)) {
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

        getDefaultLocale() {
            return locales[0];
        },

        async changeLocale(locale) {
            const revision = ++changeRevision;
            if (!locales.includes(locale)) throw new Error(`Cannot select locale "${locale}"`);
            if (!owns(translations, locale)) await loadLocale(locale);
            if (revision === changeRevision) localeState.value = locale;
        },

        setLocale(locale) {
            _eTr.changeLocale(locale).catch(error => console.error(error));
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
            if (owns(value, locale)) {
                // exact matching locale inside translation object
                result = value[locale];
            } else if (owns(value, shortLocale)) {
                // partial matching locale inside translation object (ex: fr-CA matches fr translation)
                result = value[shortLocale];
            } else if (value.id) {
                if (owns(translations, locale) && owns(translations[locale], value.id) && translationEntry(translations[locale], value.id)) {
                    // exact matching locale using external locale file
                    result = translationEntry(translations[locale], value.id);
                } else {
                    const similarLocale = locales.find(l => l.startsWith(shortLocale));

                    if (similarLocale && owns(translations, similarLocale) && owns(translations[similarLocale], value.id) && translationEntry(translations[similarLocale], value.id)) {
                        // partial matching locale using external locale file(ex: fr-CA matches fr translation)
                        result = translationEntry(translations[similarLocale], value.id);
                    }
                }
            }

            if (result === ``) {
                return ``;
            }

            // Should only happen in dev mode
            if (result === null && owns(value, `inlineTranslations`) && owns(value.inlineTranslations, locale)) {
                result = value.inlineTranslations[locale];
            }

            if (result === null) {
                if (typeof value === `string`) {
                    return `Missing ${locale} translation for: ${value}`;
                } else if (typeof value === `object` && owns(value, `en-US`) && value[`en-US`]) {
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
            result = result.replace(/\{\{(.+?)\}\}/g, `{$1}`);

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

        trComputed(value, data = null, locale = null) {
            return computed(() => _eTr.tr(value, data, locale || localeState.value));
        },

        getNearestLocale(navigatorLocales = [`en-US`]) {
            return nearestLocale(navigatorLocales, locales);
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
            return detectBrowserLocale(locales);
        }
    };
    return _eTr;
}
