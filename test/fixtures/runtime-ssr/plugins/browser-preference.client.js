export default defineNuxtPlugin({
    enforce: 'pre',
    setup() {
        window.__translationDiagnostics = [];
        window.__fixturePageLoadToken = crypto.randomUUID();
        for (const method of ['warn', 'error']) {
            const original = console[method];
            console[method] = (...args) => {
                window.__translationDiagnostics.push(args.map(String).join(' '));
                original(...args);
            };
        }
        window.addEventListener('error', event => window.__translationDiagnostics.push(event.message));
        window.addEventListener('unhandledrejection', event => window.__translationDiagnostics.push(String(event.reason)));
        const locale = new URLSearchParams(location.search).get('browserLocale');
        if (locale) {
            Object.defineProperty(navigator, 'languages', {configurable: true, value: [locale]});
            Object.defineProperty(navigator, 'language', {configurable: true, value: locale});
        }
    }
});
