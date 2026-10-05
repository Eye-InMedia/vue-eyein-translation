const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const directory = value => `/` + value.replace(/\\/g, `/`).replace(/^\/+|\/+$/g, ``) + `/`;

export function createLocaleLoader({locales, translations, localeFilesPromises, assetsDir, additionalLocalesDirs}) {
    const pending = new Map();
    return async function loadLocale(locale) {
        if (!locales.includes(locale)) throw new Error(`Cannot load locale "${locale}"`);
        if (pending.has(locale)) return pending.get(locale);
        if (owns(translations, locale)) return;

        const files = Object.keys(localeFilesPromises).sort().filter(url =>
            url.split(`/`).pop() === `${locale}.locale`
            && (url.startsWith(directory(assetsDir)) || additionalLocalesDirs.some(dir => url.startsWith(directory(dir)))));
        if (!files.length) throw new Error(`No assets found for locale "${locale}"`);

        const promise = (async () => {
            let merged = {};
            for (const url of files) {
                const dictionary = await localeFilesPromises[url]();
                if (url.startsWith(directory(assetsDir))) merged = {...merged, ...dictionary};
                else merged = {...dictionary, ...merged};
            }
            translations[locale] = merged;
        })();
        pending.set(locale, promise);
        try {
            await promise;
        } finally {
            pending.delete(locale);
        }
    };
}
