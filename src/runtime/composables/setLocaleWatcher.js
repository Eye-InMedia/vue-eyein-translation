import {useNuxtApp, useCookie, useState} from '#app'
import {watch} from 'vue'

export default async function setLocaleWatcher() {
    const nuxtApp = useNuxtApp();

    const localeState = useState(`locale`);
    const localeCookie = useCookie(`locale`, {secure: true, sameSite: true});
    if (localeState.value) {
        localeCookie.value = localeState.value;
        await nuxtApp.vueApp.config.globalProperties._eTr.setLocale(localeState.value);
    }

    watch(localeState, async (newLocale, oldLocale) => {
        const localeCookie = useCookie(`locale`, {secure: true, sameSite: true});
        localeCookie.value = localeState.value;
        nuxtApp.vueApp.config.globalProperties._eTr.setLocale(newLocale);
    });
}
