import {describe, it, expect} from "vitest";
import MagicString from "magic-string";
import transformVueFile from "../src/vite/transformVueFile.js";

function transform(code, translations = null) {
    const locales = [`en-US`, `fr-CA`];
    const ctx = {
        options: {locales, inlineLocales: `en-US||fr-CA`, warnMissingTranslations: false},
        translations: translations || Object.fromEntries(locales.map(locale => [locale, {}])),
        additionalTranslations: Object.fromEntries(locales.map(locale => [locale, {}])),
        fileId: `/project/components/Test.vue`,
        src: new MagicString(code),
        hmr: false,
        errors: []
    };
    transformVueFile(ctx);
    return ctx.src.toString();
}

describe(`transformVueFile staticTr`, () => {
    it(`compiles a single line staticTr call`, () => {
        const code = transform(`<script setup>\nconst title = staticTr(\`Hello||Bonjour\`);\n</script>\n`);
        expect(code).not.toMatch(/staticTr\(/);
        expect(code).toMatch(/_eTr\.tr\(\{data: \{\},'id':'zz\w+'\}\)/);
    });

    it(`compiles a multi-line staticTr call with data`, () => {
        const code = transform(`<script setup>\nconst title = staticTr(\n    \`Hello {name}||Bonjour {name}\`,\n    {name: user.name},\n);\n</script>\n`);
        expect(code).not.toMatch(/staticTr\(/);
        expect(code).toMatch(/_eTr\.tr\(\{data: \{name: user\.name\},'id':'zz\w+'\}\)/);
    });
});

describe(`transformVueFile with translations stored as plain strings`, () => {
    it(`uses them without modifying them`, () => {
        const translations = {"en-US": {myid: `Hi`}, "fr-CA": {myid: `Salut`}};
        const code = transform(`<template>\n    <t>Hello@@myid</t>\n</template>\n`, translations);

        expect(code).toMatch(/<t :value="\{data: \{\},'id':'myid'\}">/);
        expect(translations).toEqual({"en-US": {myid: `Hi`}, "fr-CA": {myid: `Salut`}});
    });
});
