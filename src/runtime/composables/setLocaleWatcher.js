import {useNuxtApp, useCookie} from '#app'
import {watch} from 'vue'

export default function setLocaleWatcher() {
    const nuxtApp = useNuxtApp();

    const localeState = useCookie(`locale`, {secure: true, sameSite: true});

    watch(localeState, async (newLocale, oldLocale) => {
        nuxtApp.vueApp.config.globalProperties._eTr.setLocale(newLocale);
    });
}
