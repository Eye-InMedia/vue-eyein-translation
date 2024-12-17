import {useNuxtApp, useCookie} from '#app'
import {watch} from 'vue'

export default async function setLocaleWatcher() {
    const nuxtApp = useNuxtApp();

    const locale = useLocale();
    if (locale.value) {
        await nuxtApp.vueApp.config.globalProperties._eTr.setLocale(locale.value);
    }

    watch(locale, async (newLocale, oldLocale) => {
        nuxtApp.vueApp.config.globalProperties._eTr.setLocale(newLocale);
    });
}
