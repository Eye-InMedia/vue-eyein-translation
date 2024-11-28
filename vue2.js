import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/runtime/components/vue2T.vue";
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

        app.prototype._eTr = _eTr;
        app.prototype.tr = _eTr.tr;
        app.prototype.locale = _eTr.locale;
        app.prototype.locales = _eTr.locales;
        app.prototype.getLocale = _eTr.getLocale;
        app.prototype.getLocales = _eTr.getLocales;
        app.prototype.setLocale = _eTr.setLocale;
        app.prototype.loadLocale = _eTr.loadLocale;
        app.prototype.staticTr = _eTr.staticTr;

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
