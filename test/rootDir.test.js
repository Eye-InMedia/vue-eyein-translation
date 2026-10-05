import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {build} from "vite";
import vue from "@vitejs/plugin-vue";
import viteEyeinTranslation from "../vite-plugin-vue-eyein-translation.js";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), `fixtures/macro-race`);

describe(`locale files location`, () => {
    const initialCwd = process.cwd();
    let cwdDir;
    let rootDir;

    beforeEach(() => {
        cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), `eyein-translation-cwd-`));
        rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `eyein-translation-root-`));
        fs.cpSync(fixtureDir, rootDir, {recursive: true});
        process.chdir(cwdDir);
    });

    afterEach(() => {
        process.chdir(initialCwd);
        fs.rmSync(cwdDir, {recursive: true, force: true});
        fs.rmSync(rootDir, {recursive: true, force: true});
    });

    it(`resolves assetsDir from the Vite root, not from the current working directory`, async () => {
        await build({
            root: rootDir,
            configFile: false,
            logLevel: `silent`,
            plugins: [
                viteEyeinTranslation({locales: [`en-US`, `fr-CA`], inlineLocales: `en-US||fr-CA`, assetsDir: `assets`, warnMissingTranslations: false}),
                vue()
            ],
            build: {
                write: false,
                lib: {entry: path.join(rootDir, `main.js`), formats: [`es`]},
                rollupOptions: {external: [`vue`]}
            }
        });

        const frLocale = JSON.parse(fs.readFileSync(path.join(rootDir, `assets/locales/fr-CA.locale`), `utf8`));
        expect(Object.values(frLocale).some(translation => translation.target === `Bonjour`)).toBe(true);
        expect(fs.existsSync(path.join(cwdDir, `assets`))).toBe(false);
    }, 30000);
});
