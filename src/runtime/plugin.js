import {defineNuxtPlugin, useRuntimeConfig} from '#app'
import loadVueEyeinTranslation from "../../vue3.js";
import useLocale from "./composables/useLocale";

export default defineNuxtPlugin(async nuxtApp => {
    const localeState = useLocale();

    const options = useRuntimeConfig().public.vueEyeinTranslation;

    const vueEyeinTranslation = await loadVueEyeinTranslation({...options, localeState});
    nuxtApp.vueApp.use(vueEyeinTranslation);
})
