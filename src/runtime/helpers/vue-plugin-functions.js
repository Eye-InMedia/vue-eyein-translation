import {applyFilter} from "./filters";

let localeFilesPromises = {};
try {
    localeFilesPromises = import.meta.glob(`/**/locales/**/*.json`, {import: `default`});
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
        if (!ssrProps) {
            return;
        }

        const attribute = Object.keys(ssrProps).pop();
        const value = Object.values(ssrProps).pop();

        el.setAttribute(attribute, value);
    }
}

export function getTranslationFunc(options) {
    return (value, data = null, locale = null) => {
        let l = locale;

        if (!l) {
            l = getLocaleFunc(options)();
        } else if (typeof locale === `object`) {
            l = locale.value;
        }

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

        const shortLocale = l.split(`-`).shift();
        let result;
        if (value.hasOwnProperty(l) && value[l]) {
            // case 1: exact matching inline locale (ex: en-US)
            result = value[l];
        } else if (value.id && translations.hasOwnProperty(l) && translations[l].hasOwnProperty(value.id) && translations[l][value.id]) {
            // case 2: exact matching locale in external file
            result = translations[l][value.id];
        } else if (value.hasOwnProperty(shortLocale) && value[shortLocale]) {
            // case 3: partial matching locale (ex: fr-CA matches fr translation)
            result = value[shortLocale];
        } else if (value.hasOwnProperty(options.locales[0]) && value[options.locales[0]]) {
            result = `## ` + value[options.locales[0]];
        } else {
            if (typeof value === `string`) {
                return `Missing translation for: ${value}`;
            } else if (typeof value === `object` && value.hasOwnProperty(`en-US`) && value[`en-US`]) {
                return `Missing translation for: ${value[`en-US`]}`;
            } else if (value.id) {
                return `Missing translation for @@${value.id}`;
            } else {
                return `Missing translation`;
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
        result = pluralize(result, data, l);

        // Data binding
        result = replaceDataBindings(result, data, l);

        if (value.filters) {
            for (const filter of value.filters) {
                result = applyFilter(filter, result, l, translations[l]);
            }
        }

        return result;
    }
}

function pluralize(str, data, locale) {
    let allPluralsMatches = str.matchAll(/\{([^{}]*?(?:\{(\w+)(?:\|\w+?)*?})+?[^{}]*?)}/g);
    for (const matches of allPluralsMatches) {
        if (!matches || matches.length < 3) {
            continue;
        }

        const fullMatch = matches[0];
        const key = matches[2];

        if (typeof data[key] !== `number`) {
            throw new Error(`[Translation Error] ${key} is not a number.`);
        }

        const choices = matches[1].replace(/\{([^|]*)\|([^|]*)}/g, `{$1[;;;]$2}`).split(`|`);
        if (choices.length < 3) {
            throw new Error(`[Translation Error] Pluralization issue, there must be at least 3 choices for n = 0, n = 1 and n > 1.`);
        }

        const cardinalRules = new Intl.PluralRules(locale);
        const rule = cardinalRules.select(data[key]);

        let choice;
        if (data[key] === 0) {
            choice = choices[0];
        } else if (choices.length === 3) {
            switch (rule) {
                case `one`:
                    choice = choices[1];
                    break;
                default:
                        choice = choices[2];
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

        str = str.replace(fullMatch, choice.replace(/\[;;;]/g, `|`));
    }

    return str;
}

function replaceDataBindings(str, data, locale) {
    let allDataBindingMatches = str.matchAll(/\{(\w+(?:\.\w+)*)(|[^}]+)*}/g);
    for (const matches of allDataBindingMatches) {
        const fullMatch = matches[0];
        const keys = matches[1].split(`.`);

        if (keys.length === 0) {
            continue;
        }

        let transformedValue;
        for (const key of keys) {
            transformedValue = transformedValue ? transformedValue[key] : data[key];
        }

        if (matches.length > 2 && matches[2]) {
            const filters = matches[2].split(`|`);
            filters.shift();
            for (const filter of filters) {
                transformedValue = applyFilter(filter, transformedValue, locale, translations[locale]);
            }
        }
        str = str.replace(fullMatch, transformedValue);
    }

    return str;
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

        if (!options.locales.includes(options.localeState.value)) {
            console.warn(`${options.localeState.value} locale not supported (Supported locales: ${options.locales.join(`, `)})`);
            const shortLocale = options.localeState.value.substring(0, 2);
            const similarLocale = options.locales.find(l => l.substring(0, 2) === shortLocale);

            if (similarLocale) {
                options.localeState.value = similarLocale;
                setLocaleFunc(options)(similarLocale);
            } else {
                options.localeState.value = options.inlineLocales.split(`||`).shift();
                setLocaleFunc(options)(options.localeState.value);
            }
        }

        return options.localeState.value;
    }
}

export function getLocaleTranslationsFunc(options) {
    return function() {
        return translations[options.localeState.value];
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
            await loadLocaleFunc(options)(locale);
        }

        options.localeState.value = locale;
        if (globalThis.localStorage) {
            localStorage.setItem(`locale`, locale);
        }
    }
}

export function loadLocaleFunc(options) {
    return async function(locale) {
        try {
            if (translations.hasOwnProperty(locale)) {
                return;
            }

            for (const url in localeFilesPromises) {
                if (!url.includes(`${locale}.json`)) {
                    continue;
                }

                let isAdditionalLocale = false;
                for (const localesDir of options.additionalLocalesDirs) {
                    if (url.startsWith(`/` + localesDir)) {
                        isAdditionalLocale = true;
                        break;
                    }
                }

                if (!isAdditionalLocale && !url.startsWith(`/` + options.assetsDir)) {
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
}

export function createTranslationFunc(options) {
    return () => {
        throw new Error(`This function should not be called at all. It's replaced at compile time by t function.`);
    }
}
