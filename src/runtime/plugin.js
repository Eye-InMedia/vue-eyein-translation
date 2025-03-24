import {defineNuxtPlugin, useCookie} from '#app'
import vuePlugin from "../../vue3.js";
import _eTr from "./js/_eTr.js";
import {watch} from "vue";
import useLocale from "./composables/useLocale.js";

export default defineNuxtPlugin(async nuxtApp => {
    const locale = useLocale();
    const localeCookie = useCookie(`locale`, {secure: true, sameSite: true});

    await nuxtApp.runWithContext(async () => {
        await _eTr.loadLocale(locale.value);
        _eTr.setLocale(locale.value);

        watch(locale, async newLocale => {
            localeCookie.value = newLocale;

            await _eTr.loadLocale(newLocale);
            _eTr.setLocale(newLocale);
        });

        // Vue Plugin
        nuxtApp.vueApp.use({install: vuePlugin.install}, {_eTr});
    });
});

