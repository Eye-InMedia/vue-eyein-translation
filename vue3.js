import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/runtime/components/t.vue";
import _eTr from "./src/runtime/js/_eTr.js";

export default {
    install(app, options) {
        options = {...defaultOptions, ...options};

        if (options.locales.length === 0) {
            throw new Error(`locales option cannot be empty`);
        }

        function compiledThrow() {
            throw new Error(`Should never be called. Modified at compile time.`)
        }

        app.config.globalProperties._eTr = _eTr
        app.provide(`_eTr`, _eTr);
        app.provide(`tr`, _eTr.tr);
        app.provide(`trComputed`, _eTr.trComputed);
        app.provide(`locale`, _eTr.locale);
        app.provide(`locales`, _eTr.locales);
        app.provide(`setLocale`, _eTr.setLocale);
        app.provide(`getLocale`, _eTr.getLocale);
        app.provide(`getLocales`, _eTr.getLocales);
        app.provide(`loadLocale`, _eTr.loadLocale);
        app.provide(`staticTr`, compiledThrow);
        app.provide(`staticTrComputed`, compiledThrow);

        app.directive(`t`, {
            bind: _eTr.mountedUpdated,
            update: _eTr.mountedUpdated,
            mounted: _eTr.mountedUpdated,
            updated: _eTr.mountedUpdated,
            getSSRProps: _eTr.getSSRProps
        });

        app.component(`t`, TComponent);
    }
}
