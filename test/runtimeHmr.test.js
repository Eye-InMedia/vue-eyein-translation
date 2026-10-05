import fs from "node:fs";
import path from "node:path";
import {afterEach, expect, it} from "vitest";
import viteEyeinTranslation from "../vite-plugin-vue-eyein-translation.js";
import {runtimeSource} from "./helpers/runtimeSource.js";

const root = new URL(`../.tmp/hmr-fixture/`, import.meta.url).pathname;
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));
it(`updates complete shared dictionaries without changing instance locales or main precedence`, async () => {
    for (const directory of [`assets/locales`, `a-extra/locales`, `extra/locales`]) fs.mkdirSync(`${root}/${directory}`, {recursive: true});
    const imports = {};
    for (const locale of [`en-US`, `fr-CA`]) {
        const main = {greeting: locale === `en-US` ? `Hello` : `Bonjour`};
        const extra = {greeting: `extra`, other: `old`, shared: `extra`};
        const first = {shared: `first`};
        for (const [directory, value] of [[`assets/locales`, main], [`a-extra/locales`, first], [`extra/locales`, extra]]) {
            const file = `${root}/${directory}/${locale}.locale`;
            fs.writeFileSync(file, JSON.stringify(value));
            imports[path.normalize(file)] = {default: value};
        }
    }
    const plugin = viteEyeinTranslation({locales: [`en-US`, `fr-CA`], assetsDir: `assets`, additionalLocalesDirs: [`a-extra/locales`, `extra/locales`], purgeOldTranslations: false});
    plugin.configResolved({root, command: `serve`});
    plugin.buildStart();
    const url = new URL(`../src/runtime/js/_eTr.js`, import.meta.url);
    const source = plugin.transform(fs.readFileSync(url, `utf8`), url.pathname).code;
    let acceptedPaths, update;
    const hot = {accept(paths, callback) {
        acceptedPaths = paths;
        update = callback;
    }};
    const {create} = await runtimeSource({source, imports, hot});
    const english = create(), french = create();
    await english.changeLocale(`en-US`);
    await french.changeLocale(`fr-CA`);
    expect(french.tr(`@@greeting`)).toBe(`Bonjour`);
    expect(french.tr(`@@shared`)).toBe(`first`);
    update(acceptedPaths.map(file => file.includes(`/extra/locales/fr-CA`) ? {default: {greeting: `extra changed`, other: `new`}} : undefined));
    expect(french.tr(`@@greeting`)).toBe(`Bonjour`);
    expect(french.tr(`@@other`)).toBe(`new`);
    update(acceptedPaths.map(file => file.includes(`assets/locales/fr-CA`) ? {default: {greeting: `Salut`}} : undefined));
    expect(french.tr(`@@greeting`)).toBe(`Salut`);
    expect(english.tr(`@@greeting`)).toBe(`Hello`);
    expect(english.getLocale()).toBe(`en-US`);
    expect(french.getLocale()).toBe(`fr-CA`);
});
