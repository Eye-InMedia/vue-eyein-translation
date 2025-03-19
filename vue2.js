import defaultOptions from "./src/defaultOptions.js";
import TComponent from "./src/runtime/components/vue2T.vue";
import _eTr from "./src/runtime/js/_eTr.js";

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

        app.prototype._eTr = eTr;
        app.prototype.tr = eTr.tr;
        app.prototype.trComputed = eTr.trComputed;
        app.prototype.getLocale = eTr.getLocale;
        app.prototype.getLocales = eTr.getLocales;
        app.prototype.setLocale = eTr.setLocale;
        app.prototype.loadLocale = eTr.loadLocale;
        app.prototype.staticTr = compiledThrow;
        app.prototype.staticTr = compiledThrow;

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
