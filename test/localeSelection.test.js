import {afterEach, describe, expect, it, vi} from "vitest";
import {negotiateAcceptLanguage} from "../src/runtime/js/localeSelection.js";
import {runtimeSource} from "./helpers/runtimeSource.js";

const locales = [`en-US`, `fi-FI`, `fil-PH`, `fr-CA`];
afterEach(() => vi.unstubAllGlobals());

describe(`runtime locale detection`, () => {
    it.each([[`FR-CA`, `fr-CA`], [`fil`, `fil-PH`], [` fr-CA `, `fr-CA`]])(`matches %s to configured spelling %s`, async (preference, expected) => {
        const {runtime} = await runtimeSource({locales});
        expect(runtime.getNearestLocale([preference])).toBe(expected);
    });
    it(`ignores malformed preference values`, async () => {
        const {runtime} = await runtimeSource({locales});
        expect(runtime.getNearestLocale([null, ``, `xx`, `fr`])).toBe(`fr-CA`);
    });
    it(`detects navigator preferences when storage is inaccessible`, async () => {
        const {runtime} = await runtimeSource({locales});
        vi.stubGlobal(`navigator`, {languages: [`fr-CA`]});
        vi.stubGlobal(`localStorage`, {getItem() {
            throw new Error(`Storage denied`);
        }});
        expect(runtime.detectBrowserLocale()).toBe(`fr-CA`);
    });
    it(`returns the default outside a browser`, async () => {
        const {runtime} = await runtimeSource({locales});
        vi.stubGlobal(`localStorage`, undefined);
        vi.stubGlobal(`navigator`, undefined);
        expect(runtime.detectBrowserLocale()).toBe(`en-US`);
    });
    it(`ignores unsupported stored preferences and falls back to navigator.language`, async () => {
        const {runtime} = await runtimeSource({locales});
        vi.stubGlobal(`localStorage`, {getItem: () => `xx-invalid`});
        vi.stubGlobal(`navigator`, {languages: [], language: `fr`});
        expect(runtime.detectBrowserLocale()).toBe(`fr-CA`);
    });
});

describe(`Accept-Language selection`, () => {
    it.each([
        [`fr-CA;q=0.1,en-US;q=1`, `en-US`],
        [`fr-CA;q=0.5,en-US;q=0.5`, `fr-CA`],
        [` FR-ca ; q=0.9 , en-US;q=0.1`, `fr-CA`],
        [`fr;q=0,en;q=0.8`, `en-US`],
        [`en;q=0,*;q=1`, `fi-FI`],
        [`*;q=0,fr-CA;q=1`, `fr-CA`],
        [`fr;q=garbage,en;q=0.3`, `en-US`],
        [`fr;q=1.1,en;q=0.3`, `en-US`],
        [`xx-invalid`, `en-US`],
        [`fr-FR`, `fr-CA`],
        [`fr;q=0,*;q=0`, `en-US`],
    ])(`negotiates %s as %s`, async (header, expected) => {
        const {negotiateAcceptLanguage} = await import(`../src/runtime/js/localeSelection.js`);
        expect(negotiateAcceptLanguage(header, locales)).toBe(expected);
    });
    it(`does not reintroduce an excluded regional locale through its base language`, async () => {
        const {negotiateAcceptLanguage} = await import(`../src/runtime/js/localeSelection.js`);
        expect(negotiateAcceptLanguage(`en-US;q=0,en;q=1`, [`en-US`, `en-GB`, `fr-CA`])).toBe(`en-GB`);
    });
    it(`handles blocked storage getters and malformed input`, async () => {
        const {detectBrowserLocale, matchSupportedLocale} = await import(`../src/runtime/js/localeSelection.js`);
        const environment = {navigator: {language: `FR-CA`}, get localStorage() {
            throw new Error(`Denied`);
        }};
        expect(detectBrowserLocale(locales, environment)).toBe(`fr-CA`);
        expect(matchSupportedLocale(`@@fr`, locales)).toBeNull();
    });
});

it.each([`en-GB;q=1,en;q=0,fr;q=0.5`, `en;q=0,en-GB;q=1,fr;q=0.5`])(`constrains unsupported-region fallback by the explicit language exclusion: %s`, (header) => {
    expect(negotiateAcceptLanguage(header, [`en-US`, `fr-CA`])).toBe(`fr-CA`);
});
