import defaultOptions from "./src/defaultOptions.js";
import transformVueFile from "./src/vite/transformVueFile.js";
import transformLocaleFile from "./src/vite/transformLocaleFile.js";
import saveLocales from "./src/vite/saveLocales.js";
import loadLocales from "./src/vite/loadLocales.js";
import MagicString from "magic-string";
import transformVueEyeinTranslationFile from "./src/vite/transformVueEyeinTranslationFile.js";
import fs from "fs";
import path from "path";

function getVueFiles(dir) {
    let files = [];
    for (const file of fs.readdirSync(dir)) {
        if (["node_modules", "dist", "build", ".git", ".output"].includes(file)) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            files = files.concat(getVueFiles(fullPath));
        } else if (file.endsWith(".vue")) {
            files.push(fullPath);
        }
    }
    return files;
}

export default function viteEyeinTranslation(options = {}) {
    options = {...defaultOptions, ...options};

    let config;
    let translations;
    let additionalTranslations;
    let hmr = false;
    let errors = [];
    let logger;
    let scanTriggered = false;

    function runScanAndExit(rootDir) {
        const root = rootDir || process.cwd();
        const srcDir = path.resolve(root, "");
        const log = logger ?? { info: console.log, warn: console.warn, error: console.error };

        log.info(`[Eye-In Translation] ▶ Start scan`);
        log.info(`[Eye-In Translation] root: ${root}`);
        log.info(`[Eye-In Translation] target: ${srcDir}${srcDir === root ? " (root)" : ""}`);
        if (srcDir === root) log.warn(`[Eye-In Translation] Scanning project root. Consider restricting to "src" if needed.`);

        const { translations: t, additionalTranslations: a } = loadLocales({ options });

        const countKeys = (obj) => {
            try {
                return Object.values(obj || {}).reduce((acc, v) => {
                    if (v && typeof v === "object" && !Array.isArray(v)) return acc + Object.keys(v).length;
                    return acc;
                }, 0);
            } catch {
                return 0;
            }
        };

        const before = { t: countKeys(t), a: countKeys(a) };

        const files = getVueFiles(srcDir);
        log.info(`[Eye-In Translation] .vue files found: ${files.length}`);

        const localErrors = [];
        let scannedCount = 0;
        let changedCount = 0;

        files.forEach((fileId, idx) => {
            const rel = path.relative(root, fileId);
            const code = fs.readFileSync(fileId, "utf-8");
            const src = new MagicString(code);
            const ctx = { options, translations: t, additionalTranslations: a, fileId, src, hmr: false, errors: localErrors };
            ctx.options.skipSameFingerprint = true;

            transformVueFile(ctx);

            const changed = typeof src.hasChanged === "function" ? src.hasChanged() : (src.toString() !== code);
            if (changed) {
                changedCount++;
                log.info(`[Eye-In Translation] [${idx + 1}/${files.length}] changed: ${rel}`);
            } else {
                log.info(`[Eye-In Translation] [${idx + 1}/${files.length}] scanned: ${rel}`);
            }
            scannedCount++;
        });

        saveLocales({ options, translations: t, additionalTranslations: a, hmr: false });

        const after = { t: countKeys(t), a: countKeys(a) };
        const dt = after.t - before.t;
        const da = after.a - before.a;

        if (localErrors.length > 0) {
            const msg = localErrors.map(e => (e?.stack || e?.message || String(e))).join("\n");
            log.error(`[Eye-In Translation] ${localErrors.length} error(s)\n${msg}`);
            process.exit(1);
        } else {
            log.info(`[Eye-In Translation] ▶ Scan complete`);
            log.info(`[Eye-In Translation] Files scanned: ${scannedCount}, changed: ${changedCount}`);
            log.info(`[Eye-In Translation] Keys — translations: ${after.t} (${dt >= 0 ? "+" : ""}${dt}), additional: ${after.a} (${da >= 0 ? "+" : ""}${da})`);
            process.exit(0);
        }
    }


    return {
        name: "vite-plugin-vue-eyein-translation",
        enforce: "pre",

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            hmr = config.command === "serve";
            logger = config.logger;

            const byMode = config.mode === "scan";
            const byFlag = process.argv.includes("--scan-translations");
            const byEnv  = process.env.SCAN_TRANSLATIONS === "1";
            scanTriggered = Boolean(byMode || byFlag || byEnv);
        },

        buildStart() {
            const result = loadLocales({ options });
            translations = result.translations;
            additionalTranslations = result.additionalTranslations;
            errors = [];

            if (scanTriggered) {
                const rootDir = config?.root || process.cwd();
                runScanAndExit(rootDir);
            }
        },

        buildEnd() {
            if (scanTriggered) return;

            if (errors.length > 0) {
                const msg = errors.map(e => (e?.stack || e?.message || String(e))).join("\n");
                (logger?.error || console.error)(msg);
                throw new AggregateError(errors);
            }

            saveLocales({ options, translations, additionalTranslations, hmr });
        },
        transform(code, fileId) {
            /**
             * @type {MagicString|null}
             */
            let src = null;
            if (/\/_eTr\.js/.test(fileId)) {
                src = new MagicString(code);
                transformVueEyeinTranslationFile({options, translations, additionalTranslations, fileId, src, hmr, errors});
            } else if (/\.vue$/.test(fileId) && !fileId.includes(`/node_modules/`)) {
                src = new MagicString(code);
                transformVueFile({options, translations, additionalTranslations, fileId, src, hmr, errors});
            } else if (/\/locales\/.+\.locale/.test(fileId)) {
                src = new MagicString(code);
                transformLocaleFile({options, fileId, src, hmr, errors});
            }

            if (src) {
                return {
                    code: src.toString(),
                    map: src.generateMap({hires: true})
                };
            }

            return null;
        },
        handleHotUpdate({file, server, modules, timestamp}) {
            if (!/\.locale$/.test(file)) {
                return null;
            }

            return modules;
        }
    }
}
