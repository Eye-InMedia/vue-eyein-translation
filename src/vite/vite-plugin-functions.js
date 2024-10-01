import fs from "fs";
import path from "path";
import {createTranslationId, debounce, findLineNumber} from "../runtime/helpers/utils.js";

const translations = {};
const additionalTranslations = {};
const rootDir = process.cwd().replace(/\\/g, `/`);

export async function updateViteConfig(options, config) {
    config.server ||= {};
    config.server.watch ||= {};
    config.server.watch.ignored ||= [];
    config.server.watch.ignored.push(`**/${options.assetsDir}/locales/**`);
}

export async function loadLocales(options) {
    if (!fs.existsSync(path.join(rootDir, options.assetsDir, `locales`))) {
        console.log(`Creating locales directory: ${options.assetsDir}/locales...`);
        fs.mkdirSync(path.join(rootDir, options.assetsDir, `locales`), {recursive: true});
    }

    for (const locale of options.locales) {
        translations[locale] = {};
        additionalTranslations[locale] = {};

        const localePath = path.join(rootDir, options.assetsDir, `locales/${locale}.json`);
        if (!fs.existsSync(localePath)) {
            console.log(`Creating locale file: ${localePath}...`);
            fs.writeFileSync(localePath, `{}`, {encoding: `utf-8`});
        }

        translations[locale] = JSON.parse(fs.readFileSync(localePath, {encoding: `utf-8`}));

        for (const additionalDir of options.additionalLocalesDirs) {
            const additionalLocalePath = path.join(rootDir, additionalDir, `${locale}.json`);

            if (fs.existsSync(additionalLocalePath)) {
                additionalTranslations[locale] = JSON.parse(fs.readFileSync(additionalLocalePath, {encoding: `utf-8`}));
            }
        }
    }
}

export async function saveLocales(options, buildEnd = false) {
    console.log(`Saving translation files...`);
    const inlineLocales = options.inlineLocales.split(`||`);
    const localesWithFiles = options.locales.filter(l => inlineLocales.indexOf(l) === -1);

    for (const locale of localesWithFiles) {
        if (buildEnd) {
            if (options.purgeOldTranslations) {
                for (const translationId in translations[locale]) {
                    if (typeof translations[locale][translationId].last_update !== `object`) {
                        console.warn(`Deleting removed translation ${translationId}: ${translations[locale][translationId].source}`)
                        delete translations[locale][translationId];
                    }
                }
            }

            if (options.autoTranslate.locales?.includes(locale) && options.autoTranslate.translationFunction) {
                try {
                    await autoTranslateLocale(options, locale);
                } catch (e) {
                    console.error(e);
                }
            }
        } else {
            console.warn(`Skipping purge and auto translation in dev mode...`);
        }

        const localePath = path.join(rootDir, options.assetsDir, `locales/${locale}.json`);
        fs.writeFileSync(localePath, JSON.stringify(translations[locale], null, `  `), {encoding: `utf-8`});
    }
}

async function autoTranslateLocale(options, locale) {
    const sourceLocale = options.inlineLocales.split(`||`).shift();

    let textsToTranslate = [];
    let translationsInfo = [];

    for (const translationId in translations[locale]) {
        if (translations[locale][translationId].target) {
            continue;
        }

        if (!translations[locale][translationId].source) {
            continue;
        }

        let translationSource = translations[locale][translationId].source;
        let info = {
            id: translationId,
            data: {}
        }

        const matches = translationSource.match(/\{.+?}/g);
        if (matches) {
            for (const [i, match] of matches.entries()) {
                info.data[`{#${i}}`] = match;

                translationSource = translationSource.replace(match, `{#${i}}`);
            }
        }

        textsToTranslate.push(translationSource);
        translationsInfo.push(info);
    }

    if (textsToTranslate.length === 0) {
        console.log(`Nothing to translate automatically...`);
        return;
    }

    console.warn(`Translating automatically ${textsToTranslate.length} texts for ${locale} locale...`);

    const translatedTexts = await options.autoTranslate.translationFunction(sourceLocale, locale, textsToTranslate);

    for (let i = 0; i < translationsInfo.length; i++) {
        const info = translationsInfo[i];
        let translatedText = translatedTexts[i];
        for (const placeholder in info.data) {
            translatedText = translatedText.replace(placeholder, info.data[placeholder]);
        }
        translations[locale][info.id].target = translatedText;
    }
}

function isVueFile(file) {
    if (!/\.vue$/.test(file)) {
        return false;
    }

    if (file.includes(`/node_modules/`) || file.includes(`/t.vue`) || file.includes(`/vue2T.vue`)) {
        return false;
    }

    return true;
}


export function handleHotUpdate(options, file, server, modules, timestamp) {
    if (!isVueFile(file)) {
        return null;
    }

    (server.ws || server.hot)?.send({type: `full-reload`})

    const invalidatedModules = new Set()
    for (const mod of modules) {
        server.moduleGraph.invalidateModule(
            mod,
            invalidatedModules,
            timestamp,
            true
        );
    }

    return [];
}

export function transformSourceCode(options, fileId, src, isServe = false) {
    if (isVueFile(fileId)) {
        return transformVueFile(options, fileId, src, isServe);
    } else if (/\/locales\/.+\.json$/.test(fileId)) {
        return transformLocaleFile(options, src);
    }

    return null;
}

function transformVueFile(options, fileId, src, isServe = false) {
    if (!isVueFile(fileId)) {
        return null;
    }

    const relativePath = fileId.replace(rootDir, ``);

    // ignore comments
    src = src.replace(/<!--.+?-->/g, ` `);

    src = transformTranslationComponents(relativePath, src, options);
    src = transformTranslationSimpleAttributes(relativePath, src, options);
    src = transformTranslationAttributes(relativePath, src, options);
    src = transformJSTranslation(relativePath, src, options);

    if (isServe) {
        debounce(() => saveLocales(options, false))();
    }

    return {
        code: src
    };
}


function transformTranslationComponents(relativePath, src, options) {
    const originalSrc = src;

    let allMatches = src.matchAll(/<t((?: [^>]+)*?(?: :d="(.+?)")?(?: [^>]+)*?)>([^<>]+?)<\/t>/gd);
    for (const matches of allMatches) {
        const fullMatch = matches[0];
        const propsStr = matches[1] ? matches[1] : ``;
        const dataStr = matches[2] ? matches[2] : ``;
        const srcStr = matches[3];
        const line = findLineNumber(matches.indices[3], originalSrc);
        const context = `<t> tag at (${relativePath}:${line})`;
        const translationObjectString = createTranslationObjectString(srcStr, context, options, dataStr);
        src = src.replace(fullMatch, `<t ${propsStr} :value="${translationObjectString}"></t>`);
    }

    return src;
}

function transformTranslationSimpleAttributes(relativePath, src, options) {
    const originalSrc = src;

    let hasMatches = false;

    let allMatches = src.matchAll(/<(\w+)[^<>]*?\s+(([\w-]+)\.t=['"](.+?)['"])[^<>]*?>/sdg);
    for (const matches of allMatches) {
        let fullMatch = matches[0];
        const tagName = matches[1];
        const fullAttribute = matches[2];
        const attribute = matches[3];
        const srcStr = matches[4];
        const line = findLineNumber(matches.indices[3], originalSrc);
        const context = `${attribute} of <${tagName}> at (${relativePath}:${line})`;

        const translationObjectString = createTranslationObjectString(srcStr, context, options);
        src = src.replace(fullAttribute, `:${attribute}="tr(${translationObjectString})"`);
    }

    return src;
}

function transformTranslationAttributes(relativePath, src, options) {
    const originalSrc = src;

    let hasMatches = false;

    let allMatches = src.matchAll(/<(\w+)[^<>]*?\s+((v-t(?:\.[\w-]+)+)(?:=['"](.+?)['"])?)[^<>]*?>/sdg);
    for (const matches of allMatches) {
        let fullMatch = matches[0];
        const tagName = matches[1];
        const fullDirective = matches[2];
        const directive = matches[3];
        const line = findLineNumber(matches.indices[3], originalSrc);

        const attributes = directive.split(`.`);
        attributes.shift();

        let dataStr = ``;
        if (matches.length > 4) {
            dataStr = matches[4];
        }

        for (const attribute of attributes) {
            const context = `${attribute} of <${tagName}> at (${relativePath}:${line})`;

            const attributeRegex = new RegExp(`\\s+${attribute}=(?:'(.+?)(?<!\\\\)'|"(.+?)(?<!\\\\)")`);
            const result = fullMatch.match(attributeRegex);

            if (result && result.length >= 2) {
                const srcStr = result[1] || result[2];
                const translationObjectString = createTranslationObjectString(srcStr, context, options, dataStr);
                const newTag = fullMatch.replace(fullDirective, ``).replace(attributeRegex, ` :${attribute}="tr(${translationObjectString})"`);
                src = src.replace(fullMatch, newTag);
                fullMatch = newTag;
                hasMatches = true;
            }
        }
    }

    let matchesLength = 1;
    let i = 0;
    while (matchesLength > 0 && i < 10) {
        i++;
        matchesLength = 0;
        let allMatches = src.matchAll(/<(\w+)[^<>]*?\s+((v-t:[\w-]+(?:\.[\w-]+)*)(?:=['"](.+?)['"])?)[^<>]*?>/sdg);

        for (const matches of allMatches) {
            matchesLength++;
            let fullMatch = matches[0];
            const tagName = matches[1];
            const fullDirective = matches[2];
            const directive = matches[3];
            const line = findLineNumber(matches.indices[3], originalSrc);

            const tmp = directive.split(`:`);
            const filters = tmp[1].split(`.`);
            const attributes = [filters.shift()];

            let dataStr = ``;
            if (matches.length > 4) {
                dataStr = matches[4];
            }

            for (const attribute of attributes) {
                const context = `${attribute} of <${tagName}> at (${relativePath}:${line})`;

                const attributeRegex = new RegExp(`\\s+${attribute}=(?:'(.+?)(?<!\\\\)'|"(.+?)(?<!\\\\)")`);
                const result = fullMatch.match(attributeRegex);

                if (result && result.length >= 2) {
                    const srcStr = result[1] || result[2];
                    const translationObjectString = createTranslationObjectString(srcStr, context, options, dataStr, filters);
                    const newTag = fullMatch.replace(fullDirective, ``).replace(attributeRegex, ` :${attribute}="tr(${translationObjectString})"`);
                    src = src.replace(fullMatch, newTag);
                    fullMatch = newTag;
                    hasMatches = true;
                }
            }
        }
    }

    if (hasMatches) {
        src = injectScriptSetupFunction(src, options);
    }

    return src;
}

function transformJSTranslation(relativePath, src, options) {
    const originalSrc = src;

    let allMatches = src.matchAll(/createTranslation\([`'"](.+?)[`'"](?:, (.+?))?\)/dg);
    let hasMatches = false;
    for (const matches of allMatches) {
        const fullMatch = matches[0];
        const line = findLineNumber(matches.indices[1], originalSrc);
        const srcStr = matches[1];
        const context = `JS template literal at (${relativePath}:${line})`;

        let dataStr = ``;
        if (matches.length > 2) {
            dataStr = matches[2];
        }

        const translationObjectString = createTranslationObjectString(srcStr, context, options, dataStr);
        src = src.replace(fullMatch, `tr(${translationObjectString})`);
        hasMatches = true;
    }

    if (hasMatches) {
        src = injectScriptSetupFunction(src, options);
    }

    return src;
}

function injectScriptSetupFunction(src, options) {
    const setupRegex = /<script [^>]*setup[^>]*>/g;
    if (!setupRegex.test(src)) {
        return src;
    }

    let index = setupRegex.lastIndex;
    let endOfImportsFound = false;

    function setEndOfImportsIndex() {
        if (endOfImportsFound) {
            return;
        }
        const allImportsMatches = [...src.matchAll(/^\s*import\s+.*$/gmd)];
        if (!allImportsMatches || allImportsMatches.length === 0) {
            endOfImportsFound = true;
            return;
        }
        const lastImportMatch = allImportsMatches.pop();
        index = lastImportMatch.indices[0][1];
        endOfImportsFound = true;
    }

    if (/createTranslation\s*=\s*inject\([`'"]createTranslation[`'"]\);?/.test(src)) {
        let replacement = ``;
        if (!/inject\([`'"]tr[`'"]\)/g.test(src)) {
            replacement += `const tr = inject('tr');\n`;
        }
        if (!/inject\([`'"]__vueEyeinLocale[`'"]\)/g.test(src)) {
            replacement += `const __vueEyeinLocale = inject('__vueEyeinLocale');\n`;
        }
        src = src.replace(/(const|let)\s+createTranslation\s*=\s*inject\([`'"]createTranslation[`'"]\);?/g, replacement);
    } else {
        if (!/inject\([`'"]__vueEyeinLocale[`'"]\)/g.test(src)) {
            setEndOfImportsIndex();
            src = src.substring(0, index) + `\nconst __vueEyeinLocale = inject('__vueEyeinLocale');\n` + src.substring(index);
        }

        if (!options.nuxt && !/inject\([`'"]tr[`'"]\)/g.test(src)) {
            setEndOfImportsIndex();
            src = src.substring(0, index) + `\nconst tr = inject('tr');\n` + src.substring(index);
        }
    }

    return src;
}

function createTranslationObjectString(srcStr, context, options, dataStr = ``, filters = []) {
    let src = srcStr;

    if (!srcStr) {
        throw new Error(`createTranslationObjectString srcStr is empty (context: ${context})`);
    }

    // Custom id
    let translationId;
    let tmp = srcStr.split(`@@`);
    if (tmp.length >= 2) {
        translationId = tmp[1];
        src = tmp[0];
    }

    // Meaning
    tmp = src.split(`##`);
    let meaning = ``;
    if (tmp.length >= 3) {
        throw new Error(`Error parsing translation "${srcStr}" more than 1 "##" found.`)
    } else if (tmp.length === 2) {
        meaning = tmp[1];
        src = tmp[0];
    }

    const inlineLocales = options.inlineLocales.split(`||`);
    const inlineTranslations = src.split(`||`);
    const translationSource = inlineTranslations[0];

    if (!translationId) {
        translationId = createTranslationId(translationSource + meaning);
    }

    let groupId = null;
    tmp = translationId.split('.');
    translationId = tmp.pop();
    if (tmp.length > 0) {
        groupId = tmp.pop();
    }
    const fullTranslationId = groupId ? `${groupId}.${translationId}` : translationId;

    const translationObject = {};

    for (const locale of options.locales) {
        const localeTranslation = groupId ? translations[locale][groupId] : translations[locale];
        const localeAdditionalTranslation = groupId ? additionalTranslations[locale][groupId] : additionalTranslations[locale];

        if ((!localeTranslation || !localeTranslation.hasOwnProperty(translationId)) && (!localeAdditionalTranslation || !localeAdditionalTranslation.hasOwnProperty(translationId))) {
            // if no translation found
            const translation = {
                source: translationSource,
                target: ``,
                context: context,
                last_update: new Date()
            };

            const inlineLocaleIndex = inlineLocales.indexOf(locale);
            if (inlineLocaleIndex >= 0 && inlineTranslations.length > inlineLocaleIndex) {
                translation.target = inlineTranslations[inlineLocaleIndex];
            }

            if (meaning) {
                translation.meaning = meaning;
            }


            if (groupId) {
                translations[locale][groupId][translationId] = translation;
                translationObject[locale] = translation.target;
            } else {
                translations[locale][translationId] = translation;
                translationObject[locale] = translation.target;
            }
        } else if (localeTranslation && localeTranslation.hasOwnProperty(translationId) && (typeof localeTranslation[translationId] === `string` || localeTranslation[translationId].target)) {
            // if complete translation found
            translationObject[locale] = typeof localeTranslation[translationId] === `string` ? localeTranslation[translationId] : localeTranslation[translationId].target;

            localeTranslation[translationId].context = context;
            localeTranslation[translationId].last_update = new Date();
        } else if (localeAdditionalTranslation && localeAdditionalTranslation.hasOwnProperty(translationId) && (typeof localeAdditionalTranslation[translationId] === `string` || localeAdditionalTranslation[translationId].target)) {
            // if complete additional translation found
            translationObject[locale] = typeof localeAdditionalTranslation[translationId] === `string` ? localeAdditionalTranslation[translationId] : localeAdditionalTranslation[translationId].target;
        } else if (localeTranslation && localeTranslation.hasOwnProperty(translationId)) {
            // translation incomplete found update context
            localeTranslation[translationId].context = context;
            localeTranslation[translationId].last_update = new Date();
        }

        if (options.warnMissingTranslations && !translationObject[locale]) {
            console.warn(`Missing translation ${locale} @@${fullTranslationId} for "${translationSource}", ${context.replace(` at (`, `\nat (`)}`);
        }

        if (!inlineLocales.includes(locale)) {
            delete translationObject[locale];
        }
    }

    if (!dataStr) {
        let allDataBindingMatches = translationSource.matchAll(/\{([\w.]+)(?:|[^}]+)*}/g);
        let varList = new Set();
        for (const matches of allDataBindingMatches) {
            if (matches.length > 1) {
                const varName = matches[1].split(`.`).shift();
                varList.add(varName);
            }
        }

        dataStr = `{${Array.from(varList).join(`,`)}}`;
    }

    if (filters.length > 0) {
        translationObject.filters = filters
    }

    let json = JSON.stringify(translationObject)
        .replace(/'/g, `\\'`)
        .replace(/"/g, `'`);

    if (dataStr) {
        json = json.replace(/^\{/g, `{data: ${dataStr},`);
    }

    json = json.replace(/^\{/g, `{id: '${translationId}', locale: __vueEyeinLocale,`);

    return json;
}

function transformLocaleFile(options, src) {
    const json = JSON.parse(src);
    let result = {};
    for (const groupId in json) {
        if (typeof json[groupId] === `string` || json[groupId].hasOwnProperty(`target`)) {
            result[groupId] = typeof json[groupId] === `string` ? json[groupId] : json[groupId].target;
        } else {
            for (const translationId in json[groupId]) {
                result[`${groupId}.${translationId}`] = typeof json[groupId][translationId] === `string` ? json[groupId][translationId] : json[groupId][translationId].target;
            }
        }
    }

    return JSON.stringify(result);
}
