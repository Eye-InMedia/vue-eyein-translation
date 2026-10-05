import {useNuxtApp} from "#app";

export function localeCookieOptions(url) {
    return {path: `/`, sameSite: `strict`, secure: url.protocol === `https:`};
}

export function getNuxtTranslationRuntime() {
    const runtime = useNuxtApp().$eyeinTranslation;
    if (!runtime) throw new Error(`Eye-In Translation Nuxt runtime is not initialized`);
    return runtime;
}
