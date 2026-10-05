import {getNuxtTranslationRuntime} from "../js/runtimeContext.js";

/**
 *
 * @param value {string|Object}
 * @param data {Object} [data=null]
 * @param locale {string|null} [locale=null]
 * @returns {import("vue").ComputedRef<string>} translated text, updated when the locale changes
 */
export default function trComputed(value, data = null, locale = null) {
    return getNuxtTranslationRuntime().trComputed(value, data, locale);
}
