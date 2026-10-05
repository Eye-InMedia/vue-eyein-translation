import {watch} from "vue";
import {matchSupportedLocale} from "./localeSelection.js";

export function createLocaleController({localeState, localeCookie, runtime, onError = console.error}) {
    let revision = 0, pending, disposed = false, restoring = false;
    const stop = watch(localeState, (requested) => {
        if (restoring) return;
        const current = ++revision;
        const locale = matchSupportedLocale(requested, runtime.getLocales());
        if (locale && locale !== requested) {
            restoring = true;
            localeState.value = locale;
            restoring = false;
        }
        pending = locale ? runtime.changeLocale(locale) : Promise.reject(new Error(`Unsupported locale "${requested}"`));
        pending.then(() => {
            if (!disposed && current === revision) localeCookie.value = locale;
        }, (error) => {
            if (disposed || current !== revision) return;
            const active = runtime.getLocale();
            if (active) {
                restoring = true;
                localeState.value = active;
                restoring = false;
                localeCookie.value = active;
            }
            onError(error);
        });
    }, {immediate: true, flush: `sync`});

    return {
        async ready() {
            while (!disposed) {
                const work = pending;
                try {
                    await work;
                } catch (error) {
                    if (work !== pending) continue;
                    throw error;
                }
                if (work === pending) return;
            }
        },
        dispose() {
            disposed = true;
            stop();
        }
    };
}
