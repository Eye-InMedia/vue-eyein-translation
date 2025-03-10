import {useRequestHeaders, useNuxtApp, useCookie} from '#app'

/**
 *
 * @returns {Ref<string>}
 */
export default function useLocale() {
    const nuxtApp = useNuxtApp();

    let locale;

    const localeState = useState(`locale`);
    const localeCookie = useCookie(`locale`, {secure: true, sameSite: true});
    locale = localeState.value || localeCookie.value;

    const locales = nuxtApp.vueApp.config.globalProperties._eTr.getLocales()

    let localeUpdated = false;
    if (!locale) {
        if (process.server) {
            const headers = useRequestHeaders([`accept-language`])
            if (headers[`accept-language`]) {
                locale = nuxtApp.vueApp.config.globalProperties._eTr.getNavigatorLocale(headers[`accept-language`].split(`,`))
                localeUpdated = true;
            }
        } else {
            locale = nuxtApp.vueApp.config.globalProperties._eTr.getNavigatorLocale()
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
        localeCookie.value = locale;
        nuxtApp.vueApp.config.globalProperties._eTr.setLocale(locale);
    }

    return localeState;
}
