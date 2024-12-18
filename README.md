Vue Eye-In Translation
======================



Compatibility
-------------
Vue 2.7, Vue 3, Nuxt 3, Vite 5



Installation
------------
```sh
npm i vue-eyein-translation
```

### Add Vue plugin

#### Vue 3
src/main.js
```js
import { createApp } from 'vue'
import vueEyeinTranslation from "vue-eyein-translation/vue3.js";

const app = createApp({})

app.use(vueEyeinTranslation);

app.mount('#app');
```

#### Vue 2
src/main.js
```js
import Vue from 'vue'
import vueEyeinTranslation from "vue-eyein-translation/vue2.js";

Vue.use(vueEyeinTranslation);

new Vue({
    render: h => h(App)
}).$mount(`#app`);
```

#### Nuxt 3
nuxt.config.js
```js
export default defineNuxtConfig({
    // ...
    modules: [
        // ...
        [`vue-eyein-translation`, {
            locales: [`en-US`, `fr-CA`, `es-ES`],
            inlineLocales: `en-US||fr-CA`,
            assetsDir: `assets`,
            additionalLocalesDirs: [`vue-components/locales`],
            autoTranslate: {
                locales: [`es-ES`],
                async translationFunction(fromLocale, toLocale, textsToTranslate) {
                    const resp = await fetch(`http://localhost:3000/translate`, {
                        method: `POST`,
                        headers: {
                            "Content-Type": `application/json`
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
        }]
    ]
    // ...
})

```


### Add Vite plugin

*Note: This step is not necessary for Nuxt 3*

vite.config.js
```js
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue2'
import viteEyeinTranslation from "vue-eyein-translation/vite-plugin-vue-eyein-translation.js";
import eyeinTranslationConfig from "./eyein-translation.config.js";

// https://vitejs.dev/config/
export default defineConfig(config => {
    return {
        // ...
        plugins: [
            vue(),
            viteEyeinTranslation(eyeinTranslationConfig),
            // ...
        ]
        // ...
    }
})
```

### Configuration
You can create a file `eyein-translation.config.js` in the root directory

```js
export default {
    locales: [`en-US`, `fr-FR`, `es-ES`], // project will be translated in 3 languages: english, french and spanish
    inlineLocales: `en-US||fr-FR`, // locales that will be inlined (No latency when locale changed, but higher bundle size)
    additionalLocalesDirs: [ // Additional directories with locales files
        `locales`
    ],
    warnMissingTranslations: true,
    debug: false
};
```

- All locale files will be in `/src/assets/locales` in **JSON** format
- First inline locale will be used as fallback locale when no translation is found. In this example, `en-US` is the fallback locale


For Nuxt:
You can then import it when you load the plugin:
```js
import eyeinTranslationConfig from "../eyein-translation.config.js";

// main.js
app.use(vueEyeinTranslation, eyeinTranslationConfig);

// vite.config.js
viteEyeinTranslation(eyeinTranslationConfig)

// nuxt.config.js
[`vue-eyein-translation`, eyeinTranslationConfig]
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
                    "Content-Type": `application/json`
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

You can also use a shorthand for multiple attribute with `.` like this:
```html
<input type="text" placeholder="Text to translate" title="My title" v-t.placeholder.title>
```

Another shorthand using `.t` after the attribute name (But your IDE might alert you about unknown or missing attribute):
```html
<input type="text" placeholder.t="Text to translate" title.t="My title">
```

*Note: You cannot apply filters with shorthands. You must use the `v-t:` syntax like this: `v-t:title.upper`*

- Translation of hardcoded string inside Javascript, with `staticTr`
```js
// Options API
export default {
    name: `my-component`,
    data() {
        return {
            jsTranslation: this.staticTr(`Javascript translation||Traduction dans le Javascript`),
            // use staticTrComputed if you want it to be reactive to locale changes (beware of .value)
            jsTranslationComputed: this.staticTrComputed(`Javascript translation||Traduction dans le Javascript`)
        }
    }
}
```
```js
// Composition API
const staticTr = inject(`staticTr`)
const jsTranslation = staticTr(`Javascript translation||Traduction dans le Javascript`)

// use staticTrComputed if you want it to be reactive to locale changes (beware of .value)
const jsTranslationComputed = staticTrComputed(`Javascript translation||Traduction dans le Javascript`)

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
            console.log(this.trComputed(this.jsTranslationObject).value);
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
const jsTranslation = tr(jsTranslationObject);

const trComputed = inject(`trComputed`);
const jsTranslationComputed = trComputed(jsTranslationObject);
// equivalent of const jsTranslationComputed = computed(() => tr(jsTranslationObject, null, locale));
```

### Available plugin methods

#### Vue
- `tr(translationObject, data = null, locale = null)`: Returns the translation with the given locale (current locale by default)
- `trComputed(translationObject, data = null)`: Returns a computed of the translation with current locale, value change reactively with locale change
- `getLocales()`: Returns the list of available locales
- `getLocale()`: Returns the current locale in use
- `setLocale(locale)`: Change the current locale
- `staticTr(translationInput)`: Tells the compiler to generate a translation entry inside
- `staticTrComputed(translationInput)`: Tells the compiler to generate a translation entry and use `trComputed` as return value

#### Nuxt composables
- `tr(translationObject, data = null, locale = null)`: Returns the translation with the given locale (current locale by default)
- `getLocales()`: Returns the list of available locales
- `useLocale()`: Returns the current locale as a cookie ref that can be changed to load other locales
- `staticTr()`: Tells the compiler to generate a translation entry inside

### Available plugin components

- `<t>`: translation component

### Multiple inline translations

If you configured the plugin with multiple inline locales like `inlineLocales: "en-US||fr-FR"` instead of just `inlineLocales: "en-US"`,
you must add all translation inline while you are coding. You can do it using `||`:
```html
<button><t>Close||Fermer</t></button>
```
This will consider the first part (before `||`) to be the english translation and the second part french translation.


### Context (will affect translation ID)

You can add context to your translation by adding: `/@ some context @/`
(ie a short description destined to the translator to give him the context in which the text appears).
The text will be discarded of the resulting source code and be only in the translations files.

Example:
```html
<button><t>Close||Fermer /@ This will be used in a button to close a modal @/</t></button>
```

The string `This will be used in a button to close a modal` will be added to all .locale files as a context for the translator.

### Comment (Context but without altering the id)
It's like the context but it does not affect the id.

Example:
```html
<button><t>Close||Fermer /* This will be used in a button to close a modal */</t></button>
```

### Custom translation id

This plugin generate an ID based on a combination of the fallback locale text and the context.
For the previous examples:
```html
<button><t>Close||Fermer /@ This will be used in a button to close a modal @/ /* A comment */</t></button>
```
The generated ID will be a hash of `Close` + `This will be used in a button to close a modal`.

*Note that the `Fermer` and `A comment` texts are not used to generate the id.*

For some situations, you want to create a custom ID. For example, for common translations between projects with the `additionalLocalesDirs` feature.
You can create custom translation ids:

fr-FR.locale
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

Custom id takes priority:
```html
<button><t>Close||Fermer @@customId /@ This will be used in a button to close a modal @/ /* A comment */</t></button>
```
The id will only be: `customId`

### Grouping custom translation IDs
With custom id you can group your translation (one level only) with the dot `.` notation:

```html
<t>Not Found@@errors.not_found</t>
<t>@@errors.unavailable</t>
```

will generate en-US.locale:
```json
{
    "errors": {
        "not_found": {
            "source": "Not found",
            "target": "Not found"
        },
        "unavailable": {
            "source": "",
            "target": ""
        }
    }
}
```

### Grouping translations with auto ID
You can use the preceding notation with the joker `*` to group without the need to add a full custom id

```html
<t>Not Found@@errors.*</t>
<t>@@errors.*</t>
```

will generate en-US.locale:
```json
{
    "errors": {
        "zz1q8easg04mskn2": {
            "source": "Not found",
            "target": "Not found"
        },
        "zz1vvovo70n94tmv": {
            "source": "",
            "target": ""
        }
    }
}
```

### Markdown support

Markdown is supported inside translation to apply some styling or features (only in `<t>` component):
```html
<t>**bold** *italic* _underline_ ***italic and bold*** ~~strikethrough~~ --strikethrough alternative-- ==highlighted==, H~2~O, x^2^</t>
<t>Click on [this link](https://example.com)</t>
```

As a result some characters must be escaped in translations:
```html
<t>These characters should be escaped: \~ \= \* \_ \^</t>
```

We added Markdown-like features to add custom classes or id:
```html
<!-- Custom classes -->
<t class:1="highlighted bordered">
    This __word__(1) must have classes .highlighted and .bordered
</t>
<!-- will generate: -->
This <span class="highlighted bordered">word</span> must have classes .highlighted and .bordered

<!-- Custom classes shorthand with no parenthesis (works only with __text__ syntax) -->
<t class:_="highlighted bordered">
    This __word__ must **have** classes .highlighted and .bordered
</t>
<!-- will generate: -->
This <span class="highlighted bordered">word</span> must <strong>have</strong> classes .highlighted and .bordered

<!-- Custom id -->
<t id:1="myId">
    __some text with id__(1)
</t>
<!-- will generate: -->
<span id="myId">some text with id</span>

<!-- Custom id or class + another markdown -->
<t id:1="myId">
    **some text with id**(1)
</t>
<!-- will generate: -->
<strong id="myId">some text with id</strong>

<!-- More complex example -->
<t id:1="myId" class:1="highlighted" class:2="highlighted">
    This *word*(1) must have class .highlighted and id #myId.
    Another **words**(2) with __only__(2) class .highlighted but different tags
</t>
<!-- will generate: -->
This <em id="myId" class="highlighted">word</em> must have class .highlighted and id #myId.
Another <strong class="highlighted">word</strong> with <span class="highlighted">only</span> class .highlighted but different tags
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

*Note: You cannot use the shorthands `v-t.title.placeholder` or  `placeholder.t` if you use filters you must use `v-t:title.upper v-t:placeholder.lower`*

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
const staticTranslation = staticTr(`Hello {w}`, {w: world});
console.log(staticTranslation);

const reactiveTranslation = staticTrComputed(`Hello {w}`, {w: world});
console.log(reactiveTranslation.value); // computed() is used, beware of the .value !
```

- Translation object:
```js
let translationFromDatabase = {en: `Hello {w}`};

const staticTranslation = this.tr(translationFromDatabase, {w: world});
console.log(staticTranslation);

const reactiveTranslation = this.trComputed(translationFromDatabase, {w: world});
console.log(reactiveTranslation.value); // computed() is used, beware of the .value !
```

### Implicit Data binding
If the refs have the same name as what you want in your translations files:
```html
<template>
    <a title.t="Hello {world}!">
        <t>Hello {world}!</t>
    </a>
</template>

<script setup>
    const world = ref(`world`);
</script>
```
is equivalent of:
```html
<template>
    <p v-t:title="{world}" title="Hello {world}">
        <t :d="{world}">Hello {world}</t>
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
<div><t :d="{n: 0}">{no time|1 minute|{n} minutes} left</t></div>
<div><t :d="{n: 1}">{no time|1 minute|{n} minutes} left</t></div>
<div><t :d="{n: 10}">{no time|1 minute|{n} minutes} left</t></div>
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
/src/assets/locales/en-US.locale
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

/src/assets/locales/fr-FR.locale
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
