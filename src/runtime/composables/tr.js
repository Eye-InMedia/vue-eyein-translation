import {useNuxtApp} from '#app'

export default function tr() {
    const nuxtApp = useNuxtApp();
    return nuxtApp.vueApp.config.globalProperties._eTr.tr(...arguments);
}
