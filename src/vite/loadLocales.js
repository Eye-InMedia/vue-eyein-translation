import fs from "fs";
import path from "path";

export default async function loadLocales(ctx) {
    console.log(`[Eye-In Translation] Loading locales...`);

    let translations = {};
    let additionalTranslations = {};

    const rootDir = process.cwd().replace(/\\/g, `/`);

    if (!fs.existsSync(path.join(rootDir, ctx.options.assetsDir, `locales`))) {
        console.log(`[Eye-In Translation] Creating locales directory: ${ctx.options.assetsDir}/locales...`);
        fs.mkdirSync(path.join(rootDir, ctx.options.assetsDir, `locales`), {recursive: true});
    }

    for (const locale of ctx.options.locales) {
        translations[locale] = {};
        additionalTranslations[locale] = {};

        const localePath = path.join(rootDir, ctx.options.assetsDir, `locales/${locale}.locale`);
        if (!fs.existsSync(localePath)) {
            console.log(`[Eye-In Translation] Creating locale file: ${localePath}...`);
            fs.writeFileSync(localePath, `{}`, {encoding: `utf-8`});
        }

        translations[locale] = JSON.parse(fs.readFileSync(localePath, {encoding: `utf-8`}));
        console.log(`[Eye-In Translation] ${localePath} loaded.`);

        for (const additionalDir of ctx.options.additionalLocalesDirs) {
            const additionalLocalePath = path.join(rootDir, additionalDir, `${locale}.locale`);

            if (fs.existsSync(additionalLocalePath)) {
                additionalTranslations[locale] = JSON.parse(fs.readFileSync(additionalLocalePath, {encoding: `utf-8`}));
                console.log(`[Eye-In Translation] ${additionalLocalePath} loaded.`);
            }
        }
    }

    console.log(`[Eye-In Translation] Locales loaded: ${Object.keys(translations).join(`, `)}`);

    return {translations, additionalTranslations};
}
