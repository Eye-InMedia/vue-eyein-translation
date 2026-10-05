import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {build} from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import viteEyeinTranslation from "../vite-plugin-vue-eyein-translation.js";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), `fixtures/macro-race`);

const unusedTranslation = {source: `Old text`, target: `Ancien texte`, delete_when_unused: true};

describe(`locale files when the build fails`, () => {
    const initialCwd = process.cwd();
    let tmpDir;

    beforeEach(() => {
        // loadLocales/saveLocales read and write locale files relative to cwd
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `eyein-translation-test-`));
        process.chdir(tmpDir);
        fs.mkdirSync(`assets/locales`, {recursive: true});
        for (const locale of [`en-US`, `fr-CA`]) {
            fs.writeFileSync(`assets/locales/${locale}.locale`, JSON.stringify({zzold: unusedTranslation}));
        }
    });

    afterEach(() => {
        process.chdir(initialCwd);
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it(`does not save nor purge locale files`, async () => {
        const failingPlugin = {
            name: `failing-plugin`,
            transform(code, id) {
                if (id.endsWith(`main.js`)) {
                    throw new Error(`Simulated build error`);
                }
            }
        };

        await expect(build({
            root: fixtureDir,
            configFile: false,
            logLevel: `silent`,
            plugins: [
                viteEyeinTranslation({locales: [`en-US`, `fr-CA`], inlineLocales: `en-US||fr-CA`, assetsDir: `assets`, purgeOldTranslations: true, warnMissingTranslations: false}),
                vue(),
                failingPlugin
            ],
            build: {
                write: false,
                lib: {entry: path.join(fixtureDir, `main.js`), formats: [`es`]},
                rollupOptions: {external: [`vue`]}
            }
        })).rejects.toThrow(/Simulated build error/);

        const frLocale = JSON.parse(fs.readFileSync(`assets/locales/fr-CA.locale`, `utf8`));
        expect(frLocale.zzold).toEqual(unusedTranslation);
    }, 30000);
});
