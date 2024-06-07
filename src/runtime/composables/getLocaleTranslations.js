import {useNuxtApp} from '#app'

export default function getLocaleTranslations() {
    const nuxtApp = useNuxtApp();
    return nuxtApp.vueApp.config.globalProperties.getLocaleTranslations();
}
