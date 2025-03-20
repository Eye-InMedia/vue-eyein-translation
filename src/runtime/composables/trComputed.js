import _eTr from "../js/_eTr.js";

/**
 *
 * @param value {string|Object}
 * @param data {Object} [data=null]
 * @param locale {string|null} [locale=null]
 * @returns {string}
 */
export default function tr(value, data = null, locale = null) {
    return _eTr.trComputed(value, data, locale);
}
