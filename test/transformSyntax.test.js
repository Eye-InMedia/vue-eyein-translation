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

describe(`script injection`, () => {
    it(`inserts the composable after a multiline import`, () => {
        const {code} = transform(`<script setup>\nimport {\n    ref,\n    computed\n} from "vue";\nconst title = staticTr("Hello");\n</script>`);
        expect(code.indexOf(`const _eTr`)).toBeGreaterThan(code.indexOf(`} from "vue";`));
        expectValidScripts(code);
    });

    it(`reuses an inject imported on several lines`, () => {
        const {code} = transform(`<script setup>\nimport {\n    inject,\n    ref\n} from "vue";\nconst title = staticTr("Hello");\n</script>`);
        expect(code).not.toContain(`import {inject}`);
        expectValidScripts(code);
    });

    it(`reuses an aliased inject import`, () => {
        const {code} = transform(`<script setup>\nimport {inject as provideValue} from "vue";\nconst title = staticTr("Hello");\n</script>`);
        expect(code).toContain(`const _eTr = provideValue('_eTr');`);
        expect(code).not.toContain(`import {inject}`);
        expectValidScripts(code);
    });

    it(`does not confuse a type-only import with a runtime inject`, () => {
        const {code} = transform(`<script setup lang="ts">\nimport type {inject} from "vue";\nconst title = staticTr("Hello");\n</script>`);
        expect(code).toContain(`import {inject as __eyeinInject} from "vue"`);
        expect(code).toContain(`const _eTr = __eyeinInject('_eTr');`);
        expectValidScripts(code);
    });

    it(`handles script content on the opening tag line`, () => {
        const {code} = transform(`<script setup>const title = staticTr("Hello");</script>`);
        expect(code).not.toContain(`staticTr(`);
        expect(code).toContain(`const _eTr`);
        expectValidScripts(code);
    });
});

describe(`independent script blocks`, () => {
    it(`transforms both normal and setup scripts and injects into setup`, () => {
        const {code} = transform(`<script>\nexport default {methods: {title() { return this.staticTr("Hello"); }}};\n</script>\n<script setup lang="ts">\nimport type {Ref} from "vue";\nconst title = staticTr("Hello");\n</script>`);
        const scripts = parseHTML(code).querySelectorAll(`script`);
        expect(scripts[0].innerHTML).toContain(`this._eTr.tr(`);
        expect(scripts[1].innerHTML).toContain(`const _eTr = inject('_eTr');`);
        expect(code).not.toContain(`staticTr(`);
        expectValidScripts(code);
    });

    it(`does not let an inject call for another variable suppress the binding`, () => {
        const {code} = transform(`<script setup>\nconst other = inject("_eTr");\nconst title = staticTr("Hello");\n</script>`);
        expect(code).toContain(`const _eTr = inject('_eTr');`);
        expectValidScripts(code);
    });

    it(`preserves an existing _eTr binding`, () => {
        const {code} = transform(`<script setup>\nimport {inject} from "vue";\nconst _eTr = inject("_eTr");\nconst title = staticTr("Hello");\n</script>`);
        expect(code.match(/const _eTr/g)).toHaveLength(1);
        expectValidScripts(code);
    });
});

describe(`template expression boundaries`, () => {
    it(`compiles interpolations and bound attributes without a script block`, () => {
        const {code} = transform(`<template><div :title="staticTr('Hello', {name: fmt(n)})">{{ staticTr('World') }}</div></template>`);
        expect(code).not.toContain(`staticTr(`);
        expect(code.match(/_eTr\.tr\(/g)).toHaveLength(2);
        expect(code).toContain(`data: {name: fmt(n)}`);
    });

    it(`ignores static text, template comments and styles`, () => {
        const original = `<template><!-- staticTr("Comment") --><p>staticTr("Text")</p><div title="staticTr('Attribute')" /></template><script setup>\nconst x = 1;\n</script><style>.foo::after {content: 'staticTr("CSS")';}</style>`;
        expect(transform(original).code).toBe(original);
    });

    it(`parses interpolation strings containing closing braces`, () => {
        const {code} = transform(`<template><p>{{ staticTr('Hello }} world') }}</p></template>`);
        expect(code).not.toContain(`staticTr(`);
        expect(code).toContain(`_eTr.tr(`);
    });

    it(`compiles calls in a template without injecting a script variable`, () => {
        const {code} = transform(`<template>{{ staticTr('Hello') }}</template><script setup>\nconst x = 1;\n</script>`);
        expect(code).toContain(`_eTr.tr(`);
        expect(code).not.toContain(`const _eTr`);
        expectValidScripts(code);
    });
});

describe(`translated attribute values`, () => {
    it.each([
        `<template><img alt.t="Hello\n    World" /></template>`,
        `<template><img alt="Hello\n    World" v-t:alt="{name:\n    user.name}" /></template>`,
        `<template><img alt="Hello\n    World" v-t.alt="{name:\n    user.name}" /></template>`
    ])(`compiles multiline values: %s`, (original) => {
        const {code} = transform(original);
        expect(code).toContain(`:alt="_eTr.tr(`);
        expect(code).not.toContain(`v-t`);
        expect(code).not.toContain(`alt.t=`);
    });

    it.each([
        `<template><img alt.t="" /></template>`,
        `<template><img alt="" v-t:alt="" /></template>`,
        `<template><img alt="" v-t.alt="" /></template>`
    ])(`keeps an empty translated attribute empty: %s`, (original) => {
        const {code, translations} = transform(original);
        expect(code).toContain(`alt=""`);
        expect(code).not.toContain(`v-t`);
        expect(code).not.toContain(`alt.t=`);
        expect(translations[`en-US`]).toEqual({});
    });
});

describe(`opening tag attribute ranges`, () => {
    it(`does not match a child's attribute when the parent has a boolean attribute`, () => {
        const {code} = transform(`<template><div alt v-t:alt><img alt="Child" /></div></template>`);
        expect(code).toContain(`<div alt="">`);
        expect(code).toContain(`<img alt="Child" />`);
    });

    it(`matches alt.t exactly beside altXt`, () => {
        const {code} = transform(`<template><img altXt="Keep" alt.t="Translate" /></template>`);
        expect(code).toContain(`altXt="Keep"`);
        expect(code).not.toContain(`alt.t=`);
        expect(code).toContain(`:alt="_eTr.tr(`);
    });

    it(`matches directives exactly beside a similarly named attribute`, () => {
        const {code} = transform(`<template><img alt="Translate" v-tXalt="Keep" v-t.alt /></template>`);
        expect(code).toContain(`v-tXalt="Keep"`);
        expect(code).not.toContain(`v-t.alt`);
        expect(code).toContain(`:alt="_eTr.tr(`);
    });

    it(`accepts spaces around the equals sign and > inside a value`, () => {
        const {code} = transform(`<template><img title="x > y" alt.t = 'Translate' /></template>`);
        expect(code).toContain(`title="x > y"`);
        expect(code).toContain(`:alt="_eTr.tr(`);
        expect(code).not.toContain(`alt.t`);
    });
});
