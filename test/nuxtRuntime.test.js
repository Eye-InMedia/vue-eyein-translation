import {beforeEach, afterEach, describe, expect, it, vi} from "vitest";
import {ref} from "vue";
import useLocale from "../src/runtime/composables/useLocale.js";
import {setNuxtApp} from "./helpers/nuxtApp.js";

vi.mock(`../src/runtime/js/_eTr.js`, async () => {
    const {runtimeSource} = await import(`./helpers/runtimeSource.js`);
    const {runtime, create} = await runtimeSource();
    return {default: runtime, createTranslationRuntime: create};
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
