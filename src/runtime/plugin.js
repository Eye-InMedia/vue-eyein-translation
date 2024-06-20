import {defineNuxtPlugin, useRuntimeConfig, useRequestHeaders, useCookie} from '#app'
import loadVueEyeinTranslation from "../../vue3.js";

export default defineNuxtPlugin(async nuxtApp => {
    let locale;
    if (process.server) {
        const headers = useRequestHeaders([`accept-language`])
        if (headers[`accept-language`]) {
            locale = headers[`accept-language`].substring(0, 5)
        }
    } else {
        locale = navigator.language.substring(0, 5)
    }

    const options = useRuntimeConfig().public.vueEyeinTranslation;

    if (!locale) {
        locale = options.locales[0];
    }

    const localeState = useCookie(`locale`, {secure: true, sameSite: true});
    localeState.value ||= locale;


    const vueEyeinTranslation = await loadVueEyeinTranslation({...options, localeState});
    nuxtApp.vueApp.use(vueEyeinTranslation);
})
