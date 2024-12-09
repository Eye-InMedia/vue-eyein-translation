import {defineNuxtPlugin} from '#app'
import vueEyeinTranslation from "../../vue3.js";

export default defineNuxtPlugin(nuxtApp => {
    nuxtApp.vueApp.use(vueEyeinTranslation);
})
