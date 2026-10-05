import {computed, ref} from "vue";
import pluralize from "./pluralize.js";
import replaceDataBindings from "./replaceDataBindings.js";
import {applyFilter} from "./filters.js";
import {nearestLocale, detectBrowserLocale} from "./localeSelection.js";

export function createTranslationRuntime({locales, translations, loadLocale}, initialLocale = null) {
    const localeState = ref(initialLocale);
    let changeRevision = 0;
    const _eTr = {
        loadLocale,

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

        getDefaultLocale() {
            return locales[0];
        },

        async changeLocale(locale) {
            const revision = ++changeRevision;
            if (!locales.includes(locale)) throw new Error(`Cannot select locale "${locale}"`);
            if (!Object.prototype.hasOwnProperty.call(translations, locale)) await loadLocale(locale);
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

            // Should only happen in dev mode
            if (result === null && value.hasOwnProperty(`inlineTranslations`) && value.inlineTranslations.hasOwnProperty(locale)) {
                result = value.inlineTranslations[locale];
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
