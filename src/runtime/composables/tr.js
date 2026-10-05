import {getNuxtTranslationRuntime} from "../js/runtimeContext.js";

/**
 *
 * @param value {string|Object}
 * @param data {Object} [data=null]
 * @param locale {string|null} [locale=null]
 * @returns {string} translated text
 */
export default function tr(value, data = null, locale = null) {
    return getNuxtTranslationRuntime().tr(value, data, locale);
}
