import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import {execFile, spawn} from "node:child_process";
import {promisify} from "node:util";
import {fileURLToPath} from "node:url";
import viteEyeinTranslation from "../../vite-plugin-vue-eyein-translation.js";

const run = promisify(execFile);
const root = fileURLToPath(new URL(`../../`, import.meta.url));

export async function startRuntimeNuxtFixture({pages = true, dependencyRoot = root} = {}) {
    fs.mkdirSync(path.join(root, `.tmp`), {recursive: true});
    const dir = fs.mkdtempSync(path.join(root, `.tmp/runtime-nuxt-`));
    let child;
    try {
        fs.cpSync(path.join(root, `test/fixtures/runtime-ssr`), dir, {recursive: true});
        fs.symlinkSync(path.join(dependencyRoot, `node_modules`), path.join(dir, `node_modules`));
        fs.mkdirSync(path.join(dir, `assets/locales`), {recursive: true});
        for (const [locale, greeting] of [[`en-US`, `Hello external`], [`fr-CA`, `Bonjour externe`]]) {
            fs.writeFileSync(path.join(dir, `assets/locales/${locale}.locale`), JSON.stringify(Object.fromEntries([[`greeting`, greeting], [`hasOwnProperty`, greeting], [`__proto__`, greeting]])));
        }
        // Populate compiler-generated entries before Nuxt consumes the client locale modules.
        // This fixture models a project with its already generated translation files.
        const preparing = viteEyeinTranslation({assetsDir: `assets`, locales: [`en-US`, `fr-CA`], inlineLocales: `en-US||fr-CA`, purgeOldTranslations: false, warnMissingTranslations: false});
        preparing.configResolved({root: dir, command: `build`});
        preparing.buildStart();
        const page = path.join(dir, `pages/[lang].vue`);
        preparing.transform(fs.readFileSync(page, `utf8`), page);
        await preparing.buildEnd();
        fs.writeFileSync(path.join(dir, `package.json`), JSON.stringify({type: `module`}));
        fs.writeFileSync(path.join(dir, `nuxt.config.js`), `import translationModule from ${JSON.stringify(path.join(root, `src/module.js`))};\nexport default {srcDir: '.', pages: ${pages}, devtools: {enabled:false}, modules:[translationModule], compatibilityDate:'2024-12-09', vueEyeinTranslation:{locales:['en-US','fr-CA'], inlineLocales:'en-US||fr-CA', assetsDir:'assets', purgeOldTranslations:false, warnMissingTranslations:false}};`);
        if (!pages) fs.writeFileSync(path.join(dir, `app.vue`), `<template><p id="plain">{{ tr({'en-US':'Hello','fr-CA':'Bonjour'}) }}</p></template>`);
        const environment = {...process.env, NODE_ENV: `production`, NUXT_TELEMETRY_DISABLED: `1`};
        for (const key of Object.keys(environment)) if (key.startsWith(`VITEST`)) delete environment[key];
        const cli = path.join(dependencyRoot, `node_modules/nuxt/bin/nuxt.mjs`);
        const building = run(process.execPath, [cli, `build`, dir], {cwd: root, timeout: 180000, maxBuffer: 20 * 1024 * 1024, env: environment});
        const log = path.join(dir, `build.log`);
        building.child.stdout.on(`data`, data => fs.appendFileSync(log, data));
        building.child.stderr.on(`data`, data => fs.appendFileSync(log, data));
        await building;
        const socket = net.createServer();
        await new Promise(resolve => socket.listen(0, `127.0.0.1`, resolve));
        const port = socket.address().port;
        await new Promise(resolve => socket.close(resolve));
        child = spawn(process.execPath, [path.join(dir, `.output/server/index.mjs`)], {cwd: dir, env: {...process.env, PORT: String(port), NITRO_HOST: `127.0.0.1`}, stdio: [`ignore`, `pipe`, `pipe`]});
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`Nuxt fixture startup timed out`)), 30000);
            child.once(`exit`, (code) => {
                clearTimeout(timeout);
                reject(new Error(`Nuxt fixture exited ${code}`));
            });
            child.stdout.on(`data`, (chunk) => {
                if (String(chunk).includes(`Listening on`)) {
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });
        const url = `http://127.0.0.1:${port}`;
        return {
            url, dir,
            async controlGate(action) {
                const response = await fetch(`${url}/api/gate?action=${action}`);
                if (!response.ok) throw new Error(`Gate returned ${response.status}`);
            },
            async close() {
                child.kill();
                await new Promise(resolve => child.once(`exit`, resolve));
                fs.rmSync(dir, {recursive: true, force: true});
            }
        };
    } catch (error) {
        child?.kill();
        fs.rmSync(dir, {recursive: true, force: true});
        throw error;
    }
}
