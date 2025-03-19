import {useRequestHeaders, useCookie, useState} from '#app'
import _eTr from "../js/_eTr.js";

/**
 *
 * @returns {Ref<string>}
 */
export default function useLocale() {
    const localeState = useState(`locale`);
    const localeCookie = useCookie(`locale`, {secure: true, sameSite: true});

    if (!localeState.value) {
        localeState.value = localeCookie.value;
    }

    if (localeState.value) {
        return localeState;
    }

    let locale;
    if (process.server) {
        const headers = useRequestHeaders([`accept-language`]);
        if (headers[`accept-language`]) {
            const navigatorLocales = headers[`accept-language`]
                .split(`,`)
                .map(weightedLocale => {
                    return weightedLocale.split(`;`).shift();
                });
            locale = _eTr.getNearestLocale(navigatorLocales);
        }
    } else {
        locale = _eTr.getNearestLocale(navigator.languages);
    }

    localeState.value = locale;
    localeCookie.value = locale;

    return localeState;
}
