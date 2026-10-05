import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {describe, it, expect, beforeEach, afterEach} from "vitest";
import saveLocales from "../src/vite/saveLocales.js";

const locales = [`en-US`, `fr-CA`];

function createCtx(options = {}) {
    return {
        options: {locales, inlineLocales: `en-US||fr-CA`, assetsDir: `assets`, purgeOldTranslations: false, autoTranslate: {}, ...options},
        translations: {
            "en-US": {zzhello: {source: `Hello`, target: `Hello`}},
            "fr-CA": {zzhello: {source: `Hello`, target: `Bonjour`}}
        },
        rootDir: process.cwd(),
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

    it(`keeps translations stored as plain strings`, async () => {
        const ctx = createCtx({purgeOldTranslations: true});
        ctx.translations[`fr-CA`].myid = `Salut`;

        await saveLocales(ctx);

        expect(readLocale(`fr-CA`).myid).toBe(`Salut`);
    });

    it(`sorts locale files the same way whatever the system locale`, () => {
        const saveLocalesPath = fileURLToPath(new URL(`../src/vite/saveLocales.js`, import.meta.url));
        const script = `
            import saveLocales from ${JSON.stringify(saveLocalesPath)};
            const translations = {zz1: {source: \`z\`}, zz2: {source: \`ä\`}, zz3: {source: \`aa\`}, zz4: {source: \`å\`}};
            await saveLocales({options: {locales: [\`en-US\`], assetsDir: \`assets\`, autoTranslate: {}}, rootDir: process.cwd(), translations: {"en-US": translations}, hmr: false});
            process.stdout.write(Object.keys(JSON.parse((await import(\`node:fs\`)).readFileSync(\`assets/locales/en-US.locale\`, \`utf8\`))).join());
        `;
        const order = (systemLocale) => {
            fs.rmSync(`assets/locales/en-US.locale`, {force: true});
            return execFileSync(process.execPath, [`--input-type=module`, `-e`, script], {env: {...process.env, LC_ALL: systemLocale}, encoding: `utf8`});
        };

        expect(order(`sv_SE.UTF-8`)).toBe(order(`en_US.UTF-8`));
    });
});
