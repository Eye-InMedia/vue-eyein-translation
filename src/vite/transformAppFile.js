import path from "path";
import fs from "fs";
import {getVueEndOfImportsIndex} from "./viteUtils.js";

const rootDir = process.cwd();

export default function transformAppFile(ctx) {
    const defaultLocale = ctx.options.locales[0];

    let importsCode = `\n`;
    let code = `
        const _eTr = inject("_eTr");
        const _eTrTranslations = {};
        let _eTrLocaleFilesPromises = {};
        try {
            _eTrLocaleFilesPromises = import.meta.glob(["/**/locales/**/*.locale", "!/**/${defaultLocale}.locale"], {import: "default"});
        } catch (e) {
            console.error(e);
        }
        `;

    if (!/import \{.*inject.*} from ['"]vue['"]/.test(ctx.src)) {
        importsCode += `import {inject} from "vue";\n`
    }

    if (!/import \{.*reactive.*} from ['"]vue['"]/.test(ctx.src)) {
        importsCode += `import {reactive} from "vue";\n`
    }

    let importsPaths = {};
    for (const locale of ctx.options.locales) {
        const localeAbsolutePath = path.join(rootDir, ctx.options.assetsDir, `locales`, `${locale}.locale`);
        const localeLowercase = locale.replace(/-/g, ``).toLowerCase();
        const {importName, importPath} = getImportPath(ctx.fileId, localeAbsolutePath, localeLowercase);

        importsPaths[locale] = importPath;

        // Always import default locale (first locale of the array)
        if (ctx.hmr || ctx.options.locales.indexOf(locale) === 0) {
            importsCode += `import ${importName} from "${importPath}";\n`;
            code += `_eTrTranslations["${locale}"] = ${importName};\n`;
        } else {
            code += `_eTrTranslations["${locale}"] = {};\n`;
        }

        for (const additionalDir of ctx.options.additionalLocalesDirs) {
            const additionalLocaleAbsolutePath = path.join(rootDir, additionalDir, `${locale}.locale`);

            if (fs.existsSync(additionalLocaleAbsolutePath)) {
                const {importName, importPath} = getImportPath(ctx.fileId, additionalLocaleAbsolutePath, localeLowercase);

                if (ctx.hmr || ctx.options.locales.indexOf(locale) === 0) {
                    importsCode += `import ${importName} from "${importPath}";\n`;
                    code += `_eTrTranslations["${locale}"] = {...${importName}, ..._eTrTranslations["${locale}"]}\n`;
                }
            }
        }
    }

    for (const locale of ctx.options.locales) {
        code += `_eTrTranslations["${locale}"] = reactive(_eTrTranslations["${locale}"]);\n`;
    }

    importsCode += `\n`;
    code += `\n

    _eTr.init({
        translations: _eTrTranslations,
        assetsDir: "${ctx.options.assetsDir}",
        additionalLocalesDirs: ${JSON.stringify(ctx.options.additionalLocalesDirs)},
        localeFilesPromises: _eTrLocaleFilesPromises,
        nuxt: ${!!ctx.options.nuxt}
    });\n`;

    if (ctx.options.nuxt) {
        code += `useLocale();\nsetLocaleWatcher();\n`
    }

    if (ctx.hmr) {
        code += `
        if (import.meta.hot) {
            const locales = ${JSON.stringify(Object.keys(importsPaths))};
            import.meta.hot.accept(${JSON.stringify(Object.values(importsPaths))}, modules => {
                let i = 0;
                for (const module of modules) {
                    const locale = locales[i];
                    i++;
                    if (!module) {
                        continue;
                    }

                    for (const key in module.default) {
                        _eTrTranslations[locale][key] = module.default[key];
                    }
                }
            });
        }
        `;
    }

    if (/<script.*>/.test(ctx.src.original)) {
        if (/<script.*\s+setup.*>/.test(ctx.src.original)) {
            // Composition API
            const index = getVueEndOfImportsIndex(ctx.src.original);
            if (index >= 0) {
                ctx.src.appendRight(index, code);
            } else {
                ctx.src.replace(`</script>`, code + `</script>`);
            }
        } else {
            // Options API
            const createdRegex = /created\s*:?\s*(?:function)?\s*\(\s*\)\s*(?:=>\s*)?\{/m;
            if (createdRegex.test(ctx.src.original)) {
                ctx.src.replace(createdRegex, `created() {` + code);
            } else {
                ctx.src.replace(/export\s*default\s*\{/m, `export default {\ncreated() {` + code + `},`);
            }
        }


        ctx.src.replace(/(<script.*>)/, (_, $1) => $1 + importsCode);
    } else {
        // if <script> tag is totally missing in the file
        ctx.src.append(`\n<script setup>${importsCode}${code}</script>`);
    }

    // console.log(ctx.fileId, ctx.src.toString());
}

function getImportPath(currentFileAbsolutePath, fileToImportAbsolutePath, importNamePrefix) {
    const currentDirAbsolutePath = path.dirname(currentFileAbsolutePath);
    let importPath = path.relative(currentDirAbsolutePath, fileToImportAbsolutePath).replace(/\\/g, `/`);
    if (!importPath.startsWith(`../`)) {
        importPath = `./` + importPath;
    }

    const importName = importNamePrefix + fileToImportAbsolutePath.replace(rootDir, ``).replace(/[^a-zA-Z]/g, `_`);

    return {importName, importPath};
}
