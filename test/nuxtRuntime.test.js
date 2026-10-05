import {beforeEach, afterEach, describe, expect, it, vi} from "vitest";
import {ref, createSSRApp} from "vue";
import tr from "../src/runtime/composables/tr.js";
import trComputed from "../src/runtime/composables/trComputed.js";
import nuxtPlugin from "../src/runtime/plugin.js";
import useLocale from "../src/runtime/composables/useLocale.js";
import {runtimeSource} from "./helpers/runtimeSource.js";
import {setNuxtApp} from "./helpers/nuxtApp.js";

const controls = vi.hoisted(() => ({create: null}));

vi.mock(`../src/runtime/js/_eTr.js`, async () => {
    const {runtimeSource} = await import(`./helpers/runtimeSource.js`);
    const {runtime, create} = await runtimeSource({loaders: {
        '/assets/locales/en-US.locale': async () => ({}),
        '/assets/locales/fr-CA.locale': async () => ({})
    }});
    return {default: runtime, createTranslationRuntime: (...args) => (controls.create || create)(...args)};
});

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => setNuxtApp({}));

describe(`Nuxt locale initialization`, () => {
    it(`rejects an invalid cookie and detects a supported preference`, () => {
        setNuxtApp({cookies: {locale: ref(`xx-invalid`)}, headers: {"accept-language": `fr-CA`}});
        expect(useLocale().value).toBe(`fr-CA`);
    });
    it(`honors weighted headers with no existing preference`, () => {
        setNuxtApp({headers: {"accept-language": `fr-CA;q=0.1,en-US;q=1`}});
        expect(useLocale().value).toBe(`en-US`);
    });
    it(`keeps valid payload state over disagreeing cookie and navigator`, () => {
        setNuxtApp({states: {locale: ref(`fr-CA`)}, cookies: {locale: ref(`en-US`)}});
        vi.stubGlobal(`navigator`, {languages: [`en-US`]});
        const first = useLocale();
        expect(first.value).toBe(`fr-CA`);
        expect(useLocale()).toBe(first);
    });
    it(`uses HTTPS cookie flags while permitting local HTTP`, () => {
        const app = {url: `http://localhost`};
        setNuxtApp(app);
        useLocale();
        expect(app.cookieOptions).toMatchObject({path: `/`, sameSite: `strict`, secure: false});
    });
});

function appContext(locale) {
    const hooks = {};
    const app = {
        states: {locale: ref(locale)}, cookies: {}, hooks: {hook(name, handler) { hooks[name] = handler; }},
        vueApp: createSSRApp({render: () => null}),
        runWithContext(callback) {
            setNuxtApp(app);
            return callback();
        },
        provide(name, value) { app[`$${name}`] = value; },
        hook(name, handler) { hooks[name] = handler; }
    };
    return app;
}

describe(`Nuxt request context`, () => {
    it(`retains the owning application in translations and computed callbacks`, async () => {
        const fixture = await runtimeSource({loaders: {
            '/assets/locales/en-US.locale': async () => ({}),
            '/assets/locales/fr-CA.locale': async () => ({})
        }});
        controls.create = fixture.create;
        const english = appContext(`en-US`), french = appContext(`fr-CA`);
        const messages = {"en-US": `Hello`, "fr-CA": `Bonjour`};
        setNuxtApp(english);
        await nuxtPlugin(english);
        const computed = trComputed(messages);
        setNuxtApp(french);
        await nuxtPlugin(french);
        expect(tr(messages)).toBe(`Bonjour`);
        setNuxtApp(english);
        expect(tr(messages)).toBe(`Hello`);
        expect(computed.value).toBe(`Hello`);
        expect(english.vueApp.config.globalProperties._eTr).toBe(english.$eyeinTranslation);
    });
});

it(`waits after route middleware selects a not-yet-loaded language`, async () => {
    const {createRouter, createMemoryHistory} = await import(`vue-router`);
    const {deferred} = await import(`./helpers/runtimeSource.js`);
    const waiting = deferred(), started = deferred();
    const {create} = await runtimeSource({loaders: {
        '/assets/locales/en-US.locale': async () => ({}),
        '/assets/locales/fr-CA.locale': () => {
            started.resolve();
            return waiting.promise;
        }
    }});
    controls.create = create;
    const app = appContext(`en-US`);
    app.$router = createRouter({history: createMemoryHistory(), routes: [{path: `/fr`, component: {render: () => null}}]});
    app.$router.beforeEach(() => app.runWithContext(() => {
        useLocale().value = `fr-CA`;
    }));
    setNuxtApp(app);
    await nuxtPlugin(app);
    let complete = false;
    const navigation = app.$router.push(`/fr`).then(() => {
        complete = true;
    });
    await started.promise;
    await new Promise(resolve => setImmediate(resolve));
    try {
        expect(complete).toBe(false);
    } finally {
        waiting.resolve({});
        await navigation;
    }
    expect(app.$eyeinTranslation.getLocale()).toBe(`fr-CA`);
});

it(`requires an initialized Nuxt runtime instead of using shared state`, () => {
    setNuxtApp({});
    expect(() => tr({"en-US": `Hello`})).toThrow(/initialized/);
});

it.each([`https://example.test`, `http://localhost`])(`uses the effective %s cookie scheme`, (url) => {
    const app = {url, headers: {"x-forwarded-proto": `https`}};
    setNuxtApp(app);
    useLocale();
    expect(app.cookieOptions.secure).toBe(true);
});

it(`stops observing request state after SSR completion`, async () => {
    const {create} = await runtimeSource({loaders: {
        '/assets/locales/en-US.locale': async () => ({}),
        '/assets/locales/fr-CA.locale': async () => ({})
    }});
    controls.create = create;
    const app = appContext(`en-US`);
    const handlers = {};
    app.hook = (name, callback) => {
        handlers[name] = callback;
    };
    setNuxtApp(app);
    await nuxtPlugin(app);
    handlers[`app:rendered`]();
    useLocale().value = `fr-CA`;
    await new Promise(resolve => setImmediate(resolve));
    expect(app.$eyeinTranslation.getLocale()).toBe(`en-US`);
});
