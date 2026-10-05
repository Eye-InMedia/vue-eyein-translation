import path from "node:path";
import fs from "node:fs";

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
        const dictionaries = [];
        for (const locale of ctx.options.locales) {
            const files = ctx.options.additionalLocalesDirs
                .map(directory => path.join(ctx.rootDir, directory, `${locale}.locale`))
                .filter(file => fs.existsSync(file))
                .sort().reverse();
            files.push(path.join(ctx.rootDir, ctx.options.assetsDir, `locales`, `${locale}.locale`));
            const names = [];
            for (const file of files) {
                const {importName, importPath} = getImportPath(ctx.rootDir, ctx.fileId, file, locale.replace(/-/g, ``).toLowerCase());
                importsPaths.push(importPath);
                importsLocale.push(locale);
                importsCode += `import ${importName} from "${importPath}";\n`;
                names.push(importName);
                code += `localeModules.push(${importName});\n`;
            }
            dictionaries.push(`[${JSON.stringify(locale)}]: {...${names.join(`, ...`)}}`);
        }

        code += `translations = reactive({${dictionaries.join(`, `)}});\n`;
        ctx.src.prepend(importsCode);
        ctx.src.replace(`/*{translations}*/`, code);
        ctx.src.replace(`/*{localesImportsOrder}*/`, `localesImportsOrder = ${JSON.stringify(importsLocale)};`);
        ctx.src.replace(`import.meta.hot.accept([]`, `import.meta.hot.accept(${JSON.stringify(importsPaths)}`);
    } else {
        ctx.src.replace(`/*{localeFilesPromisesImport}*/`, `localeFilesPromises = import.meta.glob(["/**/locales/**/*.locale"], {import: "default"});`);
    }
}

function getImportPath(rootDir, currentFileAbsolutePath, fileToImportAbsolutePath, importNamePrefix) {
    const currentDirAbsolutePath = path.dirname(currentFileAbsolutePath);
    let importPath = path.relative(currentDirAbsolutePath, fileToImportAbsolutePath).replace(/\\/g, `/`);
    if (!importPath.startsWith(`../`)) {
        importPath = `./` + importPath;
    }

    const importName = importNamePrefix + fileToImportAbsolutePath.replace(rootDir, ``).replace(/[^a-z]/gi, `_`);

    return {importName, importPath};
}
