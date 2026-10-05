import {watch} from "vue";
import {matchSupportedLocale} from "./localeSelection.js";

export function createLocaleController({localeState, localeCookie, runtime, onError = console.error}) {
    let revision = 0, pending, disposed = false, restoring = false;
    let changed, notifyChange, lastFailure;
    const signalChange = () => {
        notifyChange?.();
        changed = new Promise((resolve) => {
            notifyChange = resolve;
        });
    };
    signalChange();
    const stop = watch(localeState, (requested) => {
        if (restoring) return;
        const current = ++revision;
        const locale = matchSupportedLocale(requested, runtime.getLocales());
        if (locale && locale !== requested) {
            restoring = true;
            localeState.value = locale;
            restoring = false;
        }
        pending = runtime.changeLocale(locale ?? requested);
        signalChange();
        pending.then(() => {
            if (!disposed && current === revision) localeCookie.value = locale;
        }, (error) => {
            if (disposed || current !== revision) return;
            lastFailure = {revision: current, error};
            const active = runtime.getLocale();
            if (active) {
                restoring = true;
                localeState.value = active;
                restoring = false;
                localeCookie.value = active;
                pending = Promise.resolve();
            }
            onError(error);
        });
    }, {immediate: true, flush: `sync`});

    return {
        async ready() {
            const previousFailure = lastFailure;
            while (!disposed) {
                const work = pending, observedRevision = revision;
                try {
                    await Promise.race([work, changed]);
                } catch (error) {
                    if (observedRevision !== revision) continue;
                    throw error;
                }
                if (lastFailure !== previousFailure && lastFailure?.revision === revision) throw lastFailure.error;
                if (work === pending && observedRevision === revision) return;
            }
        },
        dispose() {
            disposed = true;
            stop();
            notifyChange();
        }
    };
}
