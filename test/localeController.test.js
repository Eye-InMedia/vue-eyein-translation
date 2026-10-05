import {describe, expect, it, vi} from "vitest";
import {ref} from "vue";
import {runtimeSource, deferred} from "./helpers/runtimeSource.js";

async function controllerFixture(loaders = {}) {
    const {createLocaleController} = await import(`../src/runtime/js/localeController.js`);
    const {runtime} = await runtimeSource({locales: [`en-US`, `fr-CA`, `fil-PH`], loaders: {'/assets/locales/en-US.locale': async () => ({}), ...loaders}});
    const localeState = ref(`en-US`), localeCookie = ref();
    const onError = vi.fn();
    const controller = createLocaleController({localeState, localeCookie, runtime, onError});
    await controller.ready();
    return {controller, runtime, localeState, localeCookie, onError};
}

describe(`application locale controller`, () => {
    it(`persists only the latest successful switch and ignores obsolete failure`, async () => {
        const french = deferred(), filipino = deferred();
        const app = await controllerFixture({
            '/assets/locales/fr-CA.locale': () => french.promise,
            '/assets/locales/fil-PH.locale': () => filipino.promise
        });
        app.localeState.value = `fr-CA`;
        app.localeState.value = `fil-PH`;
        filipino.resolve({});
        await app.controller.ready();
        french.reject(new Error(`Old failed import`));
        await new Promise(resolve => setImmediate(resolve));
        expect(app.runtime.getLocale()).toBe(`fil-PH`);
        expect(app.localeState.value).toBe(`fil-PH`);
        expect(app.localeCookie.value).toBe(`fil-PH`);
        app.controller.dispose();
    });
    it(`rejects awaited failure while restoring the last working selection`, async () => {
        const french = deferred();
        const app = await controllerFixture({'/assets/locales/fr-CA.locale': () => french.promise});
        app.localeState.value = `fr-CA`;
        const ready = app.controller.ready();
        const assertion = expect(ready).rejects.toThrow(`Missing chunk`);
        french.reject(new Error(`Missing chunk`));
        await assertion;
        expect(app.localeState.value).toBe(`en-US`);
        expect(app.localeCookie.value).toBe(`en-US`);
        expect(app.runtime.getLocale()).toBe(`en-US`);
        expect(app.onError).toHaveBeenCalledOnce();
        app.controller.dispose();
    });
    it(`awaits changes arriving during readiness and stops observing after disposal`, async () => {
        const french = deferred();
        const app = await controllerFixture({'/assets/locales/fr-CA.locale': () => french.promise});
        const ready = app.controller.ready();
        app.localeState.value = `fr-CA`;
        let settled = false;
        ready.then(() => {
            settled = true;
        });
        await new Promise(resolve => setImmediate(resolve));
        expect(settled).toBe(false);
        french.resolve({});
        await ready;
        expect(app.localeCookie.value).toBe(`fr-CA`);
        app.controller.dispose();
        app.localeState.value = `en-US`;
        expect(app.runtime.getLocale()).toBe(`fr-CA`);
    });
    it(`rejects unsupported state changes without activating them`, async () => {
        const app = await controllerFixture();
        app.localeState.value = `xx-invalid`;
        await expect(app.controller.ready()).rejects.toThrow(/locale/i);
        expect(app.localeState.value).toBe(`en-US`);
        expect(app.runtime.getLocale()).toBe(`en-US`);
        app.controller.dispose();
    });
    it(`cancels an older successful load after an invalid selection rolls back`, async () => {
        const french = deferred();
        const app = await controllerFixture({'/assets/locales/fr-CA.locale': () => french.promise});
        app.localeState.value = `fr-CA`;
        app.localeState.value = `xx-invalid`;
        await expect(app.controller.ready()).rejects.toThrow(/locale/i);
        french.resolve({});
        await new Promise(resolve => setImmediate(resolve));
        expect(app.runtime.getLocale()).toBe(`en-US`);
        expect(app.localeState.value).toBe(`en-US`);
        expect(app.localeCookie.value).toBe(`en-US`);
        app.controller.dispose();
    });
    it(`rejects the failed navigation but allows navigation in the restored locale`, async () => {
        const french = deferred();
        const app = await controllerFixture({'/assets/locales/fr-CA.locale': () => french.promise});
        app.localeState.value = `fr-CA`;
        const navigation = app.controller.ready();
        french.reject(new Error(`Chunk unavailable`));
        await expect(navigation).rejects.toThrow(`Chunk unavailable`);
        expect(app.localeState.value).toBe(`en-US`);
        expect(app.runtime.getLocale()).toBe(`en-US`);
        expect(app.localeCookie.value).toBe(`en-US`);
        await expect(app.controller.ready()).resolves.toBeUndefined();
        expect(app.onError).toHaveBeenCalledOnce();
        app.controller.dispose();
    });
    it(`delivers the latest failure to a waiter before an obsolete load finishes`, async () => {
        const french = deferred(), filipino = deferred();
        const app = await controllerFixture({
            '/assets/locales/fr-CA.locale': () => french.promise,
            '/assets/locales/fil-PH.locale': () => filipino.promise
        });
        app.localeState.value = `fr-CA`;
        let failure;
        const navigation = app.controller.ready().catch((error) => {
            failure = error;
        });
        app.localeState.value = `fil-PH`;
        filipino.reject(new Error(`Latest chunk unavailable`));
        await new Promise(resolve => setImmediate(resolve));
        try {
            expect(failure?.message).toBe(`Latest chunk unavailable`);
            await expect(app.controller.ready()).resolves.toBeUndefined();
        } finally {
            french.resolve({});
            await navigation;
            app.controller.dispose();
        }
    });
});
