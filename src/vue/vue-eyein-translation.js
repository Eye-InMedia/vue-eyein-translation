import {applyFilter} from "./filters.js";

let localeFilesPromises = {};
try {
    localeFilesPromises = import.meta.glob(`/src/assets/locales/**/*.json`, {import: `default`});
} catch (e) {
    console.error(e);
}

let translations = {};

export function getSSRProps(app, options) {
    return binding => {
        if (!binding.arg) {
            return;
        }

        if (!binding.value) {
            return;
        }

        let ssrProps = {};

        const locale = getLocaleFunc(options)();

        const t = getTranslationFunc(options);
        let result = t(binding.value, null, locale);

        const filters = Object.keys(binding.modifiers);
        for (const filter of filters) {
            result = applyFilter(filter, result, locale, translations[locale]);
        }

        ssrProps[binding.arg] = result;
        return ssrProps;
    }
}

export function mountedUpdated(app, options) {
    return (el, binding) => {
        const ssrProps = getSSRProps(app, options)(binding);
        const attribute = Object.keys(ssrProps).pop();
        const value = Object.values(ssrProps).pop();

        el.setAttribute(attribute, value);
    }
}

export function getTranslationFunc(options) {
    return (value, data = null, locale = null) => {
        if (!locale) {
            locale = getLocaleFunc(options)();
        }

        const shortLocale = locale.split(`-`).shift();
        let result;
        if (value.hasOwnProperty(locale) && value[locale]) {
            // case 1: exact matching inline locale (ex: en-US)
            result = value[locale];
        } else if (value.id && translations.hasOwnProperty(locale) && translations[locale].hasOwnProperty(value.id) && translations[locale][value.id].target) {
            // case 2: exact matching locale in external file
            result = translations[locale][value.id].target;
        } else if (value.hasOwnProperty(shortLocale) && value[shortLocale]) {
            // case 3: partial matching locale (ex: fr-CA matches fr translation)
            result = value[shortLocale];
        } else if (value.hasOwnProperty(options.locales[0]) && value[options.locales[0]]) {
            result = value[options.locales[0]];
        } else {
            return `Missing translation`;
        }

        if (!data && value.data) {
            data = value.data;
        } else if (!data) {
            data = {};
        }

        // Pluralization
        result = pluralize(result, data, locale);

        // Data binding
        for (const key in data) {
            const regex = new RegExp(`\\{${key}((?:\\|\\w+?)*?)}`);
            const matches = regex.exec(result);
            let transformedValue = data[key];
            if (matches && matches.length >= 2) {
                const filters = matches[1].split(`|`);
                filters.shift();
                for (const filter of filters) {
                    transformedValue = applyFilter(filter, transformedValue, locale, translations[locale]);
                }
            }
            result = result.replace(regex, transformedValue);
        }

        return result;
    }
}

function pluralize(value, data, locale) {
    for (const key in data) {
        const regex = new RegExp(`\\{([^{}]*?(?:\\{${key}(?:\\|\\w+?)*?})+?[^{}]*?)}`);
        const matches = regex.exec(value);

        if (!matches || matches.length < 2) {
            continue;
        }

        if (typeof data[key] !== `number`) {
            throw new Error(`[Translation Error] ${key} is not a number.`);
        }

        const choices = matches[1].split(`|`);
        if (choices.length < 3) {
            throw new Error(`[Translation Error] Pluralization issue, there must be at least 3 choices for n = 0, n = 1 and n > 1.`);
        }

        const cardinalRules = new Intl.PluralRules(locale);
        const rule = cardinalRules.select(data[key]);

        let choice;
        if (choices.length === 3) {
            switch (rule) {
                case `one`:
                    choice = choices[1];
                    break;
                default:
                    if (data[key] === 0) {
                        choice = choices[0];
                    } else {
                        choice = choices[2];
                    }
                    break;
            }
        } else {
            switch (rule) {
                case `zero`:
                    choice = choices[0];
                    break;
                case `one`:
                    choice = choices[1];
                    break;
                case `two`:
                    choice = choices[2];
                    break;
                case `few`:
                    choice = choices[3];
                    break;
                case `many`:
                    if (choices.length > 4) {
                        choice = choices[4];
                    } else {
                        choices.at(-1);
                    }
                    break;
                default:
                    choice = choices.at(-1);
                    break;
            }
        }

        value = value.replace(regex, choice);
    }

    return value;
}

export function getLocalesFunc(options) {
    return () => {
        return options.locales;
    }
}

export function getLocaleFunc(options) {
    return function() {
        if (!options.localeState.value) {
            options.localeState.value = localStorage.getItem(`locale`) || navigator.language || options.locales[0];
        }

        return options.localeState.value
    }
}

export function getLocaleTranslationsFunc(options) {
    return function() {
        return translations[options.localeState.data]
    }
}

export function setLocaleFunc(options) {
    return async function(locale) {
        const availableLocales = getLocalesFunc(options)();

        if (!availableLocales.includes(locale)) {
            console.warn(`Cannot change locale to ${locale} (available locales: ${availableLocales.join(`, `)})`);
            return;
        }


        if (!translations.hasOwnProperty(locale)) {
            await loadLocale(locale, options);
        }

        options.localeState.value = locale;
        if (globalThis.localStorage) {
            localStorage.setItem(`locale`, locale);
        }
    }
}

export async function loadLocale(locale, options) {
    try {
        if (translations.hasOwnProperty(locale)) {
            return;
        }

        if (localeFilesPromises.hasOwnProperty(`/src/assets/locales/${locale}.json`)) {
            translations[locale] = await localeFilesPromises[`/src/assets/locales/${locale}.json`]();
        }

        let i = 1;
        while (localeFilesPromises.hasOwnProperty(`/src/assets/locales/add/${i}/${locale}.json`)) {
            const additionalLocale = await localeFilesPromises[`/src/assets/locales/add/${i}/${locale}.json`]();
            translations[locale] = {...translations[locale], ...additionalLocale};
            i++;
        }
    } catch (e) {
        console.error(e);
    }
}

export function createTranslationFunc(options) {
    return () => {
        throw new Error(`This function should not be called at all. It's replaced at compile time by t function.`);
    }
}
