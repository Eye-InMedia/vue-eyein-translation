import path from "path";
import fs from "fs";

const rootDir = process.cwd();

export default function transformVueEyeinTranslationFile(ctx) {
    ctx.src.replace(`/*{assetsDir}*/`, `assetsDir = "${ctx.options.assetsDir}";`);
    ctx.src.replace(`/*{locales}*/`, `locales = ${JSON.stringify(ctx.options.locales)};`);

    if (ctx.options.additionalLocalesDirs && ctx.options.additionalLocalesDirs.length > 0) {
        ctx.src.replace(`/*{additionalLocalesDirs}*/`, `additionalLocalesDirs = ${JSON.stringify(ctx.options.additionalLocalesDirs)};`);
    }

    if (ctx.hmr) {
        let importsPaths = [];
        let importsLocale = [];
        let importsCode = ``;
        let code = ``;
        for (const locale of ctx.options.locales) {
            const localeAbsolutePath = path.join(rootDir, ctx.options.assetsDir, `locales`, `${locale}.locale`);
            const localeLowercase = locale.replace(/-/g, ``).toLowerCase();
            const {importName, importPath} = getImportPath(ctx.fileId, localeAbsolutePath, localeLowercase);

            importsPaths.push(importPath);
            importsLocale.push(locale);

            importsCode += `import ${importName} from "${importPath}";\n`;
            code += `translations["${locale}"] = reactive(${importName});\n`;

            for (const additionalDir of ctx.options.additionalLocalesDirs) {
                const additionalLocaleAbsolutePath = path.join(rootDir, additionalDir, `${locale}.locale`);

                if (fs.existsSync(additionalLocaleAbsolutePath)) {
                    const {importName, importPath} = getImportPath(ctx.fileId, additionalLocaleAbsolutePath, localeLowercase);

                    importsPaths.push(importPath);
                    importsLocale.push(locale);

                    importsCode += `import ${importName} from "${importPath}";\n`;
                    code += `translations["${locale}"] = reactive({...${importName}, ...translations["${locale}"]})\n`;
                }
            }
        }

        ctx.src.prepend(importsCode);
        ctx.src.replace(`/*{translations}*/`, code);
        ctx.src.replace(`/*{localesImportsOrder}*/`, `localesImportsOrder = ${JSON.stringify(importsLocale)};`);
        ctx.src.replace(`import.meta.hot.accept([]`, `import.meta.hot.accept(${JSON.stringify(importsPaths)}`);
    } else {
        ctx.src.replace(`/*{localeFilesPromisesImport}*/`, `localeFilesPromises = import.meta.glob(["/**/locales/**/*.locale"], {import: "default"});`);
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

