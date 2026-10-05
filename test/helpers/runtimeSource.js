import fs from "node:fs";
import {parse} from "@babel/parser";
import MagicString from "magic-string";
import * as vue from "vue";
import * as translationRuntime from "../../src/runtime/js/translationRuntime.js";
import * as localeLoader from "../../src/runtime/js/localeLoader.js";

async function moduleBody(source, url, dependencies) {
    const code = new MagicString(source);
    const names = [], values = [];
    for (const node of parse(source, {sourceType: `module`}).program.body) {
        if (node.type === `ImportDeclaration`) {
            const resolved = node.source.value.startsWith(`.`) ? new URL(node.source.value, url).pathname : node.source.value;
            const dependency = dependencies[resolved] ?? await import(node.source.value.startsWith(`.`) ? new URL(node.source.value, url).href : node.source.value);
            for (const specifier of node.specifiers) {
                names.push(specifier.local.name);
                values.push(specifier.type === `ImportDefaultSpecifier` ? dependency.default : dependency[specifier.imported.name]);
            }
            code.remove(node.start, node.end);
        } else if (node.type === `ExportDefaultDeclaration`) {
            code.remove(node.start, node.end);
        } else if (node.type === `ExportNamedDeclaration` && node.declaration) {
            code.remove(node.start, node.declaration.start);
        }
    }
    return {code, names, values};
}

// Evaluate real module bodies with build placeholders and real Vue implementations.
export async function runtimeSource({locales = [`en-US`, `fr-CA`], loaders = {}, assetsDir = `assets`, additionalLocalesDirs = [], hot, source: inputSource, imports = {}, vueImplementation} = {}) {
    const url = new URL(`../../src/runtime/js/_eTr.js`, import.meta.url);
    const factoryUrl = new URL(`./translationRuntime.js`, url);
    const dependencies = {vue: vueImplementation ?? vue, [factoryUrl.pathname]: translationRuntime, [new URL(`./localeLoader.js`, url).pathname]: localeLoader, ...imports};
    if (vueImplementation) {
        const factory = await moduleBody(fs.readFileSync(factoryUrl, `utf8`), factoryUrl, dependencies);
        dependencies[factoryUrl.pathname] = new Function(...factory.names, `${factory.code.toString()}\nreturn {createTranslationRuntime};`)(...factory.values);
    }
    const source = inputSource ?? fs.readFileSync(url, `utf8`);
    const {code, names, values} = await moduleBody(source, url, dependencies);
    const body = code.toString().replaceAll(`import.meta.hot`, `hot`)
        .replace(`/*{locales}*/`, `locales = ${JSON.stringify(locales)};`)
        .replace(`/*{assetsDir}*/`, `assetsDir = ${JSON.stringify(assetsDir)};`)
        .replace(`/*{additionalLocalesDirs}*/`, `additionalLocalesDirs = ${JSON.stringify(additionalLocalesDirs)};`)
        .replace(`/*{localeFilesPromisesImport}*/`, `localeFilesPromises = loaders;`);
    return new Function(...names, `loaders`, `hot`, `${body}\nreturn {runtime: _eTr, create: typeof createTranslationRuntime === 'function' ? createTranslationRuntime : () => _eTr};`)(...values, loaders, hot);
}

export function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}
