import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/runtime/components/t.vue";
import _eTr from "./src/vue/_eTr.js";

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
        app.provide(`locale`, _eTr.locale);
        app.provide(`setLocale`, _eTr.setLocale);
        app.provide(`loadLocale`, _eTr.loadLocale);
        app.provide(`staticTr`, compiledThrow);

        app.directive(`t`, {
            bind: compiledThrow,
            update: compiledThrow,
            mounted: compiledThrow,
            updated: compiledThrow
        });

        app.component(`t`, TComponent);
    }
}
