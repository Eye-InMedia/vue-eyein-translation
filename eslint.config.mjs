// @ts-check
import {createConfigForNuxt} from '@nuxt/eslint-config/flat';

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
    features: {
        // Rules for module authors
        tooling: true,
        // Rules for formatting
        stylistic: {
            indent: 4,
            semi: true,
            braceStyle: `1tbs`,
            commaDangle: `only-multiline`,
        },
    },
    dirs: {
        src: [
            `./playground`,
        ],
    },
}).append({
    ignores: [`test/fixtures/**`, `.superpowers/**`],
}, {
    rules: {
        '@stylistic/object-curly-spacing': [`error`, `never`],
        'vue/object-curly-spacing': [`error`, `never`],
        '@stylistic/quotes': [`error`, `backtick`, {avoidEscape: true}],
        'no-unused-vars': [`error`, {argsIgnorePattern: `^_`, varsIgnorePattern: `^_`}],
        // Translations are plain JSON objects, `obj.hasOwnProperty()` is safe here
        'no-prototype-builtins': `off`,
        // Regexes only run on project source files and developer-written translations
        'regexp/no-super-linear-backtracking': `off`,
    },
}, {
    files: [`src/runtime/components/**`],
    rules: {
        // The <t> component renders sanitized markdown and is named `t` on purpose
        'vue/no-v-html': `off`,
        'vue/component-definition-name-casing': `off`,
        // Line breaks would add whitespace around the rendered translation
        'vue/singleline-html-element-content-newline': `off`,
    },
}, {
    files: [`**/*.d.ts`],
    rules: {
        // Parameter names document signatures in declaration files, typescript-eslint handles them
        'no-unused-vars': `off`,
    },
}, {
    files: [`src/runtime/composables/staticTr*.js`],
    rules: {
        // These composables are replaced at build time, the JSDoc documents the compiled call
        'jsdoc/require-returns-check': `off`,
    },
}, {
    files: [`playground/components/**`],
    rules: {
        // Variables are used inside translations (e.g. `{myVar}`), which ESLint cannot see
        'no-unused-vars': `off`,
        '@typescript-eslint/no-unused-vars': `off`,
    },
}, {
    files: [`src/runtime/js/_eTr.js`],
    rules: {
        // `/*{placeholder}*/` comments are replaced at build time by transformVueEyeinTranslationFile
        '@stylistic/spaced-comment': `off`,
    },
});
