import {parse} from "node-html-parser";
import {createTranslationId, debounce, findLineNumber, getEndOfImportsIndex} from "./viteUtils.js";
import saveLocales from "./saveLocales.js";

const rootDir = process.cwd().replace(/\\/g, `/`);

let updatedLocales = new Set();
const hmrLocalesUpdate = debounce(ctx => {
    if (updatedLocales.size === 0) {
        return;
    }
    saveLocales(ctx, [...updatedLocales]);
    updatedLocales = new Set();
}, 500);

export default function transformVueFile(ctx) {
    if (ctx.fileId.includes(`/node_modules/`) || ctx.fileId.includes(`/t.vue`) || ctx.fileId.includes(`/vue2T.vue`)) {
        return false;
    }

    ctx.relativePath = ctx.fileId.replace(rootDir, ``);
    ctx.currentFileTranslations = {};

    for (const locale of ctx.options.locales) {
        if (!ctx.currentFileTranslations.hasOwnProperty(locale)) {
            ctx.currentFileTranslations[locale] = {};
        }
    }

    const root = parse(ctx.src.toString());

    for (const rootNode of root.childNodes) {
        if (!rootNode.tagName) {
            continue;
        }

        switch (rootNode.tagName) {
            case "TEMPLATE":
                transformTemplate(ctx, rootNode);
                break;
            case "SCRIPT":
                transformScript(ctx, rootNode);
                break;
        }
    }

    if (ctx.hmr) {
        hmrLocalesUpdate(ctx);
    }

    // console.log(ctx.fileId, ctx.src.toString());
}

function transformTemplate(ctx, rootNode) {
    if (!rootNode.tagName) {
        return;
    }

    if (rootNode.tagName === `T`) {
        transformTranslationComponents(ctx, rootNode);
        return;
    } else {
        transformTranslationAttributes(ctx, rootNode);
    }

    for (const childNode of rootNode.childNodes) {
        transformTemplate(ctx, childNode);
    }
}

function transformTranslationAttributes(ctx, rootNode) {
    for (const srcAttributeName in rootNode.attributes) {
        if (srcAttributeName.startsWith(`v-t:`)) {
            transformTranslationVTColonAttribute(ctx, rootNode, srcAttributeName);
        } else if (srcAttributeName.startsWith(`v-t.`)) {
            transformTranslationVTDotAttributes(ctx, rootNode, srcAttributeName);
        } else if (srcAttributeName.endsWith(`.t`)) {
            transformTranslationDotTAttributes(ctx, rootNode, srcAttributeName);
        }
    }
}

function transformTranslationComponents(ctx, rootNode) {
    if (`value` in rootNode.attributes || `:value` in rootNode.attributes) {
        return;
    }

    const line = findLineNumber(rootNode.range, ctx.src.original);
    const location = `<t> tag at (${ctx.relativePath}:${line})`;
    const dataStr = rootNode.attributes[`:d`] || ``;
    const translationObjectString = createTranslationObjectString(ctx, rootNode.innerHTML, location, dataStr);

    ctx.src.appendLeft(rootNode.range[0] + 2, ` :value="${translationObjectString}"`);

    let start = null;
    let end = null;
    for (const childNode of rootNode.childNodes) {
        if (start === null || start > childNode.range[0]) {
            start = childNode.range[0];
        }

        if (end === null || end < childNode.range[1]) {
            end = childNode.range[1];
        }
    }

    ctx.src.remove(start, end);
}

function transformTranslationVTColonAttribute(ctx, rootNode, srcAttributeName) {
    const filters = srcAttributeName.replace(`v-t:`, ``).split(`.`);
    const attributeName = filters.shift();

    if (!(attributeName in rootNode.attributes)) {
        return;
    }

    const line = findLineNumber(rootNode.range, ctx.src.original);
    const location = `${attributeName} of <${rootNode.tagName.toLowerCase()}> at (${ctx.relativePath}:${line})`;
    const translationStr = rootNode.attributes[attributeName];
    const datStr = rootNode.attributes[srcAttributeName];
    const translationObjectString = createTranslationObjectString(ctx, translationStr, location, datStr, filters);

    const attributeRegex = new RegExp(`\\s+${attributeName}=(?:'.+?(?<!\\\\)'|".+?(?<!\\\\)")`, `d`);
    let matches = rootNode.outerHTML.match(attributeRegex);
    if (matches && matches.length >= 1) {
        const start = rootNode.range[0] + matches.indices[0][0];
        const end = rootNode.range[0] + matches.indices[0][1];
        ctx.src.overwrite(start, end, ` :${attributeName}="_eTr.tr(${translationObjectString})"`);
    }

    const directiveRegex = new RegExp(`\\s+${srcAttributeName}(?:=(?:'.+?(?<!\\\\)'|".+?(?<!\\\\)"))?`, `d`);
    matches = rootNode.outerHTML.match(directiveRegex);
    if (matches && matches.length >= 1) {
        const start = rootNode.range[0] + matches.indices[0][0];
        const end = rootNode.range[0] + matches.indices[0][1];
        ctx.src.remove(start, end);
    }
}

function transformTranslationVTDotAttributes(ctx, rootNode, srcAttributeName) {
    const attributes = srcAttributeName.split(`.`);
    attributes.shift();

    const line = findLineNumber(rootNode.range, ctx.src.original);

    for (const attributeName of attributes) {
        if (!(attributeName in rootNode.attributes)) {
            continue;
        }

        const translationStr = rootNode.attributes[attributeName];
        const location = `${attributeName} of <${rootNode.tagName.toLowerCase()}> at (${ctx.relativePath}:${line})`;
        const datStr = rootNode.attributes[srcAttributeName];
        const translationObjectString = createTranslationObjectString(ctx, translationStr, location, datStr);

        const attributeRegex = new RegExp(`\\s+${attributeName}=(?:'.+?(?<!\\\\)'|".+?(?<!\\\\)")`, `d`);
        let matches = rootNode.outerHTML.match(attributeRegex);
        if (matches && matches.length >= 1) {
            const start = rootNode.range[0] + matches.indices[0][0];
            const end = rootNode.range[0] + matches.indices[0][1];
            ctx.src.overwrite(start, end, ` :${attributeName}="_eTr.tr(${translationObjectString})"`);
        }
    }

    const directiveRegex = new RegExp(`\\s+${srcAttributeName}(?:=(?:'.+?(?<!\\\\)'|".+?(?<!\\\\)"))?`, `d`);
    const matches = rootNode.outerHTML.match(directiveRegex);
    if (matches && matches.length >= 1) {
        const start = rootNode.range[0] + matches.indices[0][0];
        const end = rootNode.range[0] + matches.indices[0][1];
        ctx.src.remove(start, end);
    }
}


function transformTranslationDotTAttributes(ctx, rootNode, srcAttributeName) {
    const attributeName = srcAttributeName.replace(/\.t$/, ``);

    const line = findLineNumber(rootNode.range, ctx.src.original);
    const location = `${attributeName} of <${rootNode.tagName.toLowerCase()}> at (${ctx.relativePath}:${line})`;
    const translationStr = rootNode.attributes[srcAttributeName];
    const translationObjectString = createTranslationObjectString(ctx, translationStr, location);

    const attributeRegex = new RegExp(`\\s+${srcAttributeName}=(?:'.+?(?<!\\\\)'|".+?(?<!\\\\)")`, `d`);
    let matches = rootNode.outerHTML.match(attributeRegex);
    if (matches && matches.length >= 1) {
        const start = rootNode.range[0] + matches.indices[0][0];
        const end = rootNode.range[0] + matches.indices[0][1];
        ctx.src.overwrite(start, end, ` :${attributeName}="_eTr.tr(${translationObjectString})"`);
    }
}

function transformScript(ctx, rootNode) {
    let hasMatches = false;

    let allMatches = ctx.src.original.matchAll(/(this\.)?staticTr(Computed)?\([`'"](.+?)[`'"](?:, (.+?))?\)/dg);
    for (const matches of allMatches) {
        const fullMatch = matches[0];
        const line = findLineNumber(matches.indices[3], ctx.src.original);
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

function createTranslationObjectString(ctx, translationStr, location, dataStr = ``, filters = []) {
    if (!translationStr) {
        throw new Error(`[Eye-In Translation] createTranslationObjectString srcStr is empty (location: ${location})`);
    }

    const {id, groupId, fullId, context, comment, inlineTranslations, source} = parseInlineTranslationString(translationStr);

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

                if (!ctx.hmr) {
                    translation.last_inline = localeInlineTranslation;
                }
            }

            localeTranslation[id] = translation;

            updatedLocales.add(locale);
        } else if (localeTranslation && localeTranslation.hasOwnProperty(id) && (typeof localeTranslation[id] === `string` || localeTranslation[id].target || localeInlineTranslation)) {
            // if complete translation found
            translationFound = true;

            localeTranslation[id].found = true;

            // change translation file if inline has been updated
            if (localeInlineTranslation && localeTranslation[id].target !== localeInlineTranslation) {
                if (!ctx.hmr && localeTranslation[id].last_inline && localeTranslation[id].last_inline.trim() !== localeInlineTranslation.trim()) {
                    ctx.errors.push(new Error(`[Eye-In Translation] /!\\ Several inline translations (with id ${id}) found with different ${locale} translation. "${source}" is translated by "${localeInlineTranslation}" or "${localeTranslation[id].last_inline}" ?`));
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
