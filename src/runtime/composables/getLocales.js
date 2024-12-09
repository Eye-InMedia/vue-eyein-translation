import {useNuxtApp} from '#app'

/**
 *
 * @returns {Array<string>}
 */
export default function getLocales() {
    const nuxtApp = useNuxtApp();
    return nuxtApp.vueApp.config.globalProperties._eTr.getLocales();
}
