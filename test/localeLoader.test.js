import {describe, expect, it, vi} from "vitest";
import {runtimeSource, deferred} from "./helpers/runtimeSource.js";

const main = `/assets/locales/fr-CA.locale`;
const extra = `/extra/locales/fr-CA.locale`;

describe(`complete locale imports`, () => {
    it(`does not complete concurrent callers until every dictionary is loaded`, async () => {
        const started = deferred(), remaining = deferred();
        const first = vi.fn(async () => ({first: `Bonjour`}));
        const {runtime} = await runtimeSource({additionalLocalesDirs: [`extra/locales`], loaders: {
            [main]: first,
            [extra]: () => {
                started.resolve();
                return remaining.promise;
            }
        }});
        const a = runtime.loadLocale(`fr-CA`);
        await started.promise;
        let complete = false;
        const b = runtime.loadLocale(`fr-CA`).then(() => {
            complete = true;
        });
        await new Promise(resolve => setImmediate(resolve));
        try {
            expect(complete).toBe(false);
            expect(runtime.tr({id: `first`}, null, `fr-CA`)).toContain(`Missing`);
        } finally {
            remaining.resolve({second: `Au revoir`});
            await Promise.all([a, b]);
        }
        expect(runtime.tr({id: `second`}, null, `fr-CA`)).toBe(`Au revoir`);
        expect(first).toHaveBeenCalledTimes(1);
    });
    it(`rejects incomplete loads and retries without publishing partial data`, async () => {
        const broken = vi.fn().mockRejectedValueOnce(new Error(`Chunk unavailable`)).mockResolvedValue({second: `Au revoir`});
        const {runtime} = await runtimeSource({additionalLocalesDirs: [`extra/locales`], loaders: {
            [main]: async () => ({first: `Bonjour`}), [extra]: broken
        }});
        await expect(runtime.loadLocale(`fr-CA`)).rejects.toThrow(`Chunk unavailable`);
        expect(runtime.tr({id: `first`}, null, `fr-CA`)).toContain(`Missing`);
        await runtime.loadLocale(`fr-CA`);
        expect(runtime.tr({id: `second`}, null, `fr-CA`)).toBe(`Au revoir`);
    });
    it(`loads only exact filenames and directory boundaries`, async () => {
        const {runtime} = await runtimeSource({loaders: {
            [main]: async () => ({greeting: `Bonjour`}),
            '/assets-other/locales/fr-CA.locale': async () => ({greeting: `Wrong directory`}),
            '/assets/locales/not-fr-CA.locale': async () => ({greeting: `Wrong locale`})
        }});
        await runtime.loadLocale(`fr-CA`);
        expect(runtime.tr({id: `greeting`}, null, `fr-CA`)).toBe(`Bonjour`);
    });
    it(`preserves main precedence and own prototype-like translation IDs`, async () => {
        const {runtime} = await runtimeSource({additionalLocalesDirs: [`extra/locales`], loaders: {
            [main]: async () => JSON.parse(`{"greeting":"Bonjour","constructor":"Constructeur","__proto__":"Prototype"}`),
            [extra]: async () => ({greeting: `Wrong precedence`, extra: `Extra`})
        }});
        await runtime.loadLocale(`fr-CA`);
        expect(runtime.tr({id: `greeting`}, null, `fr-CA`)).toBe(`Bonjour`);
        expect(runtime.tr({id: `constructor`}, null, `fr-CA`)).toBe(`Constructeur`);
        expect(runtime.tr({id: `__proto__`}, null, `fr-CA`)).toBe(`Prototype`);
    });
    it(`accepts empty dictionaries but rejects missing assets and unconfigured locales`, async () => {
        const {runtime} = await runtimeSource({loaders: {[main]: async () => ({})}});
        await expect(runtime.loadLocale(`fr-CA`)).resolves.toBeUndefined();
        await expect(runtime.loadLocale(`en-US`)).rejects.toThrow(/locale/i);
        await expect(runtime.loadLocale(`xx-invalid`)).rejects.toThrow(/locale/i);
    });
});
