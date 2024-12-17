import {useNuxtApp, useCookie} from '#app'
import {watch} from 'vue'

export default async function setLocaleWatcher() {
    const nuxtApp = useNuxtApp();

    const localeState = useCookie(`locale`, {secure: true, sameSite: true});
    if (localeState.value) {
        await nuxtApp.vueApp.config.globalProperties._eTr.setLocale(localeState.value);
    }

    watch(localeState, async (newLocale, oldLocale) => {
        nuxtApp.vueApp.config.globalProperties._eTr.setLocale(newLocale);
    });
}
