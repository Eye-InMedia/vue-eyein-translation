import fs from "fs";
import {createTranslationId, debounce, findLineNumber} from "./utils";

const translations = {};
const additionalTranslations = {};

export function loadLocales(options) {
    if (!fs.existsSync(`src/assets/locales`)) {
        console.log(`Creating locales directory: src/assets/locales...`);
        fs.mkdirSync(`src/assets/locales`, {recursive: true});
    }

    const inlineLocales = options.inlineLocales.split(`||`);

    for (const locale of options.locales) {
        translations[locale] = {};
        additionalTranslations[locale] = {};

        if (!inlineLocales.includes(locale)) {
            const localePath = `src/assets/locales/${locale}.json`;
            if (!fs.existsSync(localePath)) {
                console.log(`Creating locale file: ${localePath}...`);
                fs.writeFileSync(localePath, `{}`, {encoding: `utf-8`});
            }

            translations[locale] = JSON.parse(fs.readFileSync(localePath, {encoding: `utf-8`}));
        }

        for (const additionalDir of options.additionalLocalesDirs) {
            const additionalLocalePath = `${additionalDir}/${locale}.json`;

            if (fs.existsSync(additionalLocalePath)) {
                additionalTranslations[locale] = JSON.parse(fs.readFileSync(additionalLocalePath, {encoding: `utf-8`}));
            }
        }
    }
}

export function saveLocales(options, purgeOldTranslations = false) {
    console.log(`Saving translation files...`);

    const inlineLocales = options.inlineLocales.split(`||`);
    const localesWithFiles = options.locales.filter(l => inlineLocales.indexOf(l) === -1);

    for (const locale of localesWithFiles) {
        if (purgeOldTranslations) {
            for (const translationId in translations[locale]) {
                if (typeof translations[locale][translationId].last_update !== `object`) {
                    console.warn(`Deleting removed translation ${translationId}: ${translations[locale][translationId].source}`)
                    delete translations[locale][translationId];
                }
            }
        }

        const localePath = `src/assets/locales/${locale}.json`;
        fs.writeFileSync(localePath, JSON.stringify(translations[locale], null, `  `), {encoding: `utf-8`});
    }

    let i = 0;
    for (const additionalLocaleDir of options.additionalLocalesDirs) {
        i++;
        fs.cpSync(additionalLocaleDir, `src/assets/locales/add/${i}`, {recursive: true});
    }
}

export function handleHotUpdate(options, file, server, modules, timestamp) {
    if (!/\.vue$/.test(file) || file.includes(`/node_modules/`)) {
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

export function transformSourceCode(options, fileId, src, saveAfterEachTransform = false) {
    if (!/\.vue$/.test(fileId) || fileId.includes(`/node_modules/`)) {
        return null;
    }

    const relativePath = fileId.replace(import.meta.dirname.replace(/\\/g, `/`), ``);

    // ignore comments
    src = src.replace(/<!--.+?-->/g, ` `);

    src = transformTranslationComponents(relativePath, src, options);
    src = transformTranslationAttributes(relativePath, src, options);
    src = transformJSTranslation(relativePath, src, options);

    if (saveAfterEachTransform) {
        debounce(() => {
            saveLocales(options);
        })();
    }

    return {
        code: src
    };
}


function transformTranslationComponents(relativePath, src, options) {
    const regex = /<t( [^>]*)*>([^<>]+?)<\/t>/d;
    let matches = [];
    while (matches = regex.exec(src)) {
        const line = findLineNumber(matches.indices[2], src);
        const srcStr = matches[2];
        const context = `<t> tag at (${relativePath}:${line})`;
        const translationObjectString = createTranslationObjectString(srcStr, context, options);
        src = src.replace(regex, `<t$1 :value="${translationObjectString}"></t>`);
    }

    return src;
}

function transformTranslationAttributes(relativePath, src, options) {
    const regex = /<(\w+).*\s+((v-t(?::\w+)?(?:\.[\w-]+)*)(?:=['"](.+?)['"])?).*?>/dg;
    let matches = [];
    while (matches = regex.exec(src)) {
        let tag = matches[0];
        const tagName = matches[1];
        const directive = matches[3];
        const line = findLineNumber(matches.indices[3], src);

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
            const result = tag.match(attributeRegex);
            if (result && result.length >= 2) {
                const srcStr = result[1];
                const translationObjectString = createTranslationObjectString(srcStr, context, options, dataStr);
                const filtersTxt = filters.length > 0 ? `.${filters.join(`.`)}` : ``;
                const newTag = tag.replace(matches[2], ``).replace(attributeRegex, ` v-t:${attribute}${filtersTxt}="${translationObjectString}"`);
                src = src.replace(tag, newTag);
                tag = newTag;
            }
        }
    }

    return src
}

function transformJSTranslation(relativePath, src, options) {
    const regex = /createTranslation\(`(.+?)`(?:, (.+?))?\)/d;
    let matches = [];
    while (matches = regex.exec(src)) {
        const line = findLineNumber(matches.indices[1], src);
        const srcStr = matches[1];
        const context = `JS template literal at (${relativePath}:${line})`;

        let dataStr = ``;
        if (matches.length > 2) {
            dataStr = matches[2];
        }

        const translationObjectString = createTranslationObjectString(srcStr, context, options, dataStr);
        src = src.replace(regex, `t(${translationObjectString})`);
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

        if (!translationObject[locale]) {
            console.warn(`Missing translation ${locale} ${translationId} for "${translationSource}", ${context.replace(` at (`, `\nat (`)}`);
        }

        if (!inlineLocales.includes(locale)) {
            delete translationObject[locale];
        }
    }

    let json = JSON.stringify(translationObject)
        .replace(/"/g, `'`);

    if (dataStr) {
        json = json.replace(/^\{/g, `{data: ${dataStr},`);
    }

    json = json.replace(/^\{/g, `{id: \`${translationId}\`, locale: this.locale,`);

    return json;
}
