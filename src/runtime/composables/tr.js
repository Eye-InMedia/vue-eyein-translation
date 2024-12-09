import {useNuxtApp} from '#app'

/**
 *
 * @param value {string|Object}
 * @param data {Object} [data=null]
 * @param locale {string|null} [locale=null]
 * @returns {string}
 */
export default function tr(value, data = null, locale = null) {
    const nuxtApp = useNuxtApp();
    return nuxtApp.vueApp.config.globalProperties._eTr.tr(value, data, locale);
}
