import _eTr from "../js/_eTr.js";

/**
 *
 * @param value {string|Object}
 * @param data {Object} [data=null]
 * @param locale {string|null} [locale=null]
 * @returns {import("vue").ComputedRef<string>} translated text, updated when the locale changes
 */
export default function trComputed(value, data = null, locale = null) {
    return _eTr.trComputed(value, data, locale);
}
