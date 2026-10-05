import {afterEach, describe, expect, it, vi} from "vitest";
import {createSSRApp, h, inject, resolveDirective, resolveComponent, withDirectives} from "vue";
import {renderToString} from "vue/server-renderer";
import vue3Plugin from "../vue3.js";
import {runtimeSource, deferred} from "./helpers/runtimeSource.js";

const messages = {"en-US": `Hello`, "fr-CA": `Bonjour`, "fil-PH": `Kumusta`};
const locales = Object.keys(messages);
const immediate = () => new Promise(resolve => setImmediate(resolve));
afterEach(() => vi.restoreAllMocks());

describe(`request-local translation runtimes`, () => {
    it(`retains English across a suspended SSR render while French renders`, async () => {
        const {create} = await runtimeSource({locales, loaders: Object.fromEntries(locales.map(locale => [`/assets/locales/${locale}.locale`, async () => ({})]))});
        const en = create(), fr = create();
        await en.loadLocale(`en-US`);
        en.setLocale(`en-US`);
        await immediate();
        const pending = deferred(), started = deferred();
        const English = {async setup() {
            const runtime = inject(`_eTr`);
            const computed = runtime.trComputed(messages);
            started.resolve();
            await pending.promise;
            return () => h(`div`, [
                withDirectives(h(`a`, runtime.tr(messages)), [[resolveDirective(`t`), messages, `title`, {}]]),
                h(resolveComponent(`t`), {value: messages}),
                h(`p`, computed.value)
            ]);
        }};
        const EnglishApp = createSSRApp(English);
        EnglishApp.use(vue3Plugin, {_eTr: en});
        const EnglishRender = renderToString(EnglishApp);
        await started.promise;
        await fr.loadLocale(`fr-CA`);
        fr.setLocale(`fr-CA`);
        await immediate();
        const FrenchApp = createSSRApp({render: () => h(`p`, fr.tr(messages))});
        FrenchApp.use(vue3Plugin, {_eTr: fr});
        expect(await renderToString(FrenchApp)).toContain(`Bonjour`);
        pending.resolve();
        const html = await EnglishRender;
        expect(html).toContain(`title="Hello"`);
        expect(html).toContain(`<p>Hello</p>`);
        expect(html).not.toContain(`Bonjour`);
        expect(en.tr(messages)).toBe(`Hello`);
    });
    it(`binds destructured methods and preserves explicit computed overrides`, async () => {
        const {create} = await runtimeSource({locales, loaders: {'/assets/locales/en-US.locale': async () => ({})}});
        const runtime = create();
        await runtime.loadLocale(`en-US`);
        runtime.setLocale(`en-US`);
        await immediate();
        const {tr, trComputed, getLocale} = runtime;
        expect(tr(messages)).toBe(`Hello`);
        expect(trComputed(messages, null, `fr-CA`).value).toBe(`Bonjour`);
        expect(getLocale()).toBe(`en-US`);
    });
    it(`keeps the newest locale when imports finish in reverse order`, async () => {
        const french = deferred(), filipino = deferred();
        const {runtime} = await runtimeSource({locales, loaders: {
            '/assets/locales/fr-CA.locale': () => french.promise,
            '/assets/locales/fil-PH.locale': () => filipino.promise
        }});
        runtime.setLocale(`fr-CA`);
        runtime.setLocale(`fil-PH`);
        filipino.resolve({});
        await immediate();
        french.resolve({});
        await immediate();
        expect(runtime.getLocale()).toBe(`fil-PH`);
    });
    it(`reports void background failure without activating an unsupported locale`, async () => {
        const report = vi.spyOn(console, `error`).mockImplementation(() => {});
        const {runtime} = await runtimeSource({locales, loaders: {'/assets/locales/en-US.locale': async () => ({})}});
        await runtime.loadLocale(`en-US`);
        runtime.setLocale(`en-US`);
        expect(runtime.setLocale(`xx-invalid`)).toBeUndefined();
        await immediate();
        expect(runtime.getLocale()).toBe(`en-US`);
        expect(report).toHaveBeenCalledOnce();
    });
});
