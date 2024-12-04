import {createTranslationId, debounce, findLineNumber} from "./viteUtils.js";
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

    ctx.src = transformTranslationComponents(ctx);
    ctx.src = transformTranslationSimpleAttributes(ctx);
    ctx.src = transformTranslationAttributes(ctx);
    ctx.src = transformJSTranslation(ctx);

    if (ctx.hmr) {
        hmrLocalesUpdate(ctx);
    }

    // console.log(ctx.fileId, ctx.src);

    return {
        code: ctx.src
    };
}

function injectTrComposable(ctx, injectComputed = false) {
    if (!/import \{.*inject.*} from ['"]vue['"]/.test(ctx.src)) {
        if (/import \{(.*)} from ['"]vue['"]/.test(ctx.src)) {
            ctx.src = ctx.src.replace(/import\s+\{(.*)}\s+from\s+['"]vue['"]/, `import \{$1, inject} from "vue"`);
        } else {
            ctx.src = ctx.src.replace(/(<script.*>)/, `$1\nimport {inject} from "vue"`);
        }
    }

    if (injectComputed && !/import \{.*computed.*} from ['"]vue['"]/.test(ctx.src)) {
        ctx.src = ctx.src.replace(/import\s+\{(.*)}\s+from\s+['"]vue['"]/, `import \{$1, computed} from "vue"`);
    }

    const setupRegex = /<script [^>]*setup[^>]*>/g;
    if (!setupRegex.test(ctx.src)) {
        return ctx.src;
    }

    let index = setupRegex.lastIndex;
    let endOfImportsFound = false;

    function setEndOfImportsIndex() {
        if (endOfImportsFound) {
            return;
        }
        const allImportsMatches = [...ctx.src.matchAll(/^\s*import\s+.*$/gmd)];
        if (!allImportsMatches || allImportsMatches.length === 0) {
            endOfImportsFound = true;
            return;
        }
        const lastImportMatch = allImportsMatches.pop();
        index = lastImportMatch.indices[0][1];
        endOfImportsFound = true;
    }

    if (!/inject\([`'"]_eTr[`'"]\)/g.test(ctx.src)) {
        setEndOfImportsIndex();
        ctx.src = ctx.src.substring(0, index) + `\nconst _eTr = inject('_eTr');\n` + ctx.src.substring(index);
    }

    return ctx.src;
}

function transformTranslationComponents(ctx) {
    const originalSrc = ctx.src;

    let hasMatches = false;

    let allMatches = ctx.src.matchAll(/<t((?: [^>]+)*?(?: :d="(.+?)")?(?: [^>]+)*?)>([^<>]+?)<\/t>/gd);
    for (const matches of allMatches) {
        const fullMatch = matches[0];
        const propsStr = matches[1] ? matches[1] : ``;
        const dataStr = matches[2] ? matches[2] : ``;
        const srcStr = matches[3];
        const line = findLineNumber(matches.indices[3], originalSrc);
        const context = `<t> tag at (${ctx.relativePath}:${line})`;
        const translationObjectString = createTranslationObjectString(ctx, srcStr, context, dataStr);
        ctx.src = ctx.src.replace(fullMatch, `<t ${propsStr} :value="${translationObjectString}"></t>`);
        hasMatches = true;
    }

    if (hasMatches) {
        ctx.src = injectTrComposable(ctx);
    }

    return ctx.src;
}


function transformTranslationSimpleAttributes(ctx) {
    const originalSrc = ctx.src;

    let hasMatches = false;

    let matchesLength = 1;
    let i = 0;
    while (matchesLength > 0 && i < 10) {
        i++;
        matchesLength = 0;
        let allMatches = ctx.src.matchAll(/<(\w+)[^<>]*?\s+(([\w-]+)\.t=['"](.+?)['"])[^<>]*?>/sdg);

        for (const matches of allMatches) {
            matchesLength++;
            const tagName = matches[1];
            const fullAttribute = matches[2];
            const attribute = matches[3];
            const srcStr = matches[4];
            const line = findLineNumber(matches.indices[3], originalSrc);
            const context = `${attribute} of <${tagName}> at (${ctx.relativePath}:${line})`;

            const translationObjectString = createTranslationObjectString(ctx, srcStr, context);
            ctx.src = ctx.src.replace(fullAttribute, `:${attribute}="_eTr.tr(${translationObjectString})"`);
            hasMatches = true;
        }
    }

    if (hasMatches) {
        ctx.src = injectTrComposable(ctx);
    }

    return ctx.src;
}

function transformTranslationAttributes(ctx) {
    const originalSrc = ctx.src;

    let hasMatches = false;

    let allMatches = ctx.src.matchAll(/<(\w+)[^<>]*?\s+((v-t(?:\.[\w-]+)+)(?:=['"](.+?)['"])?)[^<>]*?>/sdg);
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
            const context = `${attribute} of <${tagName}> at (${ctx.relativePath}:${line})`;

            const attributeRegex = new RegExp(`\\s+${attribute}=(?:'(.+?)(?<!\\\\)'|"(.+?)(?<!\\\\)")`);
            const result = fullMatch.match(attributeRegex);

            if (result && result.length >= 2) {
                const srcStr = result[1] || result[2];
                const translationObjectString = createTranslationObjectString(ctx, srcStr, context, dataStr);
                const newTag = fullMatch.replace(fullDirective, ``).replace(attributeRegex, ` :${attribute}="_eTr.tr(${translationObjectString})"`);
                ctx.src = ctx.src.replace(fullMatch, newTag);
                hasMatches = true;
                fullMatch = newTag;
            }
        }
    }

    let matchesLength = 1;
    let i = 0;
    while (matchesLength > 0 && i < 10) {
        i++;
        matchesLength = 0;
        let allMatches = ctx.src.matchAll(/<(\w+)[^<>]*?\s+((v-t:[\w-]+(?:\.[\w-]+)*)(?:=['"](.+?)['"])?)[^<>]*?>/sdg);

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
                const context = `${attribute} of <${tagName}> at (${ctx.relativePath}:${line})`;

                const attributeRegex = new RegExp(`\\s+${attribute}=(?:'(.+?)(?<!\\\\)'|"(.+?)(?<!\\\\)")`);
                const result = fullMatch.match(attributeRegex);

                if (result && result.length >= 2) {
                    const srcStr = result[1] || result[2];
                    const translationObjectString = createTranslationObjectString(ctx, srcStr, context, dataStr, filters);
                    const newTag = fullMatch.replace(fullDirective, ``).replace(attributeRegex, ` :${attribute}="_eTr.tr(${translationObjectString})"`);
                    ctx.src = ctx.src.replace(fullMatch, newTag);
                    hasMatches = true;
                    fullMatch = newTag;
                }
            }
        }
    }

    if (hasMatches) {
        ctx.src = injectTrComposable(ctx);
    }

    return ctx.src;
}

function transformJSTranslation(ctx) {
    const originalSrc = ctx.src;

    let hasMatches = false;

    let allMatches = ctx.src.matchAll(/(this\.)?staticTr(Computed)?\([`'"](.+?)[`'"](?:, (.+?))?\)/dg);
    for (const matches of allMatches) {
        const fullMatch = matches[0];
        const line = findLineNumber(matches.indices[3], originalSrc);
        const thisStr = matches[1] || ``;
        const computedStr = matches[2] || ``;
        const srcStr = matches[3];
        const context = `JS template literal at (${ctx.relativePath}:${line})`;

        let dataStr = ``;
        if (matches.length > 4) {
            dataStr = matches[4];
        }

        const translationObjectString = createTranslationObjectString(ctx, srcStr, context, dataStr);
        ctx.src = ctx.src.replace(fullMatch, `${thisStr}_eTr.tr${computedStr}(${translationObjectString})`);
        hasMatches = true;
    }

    if (hasMatches) {
        ctx.src = injectTrComposable(ctx);
    }

    return ctx.src;
}

function createTranslationObjectString(ctx, srcStr, context, dataStr = ``, filters = []) {
    let src = srcStr;

    if (!srcStr) {
        throw new Error(`[Eye-In Translation] createTranslationObjectString srcStr is empty (context: ${context})`);
    }

    // Custom id
    let translationId;
    let customIdUsed = false;
    let tmp = srcStr.split(`@@`);
    if (tmp.length >= 2) {
        translationId = tmp[1];
        src = tmp[0];
        customIdUsed = true
    }

    // Meaning
    tmp = src.split(`##`);
    let meaning = ``;
    if (tmp.length >= 3) {
        throw new Error(`[Eye-In Translation] Error parsing translation "${srcStr}" more than 1 "##" found.`)
    } else if (tmp.length === 2) {
        meaning = tmp[1];
        src = tmp[0];
    }

    // inline translations
    const inlineLocales = ctx.options.inlineLocales.split(`||`);
    const inlineTranslations = src.split(`||`);
    const translationSource = inlineTranslations[0].trim();

    // create translation id
    if (!translationId) {
        translationId = createTranslationId(translationSource + meaning);
    }

    // detecting group
    let groupId = null;
    tmp = translationId.split(`.`);
    translationId = tmp.pop();
    if (tmp.length > 0) {
        groupId = tmp.pop();
    }
    const fullTranslationId = groupId ? `${groupId}.${translationId}` : translationId;

    const translationObject = {
        id: fullTranslationId
    };

    for (const locale of ctx.options.locales) {
        let translationFound = false;

        const localeTranslation = groupId ? ctx.translations[locale][groupId] : ctx.translations[locale];
        const localeAdditionalTranslation = groupId ? ctx.additionalTranslations[locale][groupId] : ctx.additionalTranslations[locale];

        const inlineLocaleIndex = inlineLocales.indexOf(locale);
        let localeInlineTranslation = null;
        if (inlineLocaleIndex >= 0 && inlineTranslations.length > inlineLocaleIndex && inlineTranslations[inlineLocaleIndex]) {
            localeInlineTranslation = inlineTranslations[inlineLocaleIndex].trim();
        }

        // Managing contexts
        if (ctx.hmr) {
            // if we are in development with hot reloading, we don't remove contexts already there
            if (localeTranslation && localeTranslation.hasOwnProperty(translationId)) {
                if (!localeTranslation[translationId].contexts) {
                    localeTranslation[translationId].contexts = new Set();
                } if (!(localeTranslation[translationId].contexts instanceof Set)) {
                    localeTranslation[translationId].contexts = new Set(localeTranslation[translationId].contexts);
                }
            }
        } else {
            // if we are in build mode, we reset contexts to a new Set
            if (localeTranslation && localeTranslation.hasOwnProperty(translationId) && (!localeTranslation[translationId].contexts || !(localeTranslation[translationId].contexts instanceof Set))) {
                localeTranslation[translationId].contexts = new Set();
            }
        }

        if ((!localeTranslation || !localeTranslation.hasOwnProperty(translationId)) && (!localeAdditionalTranslation || !localeAdditionalTranslation.hasOwnProperty(translationId))) {
            // if no translation found anywhere
            const translation = {
                source: translationSource,
                target: ``,
                last_update: new Date(),
                delete_when_unused: true
            };

            if (meaning) {
                translation.meaning = meaning;
            }

            if (customIdUsed) {
                translation.source ||= translationId;
            } else {
                translation.contexts = new Set([context]);
            }

            const inlineLocaleIndex = inlineLocales.indexOf(locale);
            if (inlineLocaleIndex >= 0 && inlineTranslations.length > inlineLocaleIndex) {
                translation.target = localeInlineTranslation;
                translationFound = true;
            }

            if (groupId) {
                localeTranslation[translationId] = translation;
            } else {
                localeTranslation[translationId] = translation;
            }

            updatedLocales.add(locale);
        } else if (localeTranslation && localeTranslation.hasOwnProperty(translationId) && (typeof localeTranslation[translationId] === `string` || localeTranslation[translationId].target || localeInlineTranslation)) {
            // if complete translation found
            translationFound = true;

            if (!customIdUsed) {
                localeTranslation[translationId].contexts.add(context);
            }
            localeTranslation[translationId].last_update = new Date();

            // change translation file if inline has been updated
            if (localeInlineTranslation && localeTranslation[translationId].target !== localeInlineTranslation) {
                if (!ctx.hmr && localeTranslation[translationId].last_inline && localeTranslation[translationId].last_inline.trim() !== localeInlineTranslation.trim()) {
                    throw new Error(`[Eye-In Translation] /!\\ Several inline translations (with id ${translationId}) found with different ${locale} translation. "${translationSource}" is translated by "${localeInlineTranslation}" or "${localeTranslation[translationId].last_inline}" ?`);
                }

                localeTranslation[translationId].target = localeInlineTranslation;
                updatedLocales.add(locale);

                if (!ctx.hmr) {
                    localeTranslation[translationId].last_inline = localeInlineTranslation;
                }
            }
        } else if (localeAdditionalTranslation && localeAdditionalTranslation.hasOwnProperty(translationId) && (typeof localeAdditionalTranslation[translationId] === `string` || localeAdditionalTranslation[translationId].target)) {
            // if complete additional translation found
            translationFound = true;
        } else if (localeTranslation && localeTranslation.hasOwnProperty(translationId)) {
            // translation incomplete found update context
            if (!customIdUsed) {
                localeTranslation[translationId].contexts.add(context);
            }
            localeTranslation[translationId].last_update = new Date();
        }

        if (ctx.options.warnMissingTranslations && !translationFound) {
            console.warn(`[Eye-In Translation] Missing translation ${locale} @@${fullTranslationId} for "${translationSource}", ${context.replace(` at (`, `\nat (`)}`);
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

    return json;
}
