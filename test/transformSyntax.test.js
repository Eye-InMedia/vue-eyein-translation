import {describe, it, expect} from "vitest";
import {parse as parseScript} from "@babel/parser";
import {parse as parseHTML} from "node-html-parser";
import MagicString from "magic-string";
import transformVueFile from "../src/vite/transformVueFile.js";

function transform(code, fileId = `/project/components/Test.vue`) {
    const locales = [`en-US`, `fr-CA`];
    const ctx = {
        options: {locales, inlineLocales: `en-US||fr-CA`, warnMissingTranslations: false},
        translations: Object.fromEntries(locales.map(locale => [locale, {}])),
        additionalTranslations: Object.fromEntries(locales.map(locale => [locale, {}])),
        rootDir: `/project`, fileId, src: new MagicString(code), hmr: false, errors: []
    };
    transformVueFile(ctx);
    return {code: ctx.src.toString(), translations: ctx.translations};
}

function expectValidScripts(code) {
    for (const script of parseHTML(code).querySelectorAll(`script`)) {
        expect(() => parseScript(script.innerHTML, {sourceType: `module`, plugins: [`typescript`, `jsx`]})).not.toThrow();
    }
}

describe(`script call syntax`, () => {
    it(`keeps nested parentheses and template literals in data intact`, () => {
        const {code} = transform(`<script setup>\nconst title = staticTr("Hello", {name: fmt(n), label: \`a\${fn(1)}\`});\n</script>`);
        expect(code).not.toContain(`staticTr(`);
        expect(code).toContain(`data: {name: fmt(n), label: \`a\${fn(1)}\`}`);
        expectValidScripts(code);
    });

    it(`handles identical this.staticTr and staticTr calls without overlapping edits`, () => {
        const {code} = transform(`<script>\nexport default {methods: {title() { return this.staticTr("Hello") + staticTr("Hello"); }}};\n</script>`);
        expect(code).toContain(`this._eTr.tr(`);
        expect(code).not.toContain(`staticTr(`);
        expectValidScripts(code);
    });

    it(`ignores comments and strings that look like translation calls`, () => {
        const original = `<script setup>\n// staticTr("Comment")\nconst text = 'staticTr("String")';\nconst title = staticTr("Hello");\n</script>`;
        const {code, translations} = transform(original);
        expect(code).toContain(`// staticTr("Comment")`);
        expect(code).toContain(`const text = 'staticTr("String")';`);
        expect(Object.values(translations[`en-US`]).map(value => value.source)).toEqual([`Hello`]);
        expectValidScripts(code);
    });

    it(`ignores similarly named identifiers and unrelated methods`, () => {
        const original = `<script setup>const a = mystaticTr("Hello"); const b = other.staticTr("Hello");</script>`;
        expect(transform(original).code).toBe(original);
    });
});
