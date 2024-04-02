Vue Eye-In Translation
======================



Compatibility
-------------
Vue 2.7, Vue 3, Vite 5



Installation
------------
```sh
npm i vue-eyein-translation
```

### Add Vue plugin

src/main.js
```js
import Vue from 'vue'
import vueEyeinTranslation from "vue-eyein-translation";

Vue.use(vueEyeinTranslation);
```


### Add Vite plugin

vite.config.js
```js
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue2'
import viteEyeinTranslation from "vue-eyein-translation/vite-plugin-vue-plugin-functions.js";

// https://vitejs.dev/config/
export default defineConfig(config => {
    return {
        // ...
        plugins: [
            vue(),
            viteEyeinTranslation(),
            // ...
        ]
        // ...
    }
})
```

### Nuxt installaiton

See [Nuxt installation documentation](docs/nuxt.md)

### Configuration
Create a file name `eyein-translation.config.js` in the root directory

```js
export default {
    locales: [`en-US`, `fr-FR`, `es-ES`], // project will be translated in 3 languages: english, french and spanish
    inlineLocales: `en-US||fr-FR`, // locales that will be inlined (No latency when locale changed, but higher bundle size)
    additionalLocalesDirs: [ // Additional directories with locales files
        `locales`
    ],
    warnMissingTranslations: true
};
```

- All locale files will be in `/src/assets/locales` in **JSON** format
- First inline locale will be used as fallback locale when no translation is found. In this example, `en-US` is the fallback locale
- Additional locale directories can be added they will be automatically copied inside `/src/assets/locales/add`. You should add this folder to your `.gitignore`

.gitignore
```
src/assets/locales/add
```

### Auto translation

You can configure auto translation with autoTranslate object in `eyein-translation.config.js` file with something like this:

```js
export default {
    locales: [`en-US`, `fr-FR`, `es-ES`],
    inlineLocales: `en-US||fr-FR`,
    additionalLocalesDirs: [
        `locales`
    ],
    warnMissingTranslations: true,
    autoTranslate: {
        locales: [`es-ES`],
        async translationFunction(fromLocale, toLocale, textsToTranslate) {
            const resp = await fetch(`<your translator endpoint>`, {
                method: `POST`,
                headers: {
                    "Content-Type": `application/json`,
                },
                body: JSON.stringify({
                    texts: textsToTranslate,
                    from: fromLocale,
                    to: toLocale
                })
            });

            return resp.json();
        }
    }
};
```

Guide
-----


### Basic Usage

- Translation inside Vue template, with custom `<t>` component:
```html
<button><t>Click Me!</t></button>
```

- Translation of attributes, with `v-t` directive:
```html
<input type="text" placeholder="Text to translate" v-t:placeholder title="My title" v-t:title>
```

You can also shorthand multiple attribute like this:
```html
<input type="text" placeholder="Text to translate" title="My title" v-t.placeholder.title>
```

- Translation of ***Vue props*** of vue components, with `v-t` directive and `.prop` modifier:
```html
<b-tabs>
    <b-tab title="My tab 1 title" v-t:title.prop></b-tab>
    <!--
    will generate something like this:
    <b-tab :title="tr({'en-US': 'My tab 1 title', ...})"></b-tab>
     -->
    <b-tab title="My tab 2 title" v-t:title.prop></b-tab>
</b-tabs>
```

*Note: filters cannot be applied: `v-t:title.prop.upper`, `.upper` will not be applied*

- Translation of hardcoded string inside Javascript, with `createTranslation`
```js
// Options API
export default {
    name: `my-component`,
    computed: { // use a computed property if you want automatic language switch when user change locale
        jsTranslation() {
            return this.createTranslation(`Javascript translation||Traduction dans le Javascript`)
        }
    }
}
```
```js
// Composition API
const createTranslation = inject(`createTranslation`)
const jsTranslation = computed(() => createTranslation(`Javascript translation||Traduction dans le Javascript`))

```

- Translation objects (for example: from a database):
```html
<template>
    <h1 v-t:title="jsTranslationObject"> <!-- directive usage -->
        <t :value="jsTranslationObject"></t> <!-- innerHtml usage -->
    </h1>
</template>
<script>
    export default {
        name: `my-component`,
        data() {
            // Object format: {"<locale>": "<translation>"}
            return {
                jsTranslationObject: {"en": `English translation`, "fr-FR": `Traduction française`}
            };
        },
        mounted() {
            // javascript usage
            console.log(this.tr(this.jsTranslationObject));
        }
    }
</script>
```
```js
// Composition API
const tr = inject(`tr`);
console.log(tr(jsTranslationObject));

// with locale watch:
const tr = inject(`tr`);
const locale = inject(`locale`);
const watchedRef = computed(() => tr(jsTranslationObject, null, locale));
```

### Available plugin methods

- `tr(translationObject, data = null, locale = null)`: Returns the translation with the given locale (current locale by default)
- `getLocales()`: Returns the list of available locales
- `getLocale()`: Returns the current locale in use
- `getLocaleTranslations()`: Return the content of the translation file for current locale
- `setLocale(locale)`: Change the current locale
- `createTranslation()`: Tells the compiler to generate a translation entry inside javascript

### Available plugin components

- `<t>`: translation component
- `<select-locale>`: Select input to change the locale

### Multiple inline translations

If you configured the plugin with multiple inline locales like `inlineLocales: "en-US||fr-FR"` instead of just `inlineLocales: "en-US"`,
you must add all translation inline while you are coding. You can do it using `||`:
```html
<button><t>Close||Fermer</t></button>
```
This will consider the first part (before `||`) to be the english translation and the second part french translation.


### Meaning

You can add context to your translation by adding a meaning
(ie a short description destined to the translator to give him the context in which the text appears).
The text will be discarded of the resulting source code and be only in the translations files.

Example:
```html
<button><t>Close||Fermer##Text of a button used to close a modal window</t></button>
```

The string `Text of a button used to close a modal window` will be added to all translations files as a context for the translator.

### Custom translation id

This plugin generate an ID based on a combination of the fallback locale text and the meaning.
For the previous example:
```html
<button><t>Close||Fermer##Text of a button used to close a modal window</t></button>
```
The generated ID will be a hash of `Close` + `Text of a button used to close a modal window`.

*Note that the `Fermer` text of the second inline locale is not used to generate the id.*

For some situations, you want to create a custom ID. For example, for common translations between projects with the `additionalLocalesDirs` feature.
You can create custom translation ids:

fr-FR.json
```json
{
    "ok": {
        "source": "ok",
        "target": "ok"
    },
    "cancel": {
        "source": "cancel",
        "target": "annuler"
    }
}
```

And use it like this in the code:
```html
<t>@@ok</t>
```

### Markdown support

Markdown is supported inside translation to apply some styling or features (only in `<t>` component):
```html
<t>**bold** *italic* _underline_ ***italic and bold*** ~~strikethrough~~ ==highlighted==, H~2~O, x^2^</t>
<t>Click on [this link](https://example.com)</t>
```

As a result some characters must be escaped in translations:
```html
<t>These characters should be escaped: \~ \= \* \_ \^</t>
```

### Filters
You can add some props or modifiers to change your translations. This can be useful for your common translations used in a lot of places.

Examples:
In `<t>` component:
```html
<p><t upper>@@ok</t> will print OK</p>
<p><t lower>@@ok</t> will print ok</p>
<p><t capitalize>@@ok</t> will print Ok</p>
<p><t lower capitalize>OK</t> will print Ok</p>
```

In `v-t` directive:
```html
<p title="@@ok" v-t:title.upper> will print OK</p>
<p title="@@ok" v-t:title.lower> will print ok</p>
<p title="@@ok" v-t:title.capitalize> will print Ok</p>
<p title="OK" v-t:title.lower.capitalize> will print Ok</p>
```
You can have only one translation for the work "ok" but use filter to change the case.

*Note: You cannot use the shorthand `v-t.title.placeholder` if you use filters you must use `v-t:title.upper v-t:placeholder.lower`*

### Data binding
- You can use `:d` prop of `<t>` component to add data binding using `{yourVariable}` inside the text
```html
<t :d="{link: `https://example.com`}">Click on [this link]({link})</t>
```
*Note: You must declare all your bindings in the `:d` prop. You cannot use Vue default data bindind with `{{yourVariable}}`.*

- Data binding can be done inside attributes too:
```html
<input v-t.title.placeholder="{world: `world`}" title="Hello {world}" placeholder="Another Hello {world}">
```

- Data binding inside javascript:
```js
let world = `world`;
createTranslation(`Hello {w}`, {w: world});
```

- Translation object:
```js
let translationFromDatabase = {en: `Hello {w}`};
console.log(this.tr(translationFromDatabase, {w: world}));
```

### Implicit Data binding
If the refs have the same name as what you want in your translations files:
```html
<template>
    <p v-t.title title="Hello {world}!">
        <t>Hello {world}!</t>
    </p>
</template>

<script setup>
    const world = ref(`world`);
</script>
```
is equivalent of:
```html
<template>
    <p v-t.title="{world}" title="Hello {world}">
        <t :d="{world}">Implicit data binding: {world}</t>
    </p>
</template>

<script setup>
    const world = ref(`world`);
</script>
```
*Note: You can't mix implicit and explicit data binding. If you add a `:d` property anything not defined inside the d property will be undefined.*

### Binding filters
You can use some filters to internationalize some of your data:

#### String case
```html
<t :d="{str1: `hello`, str2: `TRANSLATION`, str3: `world`}">{str1|capitalize} {str2|lower} {str3|upper}</t>
```
Result:
```
Hello translation WORLD
```

#### Numbers
*Note: filters work in directives too*
```html
<p v-t:title="{n: 2_000_000}" title="{n|number}"></p>
```
Result for some languages:
```
en-US: 2,000,000
fr-FR: 2 000 000
es-ES: 2.000.000
```

#### Dates
```html
<t :d="{dateNow: new Date()}">Formatted date: {dateNow|dateLong}</t>
```
Result for some languages:
```
en-US: March 25, 2024 at 3:37 PM
fr-FR: lundi 25 mars 2024 à 15 h 37
es-ES: lunes, 25 de marzo de 2024, 15:37
```

#### Plurals
See this [link](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules) for details

Syntax:
```
{case for zero|case for one|case for two/few/many/other}
or
{case for zero|case for one|case for two|case for few|case for many|case for other}
```

```html
<t :d="{n: 0}">{no time|1 minute|{n} minutes} left</p>
<t :d="{n: 1}">{no time|1 minute|{n} minutes} left</p>
<t :d="{n: 10}">{no time|1 minute|{n} minutes} left</p>
```
Result:
```
no time left
1 minute left
10 minutes left
```

#### Ordinals
```html
<t :d="{n1: 1, n2: 2, n3: 3, n4: 4, n103: 103}">Ordinals: {n1|th} {n2|th} {n3|th} {n4|th} {n103|th}</t>
```
Result:
```
Ordinals: 1st 2nd 3rd 4th 103rd
```

**Important:** Ordinals must be configured inside translations files:
/src/assets/locales/en-US.json
```json
{
    "$ordinal": {
        "one": "st",
        "two": "nd",
        "few": "rd",
        "other": "th"
    },
    "...": "..."
}
```

/src/assets/locales/fr-FR.json
```json
{
    "$ordinal": {
        "one": "^er^",
        "two": "^nd^",
        "few": "^ème^",
        "other": "^ème^"
    },
    "...": "..."
}
```

*Note: you can use Markdown*
