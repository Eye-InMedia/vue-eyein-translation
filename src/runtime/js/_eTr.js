import {ref, computed, watch} from "vue"
import {applyFilter} from "./filters.js";
import pluralize from "./pluralize.js";
import replaceDataBindings from "./replaceDataBindings.js";

let localeFilesPromises = {};

const _eLocale = ref("en-US");

watch(_eLocale, async newLocale => {
    await setLocale(newLocale);
})

let translations = {};
let additionalLocalesDirs = []
let assetsDir = null;

export default {
    init(ctx) {
        assetsDir = ctx.assetsDir;
        additionalLocalesDirs = ctx.additionalLocalesDirs;
        translations = ctx.translations;
        localeFilesPromises = ctx.localeFilesPromises;

        if (!ctx.nuxt) {
            _eLocale.value = detectUsedLocale();
        }
    },
    getTranslations() {
        return translations;
    },
    getLocaleTranslations(locale) {
        return translations[locale];
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
    locale: _eLocale,
    locales: computed(() => Object.keys(translations)),
    setLocale: setLocale,
    setLocaleSync: setLocaleSync,
    loadLocale: loadLocale,
    getLocale() {
        return _eLocale.value;
    },
    getLocales() {
        return Object.keys(translations);
    },
    getNavigatorLocale: getNavigatorLocale,
    tr: tr,
    trComputed(value, data = null) {
        return computed(() => tr(value, data, _eLocale.value));
    },
    getSSRProps: getSSRProps,
    mountedUpdated: mountedUpdated
}

export async function setLocale(locale, reactiveAlreadyChanged = false) {
    const locales = Object.keys(translations);
    if (!locales.includes(locale)) {
        console.warn(`Cannot change locale to ${locale} (available locales: ${locales.join(`, `)})`);
        return;
    }

    if (Object.keys(translations[locale]).length === 0) {
        await loadLocale(locale);
    }

    if (globalThis.localStorage) {
        localStorage.setItem(`locale`, locale);
    }

    _eLocale.value = locale;
}

export function setLocaleSync(locale, reactiveAlreadyChanged = false) {
    const locales = Object.keys(translations);
    if (!locales.includes(locale)) {
        console.warn(`Cannot change locale to ${locale} (available locales: ${locales.join(`, `)})`);
        return;
    }

    if (Object.keys(translations[locale]).length === 0) {
        throw new Error(`Cannot use setLocaleSync with not already loaded locale.`);
    }

    if (globalThis.localStorage) {
        localStorage.setItem(`locale`, locale);
    }

    _eLocale.value = locale;
}

export function tr(value, data = null, locale = null) {
    const locales = Object.keys(translations);

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

    locale ||= _eLocale.value;
    const shortLocale = locale.split(`-`).shift();

    let result;
    if (value.hasOwnProperty(locale) && value[locale]) {
        // exact matching locale inside translation object
        result = value[locale];
    } else if (value.hasOwnProperty(shortLocale) && value[shortLocale]) {
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

    if (!result) {
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
}

async function loadLocale(locale) {
    try {
        if (!translations.hasOwnProperty(locale)) {
            console.warn(`${locale} locale is not available`);
            return;
        }

        if (Object.keys(translations[locale]).length > 0) {
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
}

export function getSSRProps(binding) {
    if (!binding.arg) {
        return;
    }

    if (!binding.value) {
        return;
    }

    let ssrProps = {};

    const locale = _eLocale.value;

    let result = tr(binding.value, null);

    const filters = Object.keys(binding.modifiers);
    for (const filter of filters) {
        result = applyFilter(filter, result, locale, translations[locale]);
    }

    ssrProps[binding.arg] = result;

    return ssrProps;
}

export function mountedUpdated(el, binding) {
    const ssrProps = getSSRProps(binding);
    if (!ssrProps) {
        return;
    }

    const attribute = Object.keys(ssrProps).pop();
    const value = Object.values(ssrProps).pop();

    el.setAttribute(attribute, value);
}

export function getNavigatorLocale(acceptedLocales = null) {
    try {
        const locales = Object.keys(translations);

        let locale;
        if (!acceptedLocales) {
            if (navigator.languages && navigator.languages.length > 0) {
                acceptedLocales = navigator.languages;
            } else if (navigator.languages) {
                acceptedLocales = navigator.language.split(`,`);
            }
        }

        for (const acceptedLocale of acceptedLocales) {
            const l = acceptedLocale.split(`;`).shift();
            if (locales.includes(l)) {
                locale = l;
                break;
            }

            const shortLocale = l.substring(0, 2);

            const similarLocale = locales.find(loc => loc.startsWith(shortLocale));
            if (similarLocale) {
                locale = similarLocale;
                break;
            }
        }

        return locale || locales[0];
    } catch (e) {
        console.error(e);
        return `en-US`;
    }
}

export function detectUsedLocale() {
    if (!localStorage || !localStorage.getItem(`locale`)) {
        return getNavigatorLocale();
    }

    return localStorage.getItem(`locale`);
}
