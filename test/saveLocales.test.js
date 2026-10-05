import {describe, it, expect, beforeEach, afterEach} from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import saveLocales from "../src/vite/saveLocales.js";

const locales = [`en-US`, `fr-CA`];

function createCtx(options = {}) {
    return {
        options: {locales, inlineLocales: `en-US||fr-CA`, assetsDir: `assets`, purgeOldTranslations: false, autoTranslate: {}, ...options},
        translations: {
            "en-US": {zzhello: {source: `Hello`, target: `Hello`}},
            "fr-CA": {zzhello: {source: `Hello`, target: `Bonjour`}}
        },
        hmr: false
    };
}

function readLocale(locale) {
    return JSON.parse(fs.readFileSync(path.join(`assets/locales`, `${locale}.locale`), `utf8`));
}

describe(`saveLocales`, () => {
    const initialCwd = process.cwd();
    let tmpDir;

    beforeEach(() => {
        // saveLocales writes locale files relative to cwd
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `eyein-translation-test-`));
        process.chdir(tmpDir);
        fs.mkdirSync(`assets/locales`, {recursive: true});
    });

    afterEach(() => {
        process.chdir(initialCwd);
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it(`saves a changed locale even when a previous locale is unchanged`, async () => {
        await saveLocales(createCtx());

        const ctx = createCtx();
        ctx.translations[`fr-CA`].zzhello.target = `Salut`;
        await saveLocales(ctx);

        expect(readLocale(`fr-CA`).zzhello.target).toBe(`Salut`);
    });

    it(`writes automatic translations to the locale file`, async () => {
        const ctx = createCtx({
            autoTranslate: {
                locales: [`fr-CA`],
                translationFunction: async (from, to, texts) => texts.map(text => `FR ${text}`)
            }
        });
        ctx.translations[`fr-CA`].zzhello.target = ``;

        await saveLocales(ctx);

        expect(readLocale(`fr-CA`).zzhello.target).toBe(`FR Hello`);
    });
});
