import _eTr from "../js/_eTr.js";
import {matchSupportedLocale, nearestLocale, negotiateAcceptLanguage} from "../js/localeSelection.js";
import {localeCookieOptions} from "../js/runtimeContext.js";
import {useRequestHeaders, useCookie, useState, useRequestURL} from '#app';

/** @returns {import("vue").Ref<string>} current requested locale */
export default function useLocale() {
    const state = useState(`locale`);
    const locales = _eTr.getLocales();
    const cookie = useCookie(`locale`, localeCookieOptions(useRequestURL({xForwardedProto: true})));
    const existing = matchSupportedLocale(state.value, locales);
    if (existing) {
        state.value = existing;
        return state;
    }
    const stored = matchSupportedLocale(cookie.value, locales);
    if (stored) state.value = stored;
    else if (import.meta.server) state.value = negotiateAcceptLanguage(useRequestHeaders([`accept-language`])[`accept-language`], locales);
    else {
        let preferences = [];
        try {
            preferences = [...(globalThis.navigator?.languages || []), globalThis.navigator?.language];
        } catch {
            // Navigator can be unavailable during client-only startup.
        }
        state.value = nearestLocale(preferences, locales);
    }
    return state;
}
