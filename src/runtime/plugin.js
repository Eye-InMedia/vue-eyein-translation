import vuePlugin from "../../vue3.js";
import {createTranslationRuntime} from "./js/_eTr.js";
import {createLocaleController} from "./js/localeController.js";
import {localeCookieOptions} from "./js/runtimeContext.js";
import useLocale from "./composables/useLocale.js";
import {defineNuxtPlugin, useCookie, useRequestURL} from '#app';

export default defineNuxtPlugin(async (nuxtApp) => {
    const locale = useLocale();
    const localeCookie = useCookie(`locale`, localeCookieOptions(useRequestURL({xForwardedProto: true})));
    const runtime = createTranslationRuntime();
    nuxtApp.provide(`eyeinTranslation`, runtime);
    nuxtApp.vueApp.use({install: vuePlugin.install}, {_eTr: runtime});
    const controller = createLocaleController({localeState: locale, localeCookie, runtime});
    const unregister = nuxtApp.$router?.beforeResolve?.(() => controller.ready());
    const dispose = () => {
        unregister?.();
        controller.dispose();
    };
    nuxtApp.hook(`app:created`, () => controller.ready());
    if (import.meta.server) nuxtApp.hook(`app:rendered`, dispose);
    else if (nuxtApp.vueApp.onUnmount) nuxtApp.vueApp.onUnmount(dispose);
    else nuxtApp.vueApp.mixin({beforeUnmount() {
        if (this === this.$root) dispose();
    }});
    await controller.ready();
});
