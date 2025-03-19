import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/runtime/components/t.vue";
import _eTr  from "./src/runtime/js/_eTr.js";

export default {
    async loadLocale(locale) {
        await _eTr.loadLocale(locale);
        _eTr.setLocale(locale);
    },
    async loadBrowserLocale() {
        const locale = _eTr.detectBrowserLocale();
        await _eTr.loadLocale(locale);
        _eTr.setLocale(locale);
    },
    install(app, options) {
        options = {...defaultOptions, ...options};

        if (options.locales.length === 0) {
            throw new Error(`locales option cannot be empty`);
        }

        function compiledThrow() {
            throw new Error(`Should never be called. Modified at compile time.`)
        }

        const eTr = options._eTr || _eTr;

        app.config.globalProperties._eTr = eTr;
        app.provide(`_eTr`, eTr);
        app.provide(`tr`, eTr.tr);
        app.provide(`trComputed`, eTr.trComputed);
        app.provide(`setLocale`, eTr.setLocale);
        app.provide(`getLocale`, eTr.getLocale);
        app.provide(`getLocales`, eTr.getLocales);
        app.provide(`loadLocale`, eTr.loadLocale);
        app.provide(`staticTr`, compiledThrow);
        app.provide(`staticTrComputed`, compiledThrow);

        app.directive(`t`, {
            bind: eTr.mountedUpdated,
            update: eTr.mountedUpdated,
            mounted: eTr.mountedUpdated,
            updated: eTr.mountedUpdated,
            getSSRProps: eTr.getSSRProps
        });

        app.component(`t`, TComponent);
    }
}
