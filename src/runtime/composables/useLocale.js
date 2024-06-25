import {useRequestHeaders, useNuxtApp, useCookie} from '#app'
import {watch} from 'vue'

export default function useLocale() {
    let locale;
    if (process.server) {
        const headers = useRequestHeaders([`accept-language`])
        if (headers[`accept-language`]) {
            locale = headers[`accept-language`].substring(0, 5)
        }
    } else {
        locale = navigator.language.substring(0, 5)
    }

    const nuxtApp = useNuxtApp();

    if (!locale) {
        const locales = nuxtApp.vueApp.config.globalProperties.getLocales();
        locale = locales[0];
    }

    const localeState = useCookie(`locale`, {secure: true, sameSite: true});
    localeState.value ||= locale;

    watch(localeState, async (newLocale, oldLocale) => {
        nuxtApp.vueApp.config.globalProperties.__vueEyeinLocale.value = newLocale;
        nuxtApp.vueApp.config.globalProperties.loadLocale(newLocale);
    });

    return localeState;
}
