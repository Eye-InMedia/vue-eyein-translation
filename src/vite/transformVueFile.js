import {createTranslationId, debounce, findLineNumber, getEndOfImportsIndex, getVueEndOfImportsIndex} from "./viteUtils.js";
import saveLocales from "./saveLocales.js";

const rootDir = process.cwd().replace(/\\/g, `/`);

let updatedLocales = new Set();
const hmrLocalesUpdate = debounce(ctx => {
    if (updatedLocales.size === 0) {
        return;
    }
    saveLocales(ctx, [...updatedLocales]);
    updatedLocales = new Set();
}, 500)

export default function transformVueFile(ctx) {
    if (ctx.fileId.includes(`/node_modules/`) || ctx.fileId.includes(`/t.vue`) || ctx.fileId.includes(`/vue2T.vue`)) {
        return false;
    }

    // console.log(`transformVueFile`, ctx.fileId);

    ctx.relativePath = ctx.fileId.replace(rootDir, ``);
    ctx.currentFileTranslations = {};

    for (const locale of ctx.options.locales) {
        if (!ctx.currentFileTranslations.hasOwnProperty(locale)) {
            ctx.currentFileTranslations[locale] = {};
        }
    }

    transformTranslationComponents(ctx);
    transformTranslationDotTAttributes(ctx);
    transformTranslationVTDotAttributes(ctx);
    transformTranslationVTColonAttributes(ctx);
    transformJSTranslation(ctx);

    if (ctx.hmr) {
        hmrLocalesUpdate(ctx);
    }

    // console.log(ctx.fileId, ctx.src.toString());
}

function injectTrComposable(ctx) {
    if (ctx.trInjected) {
        return;
    }

    ctx.trInjected = true;
    const originalSrc = ctx.src.original;

    if (!/import \{.*inject.*} from ['"]vue['"]/.test(ctx.src.toString())) {
        ctx.src.replace(/(<script.*>)/, `$1\nimport {inject} from "vue"`);
    }

    const setupRegex = /<script [^>]*setup[^>]*>/g;
    if (!setupRegex.test(originalSrc)) {
        return;
    }

    let index = setupRegex.lastIndex;

    const endOfImportsIndex = getEndOfImportsIndex(originalSrc);
    if (endOfImportsIndex >= 0) {
        index = endOfImportsIndex;
    }

    if (!/inject\([`'"]_eTr[`'"]\)/g.test(ctx.src.toString())) {
        ctx.src.appendRight(index, `\nconst _eTr = inject('_eTr');\n`);
    }
}

function transformTranslationComponents(ctx) {
    const originalSrc = ctx.src.original;

    let hasMatches = false;

    let allMatches = originalSrc.matchAll(/<t((?: [^>]+)*?(?: :d="(.+?)")?(?: [^>]+)*?)>([^<>]+?)<\/t>/gd);
    for (const matches of allMatches) {
        const fullMatch = matches[0];
        const propsStr = matches[1] ? matches[1] : ``;
        const dataStr = matches[2] ? matches[2] : ``;
        const srcStr = matches[3];
        const line = findLineNumber(matches.indices[3], originalSrc);
        const location = `<t> tag at (${ctx.relativePath}:${line})`;
        const translationObjectString = createTranslationObjectString(ctx, srcStr, location, dataStr);
        ctx.src.replaceAll(fullMatch, `<t${propsStr} :value="${translationObjectString}"></t>`);
        hasMatches = true;
    }

    if (hasMatches) {
        injectTrComposable(ctx);
    }
}

// replace notation attribute.t="Text to translate"
function transformTranslationDotTAttributes(ctx) {
    const originalSrc = ctx.src.original;

    let hasMatches = false;

    let allTagsMatches = ctx.src.toString().matchAll(/<(\w+)[^<>]*?\s+[\w-]+\.t=".+?"[^<>]*?>/sdg);
    for (const tagMatches of allTagsMatches) {
        hasMatches = true;

        /**
         * @type {string}
         */
        const fullMatch = tagMatches[0];
        let newTag = fullMatch;
        const tagName = tagMatches[1];
        let tagLine = findLineNumber(tagMatches.indices[0], originalSrc);

        let allAttributesMatches = fullMatch.matchAll(/\s+([\w-]+)\.t="(.+?)"/sdg);
        for (const attributeMatches of allAttributesMatches) {
            const fullAttributeMatch = attributeMatches[0];
            const attribute = attributeMatches[1];
            const srcStr = attributeMatches[2];
            const line = tagLine + findLineNumber(attributeMatches.indices[1], fullMatch);
            const location = `${attribute} of <${tagName}> at (${ctx.relativePath}:${line})`;

            const translationObjectString = createTranslationObjectString(ctx, srcStr, location);
            newTag = newTag.replace(fullAttributeMatch, ` :${attribute}="_eTr.tr(${translationObjectString})"`);
        }

        ctx.src.replaceAll(fullMatch, newTag);
    }

    if (hasMatches) {
        injectTrComposable(ctx);
    }
}

// replace notation attribute1="Text to translate" attribute2="Another text to translate" v-t.attribute1.attribute2="data"
function transformTranslationVTDotAttributes(ctx) {
    const originalSrc = ctx.src.original;

    let hasMatches = false;

    let allTagsMatches = ctx.src.toString().matchAll(/<(\w+)[^<>]*?\s+v-t(?:\.[\w-]+)+(?:=".+?")?[^<>]*?>/sdg);
    for (const matches of allTagsMatches) {
        hasMatches = true;

        /**
         * @type {string}
         */
        const fullMatch = matches[0];
        let newTag = fullMatch;
        const tagName = matches[1];
        const tagLine = findLineNumber(matches.indices[1], originalSrc);

        let allDirectivesMatches = fullMatch.matchAll(/\s+(v-t(?:\.[\w-]+)+)(?:="(.+?)")?/sdg);
        for (const directiveMatches of allDirectivesMatches) {
            const fullDirectiveMatch = directiveMatches[0];
            const directive = directiveMatches[1];

            const attributes = directive.split(`.`);
            attributes.shift();

            let dataStr = ``;
            if (directiveMatches.length > 1) {
                dataStr = directiveMatches[2];
            }

            for (const attribute of attributes) {
                const location = `${attribute} of <${tagName}> at (${ctx.relativePath}:${tagLine})`;

                const attributeRegex = new RegExp(`\\s+${attribute}=(?:'(.+?)(?<!\\\\)'|"(.+?)(?<!\\\\)")`);
                const result = newTag.match(attributeRegex);

                if (result && result.length >= 2) {
                    const srcStr = result[1] || result[2];
                    const translationObjectString = createTranslationObjectString(ctx, srcStr, location, dataStr);
                    newTag = newTag.replace(fullDirectiveMatch, ``)
                        .replace(attributeRegex, ` :${attribute}="_eTr.tr(${translationObjectString})"`);
                }
            }
        }

        ctx.src.replaceAll(fullMatch, newTag);
    }

    if (hasMatches) {
        injectTrComposable(ctx);
    }
}

// replace notation attribute="Text to translate" v-t:attribute.filter1.filter2="data"
function transformTranslationVTColonAttributes(ctx) {
    const originalSrc = ctx.src.original;

    let hasMatches = false;

    let allTagsMatches = ctx.src.toString().matchAll(/<(\w+)[^<>]*?\s+v-t:[\w-]+(?:\.[\w-]+)*(?:=".+?")?[^<>]*?>/sdg);
    for (const matches of allTagsMatches) {
        hasMatches = true;

        /**
         * @type {string}
         */
        const fullMatch = matches[0];
        let newTag = fullMatch;
        const tagName = matches[1];
        const tagLine = findLineNumber(matches.indices[1], originalSrc);

        let allDirectivesMatches = fullMatch.matchAll(/\s+v-t:([\w-]+)((?:\.[\w-]+)*)(?:="(.+?)")?/sdg);
        for (const directiveMatches of allDirectivesMatches) {
            const fullDirectiveMatch = directiveMatches[0];
            const attribute = directiveMatches[1];

            let filters = []
            if (directiveMatches.length > 1) {
                filters = directiveMatches[2].split(`.`);
                filters.shift();
            }

            let dataStr = ``;
            if (directiveMatches.length > 2) {
                dataStr = directiveMatches[3];
            }

            const location = `${attribute} of <${tagName}> at (${ctx.relativePath}:${tagLine})`;
            const attributeRegex = new RegExp(`\\s+${attribute}=(?:'(.+?)(?<!\\\\)'|"(.+?)(?<!\\\\)")`);
            const result = newTag.match(attributeRegex);

            if (result && result.length >= 2) {
                const srcStr = result[1] || result[2];
                const translationObjectString = createTranslationObjectString(ctx, srcStr, location, dataStr, filters);
                newTag = newTag.replace(fullDirectiveMatch, ``)
                    .replace(attributeRegex, ` :${attribute}="_eTr.tr(${translationObjectString})"`);
            }
        }

        ctx.src.replaceAll(fullMatch, newTag);
    }

    if (hasMatches) {
        injectTrComposable(ctx);
    }
}

function transformJSTranslation(ctx) {
    const originalSrc = ctx.src.original;

    let hasMatches = false;

    let allMatches = ctx.src.toString().matchAll(/(this\.)?staticTr(Computed)?\([`'"](.+?)[`'"](?:, (.+?))?\)/dg);
    for (const matches of allMatches) {
        const fullMatch = matches[0];
        const line = findLineNumber(matches.indices[3], originalSrc);
        const thisStr = matches[1] || ``;
        const computedStr = matches[2] || ``;
        const srcStr = matches[3];
        const location = `JS template literal at (${ctx.relativePath}:${line})`;

        let dataStr = ``;
        if (matches.length > 4) {
            dataStr = matches[4];
        }

        const translationObjectString = createTranslationObjectString(ctx, srcStr, location, dataStr);
        ctx.src.replaceAll(fullMatch, `${thisStr}_eTr.tr${computedStr}(${translationObjectString})`);
        hasMatches = true;
    }

    if (hasMatches) {
        injectTrComposable(ctx);
    }
}

function createTranslationObjectString(ctx, translationString, location, dataStr = ``, filters = []) {
    if (!translationString) {
        throw new Error(`[Eye-In Translation] createTranslationObjectString srcStr is empty (location: ${location})`);
    }

    const {id, groupId, fullId, context, comment, inlineTranslations, source} = parseInlineTranslationString(translationString);

    const inlineLocales = ctx.options.inlineLocales.split(`||`);

    const translationObject = {
        id: fullId
    };

    for (const locale of ctx.options.locales) {
        let translationFound = false;

        if (groupId && !ctx.translations[locale].hasOwnProperty(groupId)) {
            ctx.translations[locale][groupId] = {};
        }

        const localeTranslation = groupId ? ctx.translations[locale][groupId] : ctx.translations[locale];
        const localeAdditionalTranslation = groupId ? ctx.additionalTranslations[locale][groupId] : ctx.additionalTranslations[locale];

        const inlineLocaleIndex = inlineLocales.indexOf(locale);
        let localeInlineTranslation = ``;
        if (inlineLocaleIndex >= 0 && inlineTranslations.length > inlineLocaleIndex && inlineTranslations[inlineLocaleIndex]) {
            localeInlineTranslation = inlineTranslations[inlineLocaleIndex];
        }

        if ((!localeTranslation || !localeTranslation.hasOwnProperty(id)) && (!localeAdditionalTranslation || !localeAdditionalTranslation.hasOwnProperty(id))) {
            // if no translation found anywhere
            const translation = {
                source: source,
                target: ``,
                found: true,
                delete_when_unused: true,
                files: {}
            };

            if (localeInlineTranslation) {
                addFileInlineTranslation(ctx, id, locale, translation, localeInlineTranslation, location);
                translationFound = true;
            }

            if (groupId) {
                localeTranslation[id] = translation;
            } else {
                localeTranslation[id] = translation;
            }

            updatedLocales.add(locale);
        } else if (localeTranslation && localeTranslation.hasOwnProperty(id) && (typeof localeTranslation[id] === `string` || localeTranslation[id].target || localeInlineTranslation)) {
            // if complete translation found
            translationFound = true;

            localeTranslation[id].found = true;

            // change translation file if inline has been updated
            if (localeInlineTranslation && localeTranslation[id].target !== localeInlineTranslation) {
                if (!ctx.hmr && localeTranslation[id].last_inline && localeTranslation[id].last_inline.trim() !== localeInlineTranslation.trim()) {
                    throw new Error(`[Eye-In Translation] /!\\ Several inline translations (with id ${id}) found with different ${locale} translation. "${source}" is translated by "${localeInlineTranslation}" or "${localeTranslation[id].last_inline}" ?`);
                }
                addFileInlineTranslation(ctx, id, locale, localeTranslation[id], localeInlineTranslation, location);
                updatedLocales.add(locale);

                if (!ctx.hmr) {
                    localeTranslation[id].last_inline = localeInlineTranslation;
                }
            }
        } else if (localeAdditionalTranslation && localeAdditionalTranslation.hasOwnProperty(id) && (typeof localeAdditionalTranslation[id] === `string` || localeAdditionalTranslation[id].target)) {
            // if complete additional translation found
            translationFound = true;
        } else if (localeTranslation && localeTranslation.hasOwnProperty(id)) {
            // translation incomplete found
            localeTranslation[id].found = true;
        }

        if (ctx.options.warnMissingTranslations && !translationFound) {
            console.warn(`[Eye-In Translation] Missing translation ${locale} @@${fullId} for "${source}", ${location.replace(` at (`, `\nat (`)}`);
        }

        if (localeTranslation && localeTranslation.hasOwnProperty(id)) {
            if (!localeTranslation[id].hasOwnProperty(`files`)) {
                localeTranslation[id].files = {};
            }

            localeTranslation[id].files[ctx.fileId] = {
                location
            };

            if (context) {
                localeTranslation[id].context = context;
                updatedLocales.add(locale);
            }

            if (comment) {
                localeTranslation[id].comment = comment;
                updatedLocales.add(locale);
            }
        }
    }

    if (!dataStr) {
        let allDataBindingMatches = source.matchAll(/\{([\w.]+)(?:|[^}]+)*}/g);
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

    return json;
}

function parseInlineTranslationString(translationString) {
    let matches = translationString.match(/@@([\w.*]+)/);

    let id = null;

    // Custom ID
    if (matches && matches.length > 1) {
        id = matches[1];
    }

    // Context
    matches = translationString.match(/\/@\s*(.+?)\s*@\//);
    let context = ``;
    if (matches && matches.length > 1) {
        context = matches[1];
    }

    // Comment
    matches = translationString.match(/\/\*\s*(.+?)\s*\*\//);
    let comment = ``;
    if (matches && matches.length > 1) {
        comment = matches[1];
    }

    translationString = translationString.split(`@@`)[0].split(`/@`)[0].split(`/*`)[0];

    // inline translations
    const inlineTranslations = translationString.split(`||`);
    for (let i = 0; i < inlineTranslations.length; i++) {
        inlineTranslations[i] = inlineTranslations[i].trim().replace(/\s{2,}/g, ` `);
    }

    const source = inlineTranslations[0];

    // create translation id
    if (!id) {
        id = createTranslationId(source + context);
    }

    // detecting group
    let groupId = null;
    const tmp = id.split(`.`);
    id = tmp.pop();
    if (tmp.length > 0) {
        groupId = tmp.pop();
    }
    if (groupId && id === `*`) {
        id = createTranslationId(source + context);
    }
    const fullId = groupId ? `${groupId}.${id}` : id;

    return {id, groupId, fullId, context, comment, inlineTranslations, source};
}

function addFileInlineTranslation(ctx, translationId, locale, translationObject, localeTranslation, location) {
    translationObject.target = localeTranslation;

    if (!ctx.hmr) {
        return;
    }

    if (!translationObject.hasOwnProperty(`files`)) {
        translationObject.files = {};
    }

    if (!ctx.currentFileTranslations[locale].hasOwnProperty(translationId)) {
        ctx.currentFileTranslations[locale][translationId] = [];
    }

    let hasError = false;
    let errorMessage = `[Eye-In Translation] Duplicate translations with same ID (${translationId}) but with different target translation for source "${translationObject.source}":\n`;
    errorMessage += `  - "${localeTranslation}" ${location.replace(` at (`, `\nat (`)}\n`;
    for (const fileId in translationObject.files) {
        if (fileId !== ctx.fileId && translationObject.files[fileId].target !== localeTranslation) {
            hasError = true;
            errorMessage += `  - "${translationObject.files[fileId].target}" ${translationObject.files[fileId].location.replace(` at (`, `\nat (`)}\n`;
        }
    }

    translationObject.files[ctx.fileId] = {
        target: localeTranslation,
        location
    };

    for (const translation of ctx.currentFileTranslations[locale][translationId]) {
        if (translation.target !== localeTranslation) {
            hasError = true;
            errorMessage += `  - "${translation.target}" ${translation.location.replace(` at (`, `\nat (`)}\n`;
        }
    }

    ctx.currentFileTranslations[locale][translationId].push({
        target: localeTranslation,
        location
    })

    errorMessage += `If these translations are meant to be different, you should use the "context" syntax: String to translate||Another inline locale /@ short description/context destined to the translator @/\n`;

    if (hasError) {
        console.error(errorMessage);
    }
}
