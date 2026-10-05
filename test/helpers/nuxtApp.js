import {ref} from "vue";

let current;
export function setNuxtApp(app) {
    current = app;
}
export function useNuxtApp() {
    if (!current) throw new Error(`No Nuxt application context`);
    return current;
}
export function useState(key) {
    const app = useNuxtApp();
    app.states ||= {};
    return app.states[key] ||= ref();
}
export function useCookie(key, options) {
    const app = useNuxtApp();
    app.cookies ||= {};
    app.cookieOptions = options;
    return app.cookies[key] ||= ref();
}
export function useRequestHeaders() {
    return useNuxtApp().headers || {};
}
export function useRequestURL(options) {
    const app = useNuxtApp();
    const url = new URL(app.url || `http://localhost`);
    if (options?.xForwardedProto && app.headers?.[`x-forwarded-proto`]) url.protocol = app.headers[`x-forwarded-proto`];
    return url;
}
export function defineNuxtPlugin(plugin) {
    return typeof plugin === `function` ? plugin : plugin.setup;
}
