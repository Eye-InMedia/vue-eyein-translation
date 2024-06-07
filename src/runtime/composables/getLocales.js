import {useNuxtApp} from '#app'

export default function getLocales() {
    const nuxtApp = useNuxtApp();
    return nuxtApp.vueApp.config.globalProperties.getLocales();
}
