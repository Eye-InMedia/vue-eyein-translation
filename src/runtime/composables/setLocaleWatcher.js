import {useNuxtApp, useCookie} from '#app'
import {watch} from 'vue'

export default function setLocaleWatcher() {
    const nuxtApp = useNuxtApp();

    const locale = useLocale();
    if (locale.value) {
        nuxtApp.vueApp.config.globalProperties._eTr.setLocaleSync(locale.value);
    }

    watch(locale, async (newLocale, oldLocale) => {
        nuxtApp.vueApp.config.globalProperties._eTr.setLocaleSync(newLocale);
    });
}
