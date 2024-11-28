let localeFilesPromises = {};
try {
    localeFilesPromises = import.meta.glob(`/**/locales/**/*.locale`, {import: `default`});
} catch (e) {
    console.error(e);
}

let translations = {};

export function parseNavigatorLanguage(navigatorLanguage, options) {
    try {
        if (!navigatorLanguage) {
            return options.locales[0];
        }

        let locale;
        const acceptedLocales = navigatorLanguage.split(`,`);
        for (const acceptedLocale of acceptedLocales) {
            const l = acceptedLocale.split(`;`).shift();
            if (options.locales.includes(l)) {
                locale = l;
                break;
            }

            if (l.length === 2) {
                const similarLocale = options.locales.find(loc => loc.startsWith(l));
                if (similarLocale) {
                    locale = similarLocale;
                    break;
                }
            }
        }

        return locale || options.locales[0];
    } catch (e) {
        console.error(e);
        return options.locales[0];
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
                if (!url.includes(`${locale}.locale`)) {
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
