import path from "path";
import fs from "fs";
import crypto from "crypto";

export default function saveLocales(ctx, localesToSave = null) {
    if (ctx.options.debug) {
        console.log(`[Eye-In Translation] Saving translation files...`);
    }

    for (const locale of ctx.options.locales) {
        if (localesToSave && !localesToSave.includes(locale)) {
            continue;
        }

        if (!ctx.hmr) {
            if (ctx.options.purgeOldTranslations) {
                for (const translationId in ctx.translations[locale]) {
                    if (!ctx.translations[locale][translationId].source) {
                        // if it's a group of translations
                        const groupId = translationId;
                        for (const translationId in ctx.translations[locale][groupId]) {
                            if (!ctx.translations[locale][groupId][translationId].found && ctx.translations[locale][groupId][translationId].delete_when_unused) {
                                console.warn(`[Eye-In Translation] Deleting removed ${locale} translation (id: ${translationId}): ${ctx.translations[locale][groupId][translationId].source}`);
                                delete ctx.translations[locale][groupId][translationId];
                            }
                        }
                    } else if (!ctx.translations[locale][translationId].found && ctx.translations[locale][translationId].delete_when_unused) {
                        // if it's a translation without group
                        console.warn(`[Eye-In Translation] Deleting removed ${locale} translation (id: ${translationId}): ${ctx.translations[locale][translationId].source}`);
                        delete ctx.translations[locale][translationId];
                    }
                }
            }

            if (ctx.options.autoTranslate.locales?.includes(locale) && ctx.options.autoTranslate.translationFunction) {
                autoTranslateLocale(ctx, locale)
                    .catch(e => {
                        console.error(e);
                    });
            }
        } else if (ctx.options.debug) {
            console.log(`[Eye-In Translation] Skipping purge and auto translation in dev mode...`);
        }

        const rootDir = process.cwd().replace(/\\/g, `/`);
        const localePath = path.join(rootDir, ctx.options.assetsDir, `locales/${locale}.locale`);

        const fingerprintArray = [];
        const localeTranslations = JSON.parse(JSON.stringify(ctx.translations[locale]));
        for (const translationId in localeTranslations) {
            if (!localeTranslations[translationId].source) {
                const groupId = translationId;
                for (const translationId in localeTranslations[groupId]) {
                    purgeTranslationObject(localeTranslations[groupId][translationId]);
                }
            }

            purgeTranslationObject(localeTranslations[translationId]);

            fingerprintArray.push(translationId + JSON.stringify(localeTranslations[translationId]))
        }

        // Sort alphabetically locale object
        const entries = Object.entries(localeTranslations);
        entries.sort((a, b) => {
            const aKey = a[0];
            const bKey = b[0];

            if (aKey.startsWith(`zz`) && bKey.startsWith(`zz`)) {
                const aSource = typeof a[1] === `string` ? a[1] : a[1].source;
                const bSource = typeof b[1] === `string` ? b[1] : b[1].source;
                if (!aSource) {
                    return -1;
                }
                if (!bSource) {
                    return 1;
                }

                return aSource.localeCompare(bSource);
            } else if (aKey.startsWith(`zz`)) {
                return 1;
            } else if (bKey.startsWith(`zz`)) {
                return -1;
            } else {
                return aKey.localeCompare(bKey);
            }
        });

        const ordered = Object.fromEntries(entries);
        ordered.$fingerprint = crypto.createHash(`md5`).update(fingerprintArray.toSorted().join(`#`)).digest(`hex`)

        if (fs.existsSync(localePath)) {
            const oldLocaleFileContent = JSON.parse(fs.readFileSync(localePath, {encoding: `utf8`}));

            if (oldLocaleFileContent.$fingerprint === ordered.$fingerprint) {
                if (ctx.options.debug) {
                    console.log(`[Eye-In Translation] Locale ${locale} fingerprint is the same.`);
                }
                return;
            }
        }

        const newLocaleFileContent = JSON.stringify(ordered, null, `    `);
        if (ctx.options.debug) {
            console.log(`[Eye-In Translation] Saving ${locale} translation files...`);
        }
        fs.writeFileSync(localePath, newLocaleFileContent, {encoding: `utf-8`});
    }
}

async function autoTranslateLocale(ctx, locale) {
    const sourceLocale = ctx.options.inlineLocales.split(`||`).shift();

    let textsToTranslate = [];
    let translationsInfo = [];

    for (const translationId in ctx.translations[locale]) {
        if (ctx.translations[locale][translationId].target) {
            continue;
        }

        if (!translations[locale][translationId].source) {
            continue;
        }

        let translationSource = ctx.translations[locale][translationId].source;
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

    const translatedTexts = await ctx.options.autoTranslate.translationFunction(sourceLocale, locale, textsToTranslate);

    for (let i = 0; i < translationsInfo.length; i++) {
        const info = translationsInfo[i];
        let translatedText = translatedTexts[i];
        for (const placeholder in info.data) {
            translatedText = translatedText.replace(placeholder, info.data[placeholder]);
        }
        ctx.translations[locale][info.id].target = translatedText;
    }
}

function purgeTranslationObject(translationObject) {
    if (translationObject.files) {
        translationObject.used = Object.keys(translationObject.files).length;
    }
    delete translationObject.last_update;
    delete translationObject.last_inline;
    delete translationObject.contexts;
    delete translationObject.meaning;
    delete translationObject.files;
    delete translationObject.found;
}
