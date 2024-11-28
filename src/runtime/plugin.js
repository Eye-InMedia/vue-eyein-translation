import {defineNuxtPlugin, useRuntimeConfig, useRequestHeaders, useCookie} from '#app'
import loadVueEyeinTranslation from "../../vue3.js";
import {parseNavigatorLanguage} from "../vue/vue-plugin-functions.js";

export default defineNuxtPlugin(async nuxtApp => {
    let navigatorLocaleString;
    if (process.server) {
        const headers = useRequestHeaders([`accept-language`])
        if (headers[`accept-language`]) {
            navigatorLocaleString = headers[`accept-language`]
        }
    } else {
        navigatorLocaleString = navigator.language
    }

    const options = useRuntimeConfig().public.vueEyeinTranslation;
    let locale = parseNavigatorLanguage(navigatorLocaleString, options);

    if (!locale) {
        locale = options.locales[0];
    }

    const localeState = useCookie(`locale`, {secure: true, sameSite: true});
    localeState.value ||= locale;

    const vueEyeinTranslation = await loadVueEyeinTranslation({...options, localeState});
    nuxtApp.vueApp.use(vueEyeinTranslation);
})
