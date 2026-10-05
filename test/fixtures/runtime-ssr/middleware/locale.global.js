export default defineNuxtRouteMiddleware((to) => {
    if (to.params.lang) useLocale().value = to.params.lang === 'fr' ? 'fr-CA' : 'en-US';
    if (to.path === '/redirect') return navigateTo('/fr');
});
