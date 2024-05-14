Nuxt installation
=================

Add vite plugin
---------------
`nuxt.config.js`
```js
import viteEyeinTranslation from "vue-eyein-translation/vite-plugin-vue-eyein-translation.js";

export default defineNuxtConfig({
    // ...
    vite: {
        build: {
            target: `esnext`
        },
        plugins: [
            viteEyeinTranslation()
        ]
    },
    nitro: {
        esbuild: {
            options: {
                target: `esnext`
            }
        }
    }
})

```

Add Nuxt plugin
---------------

Create a new file `/plugins/translations.js`:
```js
import vueEyeinTranslation from "vue-eyein-translation"

export default defineNuxtPlugin(nuxtApp => {
    // example of SSR-friendly locale detection
    let locale;
    if (process.server) {
        const headers = useRequestHeaders([`accept-language`])
        if (headers[`accept-language`]) {
            locale = headers[`accept-language`].substring(0, 5)
        }
    } else {
        locale = navigator.language.substring(0, 5)
    }

    // For Nuxt you must provide a state-like object to detect locale changes (useState or useCookie)
    const localeState = useCookie(`locale`);
    localeState.value ||= locale;

    nuxtApp.vueApp.use(vueEyeinTranslation, {
        localeState: localeState
    })
})
```

Configuration
-------------

`eyein-translation.config.js`

```js

export default {
    locales: [`en-US`, `fr-CA`, `es-ES`],
    inlineLocales: `en-US||fr-CA`,
    assetsDir: `assets` // You must change the default assets dir
};

```

.gitignore
```
assets/locales/add
```
