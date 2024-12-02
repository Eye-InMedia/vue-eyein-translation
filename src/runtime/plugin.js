import {defineNuxtPlugin} from '#app'
import vueEyeinTranslation from "../../vue3.js";

export default defineNuxtPlugin(async nuxtApp => {
    nuxtApp.vueApp.use(vueEyeinTranslation);
})
