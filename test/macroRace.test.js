import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import vue from "@vitejs/plugin-vue";
import {build} from "vite";
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import viteEyeinTranslation from "../vite-plugin-vue-eyein-translation.js";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), `fixtures/macro-race`);

// Nuxt imports pages a second time as `Page.vue?macro=true` to extract definePageMeta.
// @vitejs/plugin-vue caches SFC descriptors by filename (query stripped), so when the
// macro request is compiled between the main request and the `?vue&type=script` sub-request
// (which happens at random in real builds), the script sub-request reads the macro descriptor.
// These plugins force that order: main request -> macro request -> script sub-request.
function forceMacroRaceOrder() {
    let mainTransformed, macroTransformed;
    const mainDone = new Promise(resolve => mainTransformed = resolve);
    const macroDone = new Promise(resolve => macroTransformed = resolve);

    return [{
        name: `wait-for-race-order`,
        enforce: `pre`,
        async load(id) {
            if (id.endsWith(`Page.vue?macro=true`)) {
                await mainDone;
            } else if (id.includes(`Page.vue?vue&type=script`)) {
                await macroDone;
            }
            return null;
        }
    }, {
        name: `signal-race-order`,
        enforce: `post`,
        transform(code, id) {
            if (id.endsWith(`Page.vue`)) {
                mainTransformed();
            } else if (id.endsWith(`Page.vue?macro=true`)) {
                macroTransformed();
            }
        }
    }];
}

describe(`staticTr with Nuxt ?macro=true imports`, () => {
    const initialCwd = process.cwd();
    let tmpDir;

    beforeAll(() => {
        // loadLocales/saveLocales write locale files relative to cwd
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `eyein-translation-test-`));
        process.chdir(tmpDir);
    });

    afterAll(() => {
        process.chdir(initialCwd);
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it(`compiles staticTr even when the macro request is transformed before the script sub-request`, async () => {
        const output = await build({
            root: fixtureDir,
            configFile: false,
            logLevel: `silent`,
            plugins: [
                ...forceMacroRaceOrder(),
                viteEyeinTranslation({locales: [`en-US`, `fr-CA`], inlineLocales: `en-US||fr-CA`, assetsDir: `assets`, warnMissingTranslations: false}),
                vue()
            ],
            build: {
                write: false,
                minify: false,
                lib: {entry: path.join(fixtureDir, `main.js`), formats: [`es`]},
                rollupOptions: {external: [`vue`]}
            }
        });

        const code = output[0].output[0].code;
        expect(code).not.toMatch(/staticTr\(/);
        expect(code).toMatch(/_eTr\.tr\(/);
    }, 30000);
});
