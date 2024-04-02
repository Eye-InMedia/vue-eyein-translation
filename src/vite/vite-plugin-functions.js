import fs from "fs";
import path from "path";
import {createTranslationId, debounce, findLineNumber} from "../helpers/utils.js";

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

    const inlineLocales = options.inlineLocales.split(`||`);

    for (const locale of options.locales) {
        translations[locale] = {};
        additionalTranslations[locale] = {};

        if (!inlineLocales.includes(locale)) {
            const localePath = path.join(rootDir, options.assetsDir, `locales/${locale}.json`);
            if (!fs.existsSync(localePath)) {
                console.log(`Creating locale file: ${localePath}...`);
                fs.writeFileSync(localePath, `{}`, {encoding: `utf-8`});
            }

            translations[locale] = JSON.parse(fs.readFileSync(localePath, {encoding: `utf-8`}));
        }

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
        }

        const localePath = path.join(rootDir, options.assetsDir, `locales/${locale}.json`);
        fs.writeFileSync(localePath, JSON.stringify(translations[locale], null, `  `), {encoding: `utf-8`});
    }

    let i = 0;
    fs.rmSync(path.join(rootDir, options.assetsDir, `locales/add`), {recursive: true, force: true});
    for (const additionalLocaleDir of options.additionalLocalesDirs) {
        i++;
        fs.cpSync(path.join(rootDir, additionalLocaleDir), path.join(rootDir, options.assetsDir, `locales/add/${i}`), {recursive: true, force: true});
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
        return;
    }

    console.log(`Translating automatically ${textsToTranslate.length} texts for ${locale} locale...`);

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

function testFileId(file) {
    if (!/\.vue$/.test(file)) {
        return false;
    }

    if (file.includes(`/node_modules/`) || file.includes(`/t.vue`) || file.includes(`/select-locale.vue`)) {
        return false;
    }

    return true;
}


export function handleHotUpdate(options, file, server, modules, timestamp) {
    if (!testFileId(file)) {
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
    if (!testFileId(fileId)) {
        return null;
    }

    const relativePath = fileId.replace(rootDir, ``);

    // ignore comments
    src = src.replace(/<!--.+?-->/g, ` `);

    src = transformTranslationComponents(relativePath, src, options);
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

function transformTranslationAttributes(relativePath, src, options) {
    const originalSrc = src;

    let allMatches = src.matchAll(/<(\w+).*\s+((v-t(?::\w+)?(?:\.[\w-]+)*)(?:=['"](.+?)['"])?).*?>/dg);
    for (const matches of allMatches) {
        let fullMatch = matches[0];
        const tagName = matches[1];
        const fullDirective = matches[2];
        const directive = matches[3];
        const line = findLineNumber(matches.indices[3], originalSrc);

        const tmp = directive.split(`:`);
        let attributes = [];
        let filters = [];
        if (tmp.length === 1) {
            attributes = tmp[0].split(`.`);
            attributes.shift();
        } else if (tmp.length === 2) {
            filters = tmp[1].split(`.`);
            attributes = [filters.shift()];
        } else {
            continue;
        }

        let dataStr = ``;
        if (matches.length > 4) {
            dataStr = matches[4];
        }

        for (const attribute of attributes) {
            const context = `${attribute} of <${tagName}> at (${relativePath}:${line})`;

            const attributeRegex = new RegExp(`\\s+${attribute}=['"](.+?)['"]`);
            const result = fullMatch.match(attributeRegex);
            if (result && result.length >= 2) {
                const srcStr = result[1];
                const translationObjectString = createTranslationObjectString(srcStr, context, options, dataStr);
                const filtersTxt = filters.length > 0 ? `.${filters.join(`.`)}` : ``;
                const newTag = fullMatch.replace(fullDirective, ``).replace(attributeRegex, ` v-t:${attribute}${filtersTxt}="${translationObjectString}"`);
                src = src.replace(fullMatch, newTag);
                fullMatch = newTag;
            }
        }
    }

    return src
}

function transformJSTranslation(relativePath, src, options) {
    const originalSrc = src;

    let allMatches = src.matchAll(/createTranslation\(`(.+?)`(?:, (.+?))?\)/dg);
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
        let replacement = ``;
        if (!/inject\([`'"]tr[`'"]\)/g.test(src)) {
            replacement += `const tr = inject('tr');\n`;
        }
        if (!/inject\([`'"]locale[`'"]\)/g.test(src)) {
            replacement += `const locale = inject('locale');\n`;
        }
        src = src.replace(/(const|let)\s+createTranslation\s*=\s*inject\([`'"]createTranslation[`'"]\);?/g, replacement);
    }

    return src;
}

function createTranslationObjectString(srcStr, context, options, dataStr = ``) {
    let src = srcStr;

    // Custom id
    let translationId;
    let tmp = srcStr.split(`@@`);
    if (tmp.length >= 2) {
        translationId = tmp[1];
        src = tmp[0];
    }

    // Meaning
    tmp = src.split(`//`);
    let meaning = ``;
    if (tmp.length >= 3) {
        throw new Error(`Error parsing translation "${srcStr}" more than 1 "//" found.`)
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

    const translationObject = {};

    for (const locale of options.locales) {
        if (!translations[locale].hasOwnProperty(translationId) && !additionalTranslations[locale].hasOwnProperty(translationId)) {
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

            translations[locale][translationId] = translation;

            translationObject[locale] = translations[locale][translationId].target;
        } else if (translations[locale].hasOwnProperty(translationId) && translations[locale][translationId].target) {
            // if complete translation found
            translationObject[locale] = translations[locale][translationId].target;

            translations[locale][translationId].context = context;
            translations[locale][translationId].last_update = new Date();
        } else if (additionalTranslations[locale].hasOwnProperty(translationId) && additionalTranslations[locale][translationId].target) {
            // if complete additional translation found
            translationObject[locale] = additionalTranslations[locale][translationId].target;
        } else if (translations[locale].hasOwnProperty(translationId)) {
            // translation incomplete found update context
            translations[locale][translationId].context = context;
            translations[locale][translationId].last_update = new Date();
        }

        if (options.warnMissingTranslations && !translationObject[locale]) {
            console.warn(`Missing translation ${locale} ${translationId} for "${translationSource}", ${context.replace(` at (`, `\nat (`)}`);
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

    let json = JSON.stringify(translationObject)
        .replace(/"/g, `'`);

    if (dataStr) {
        json = json.replace(/^\{/g, `{data: ${dataStr},`);
    }

    json = json.replace(/^\{/g, `{id: '${translationId}', locale: locale,`);

    return json;
}
