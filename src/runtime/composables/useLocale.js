import {useRequestHeaders, useNuxtApp, useCookie} from '#app'

/**
 *
 * @returns {CookieRef<string>}
 */
export default function useLocale() {
    const nuxtApp = useNuxtApp();

    let locale;

    const localeState = useCookie(`locale`, {secure: true, sameSite: true});
    locale = localeState.value;

    const locales = nuxtApp.vueApp.config.globalProperties._eTr.getLocales()

    let localeUpdated = false;
    if (!localeState.value) {
        if (process.server) {
            const headers = useRequestHeaders([`accept-language`])
            if (headers[`accept-language`]) {
                locale = headers[`accept-language`].substring(0, 5)
                localeUpdated = true;
            }
        } else {
            locale = navigator.language.substring(0, 5)
            localeUpdated = true;
        }

        if (!locale) {
            locale = locales[0]
            localeUpdated = true;
        }
    }

    if (!locales.includes(locale)) {
        const shortLocale = locale.split('-').shift()
        const similarLocale = locales.find(l => l.startsWith(shortLocale))
        if (similarLocale) {
            locale = similarLocale;
            localeUpdated = true;
        }
    }

    if (localeUpdated) {
        localeState.value = locale;
    }

    return localeState;
}
