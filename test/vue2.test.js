import {describe, it, expect, vi} from "vitest";
import vue2Plugin from "../vue2.js";
import {runtimeSource} from "./helpers/runtimeSource.js";

vi.mock(`../src/runtime/components/vue2T.vue`, () => ({default: {}}));

describe(`vue2 plugin install`, () => {
    it(`stubs staticTr and staticTrComputed, which must be compiled at build time`, () => {
        const Vue = {prototype: {}, directive: vi.fn(), component: vi.fn()};
        vue2Plugin.install(Vue, {locales: [`en-US`]});

        expect(() => Vue.prototype.staticTr()).toThrow(/compile time/);
        expect(() => Vue.prototype.staticTrComputed()).toThrow(/compile time/);
    });
});

it(`binds Vue 2 prototype methods and directives to its selected runtime`, async () => {
    const {create} = await runtimeSource({loaders: {"/assets/locales/en-US.locale": async () => ({}), "/assets/locales/fr-CA.locale": async () => ({})}});
    const runtime = create();
    await runtime.changeLocale(`fr-CA`);
    const Vue = {prototype: {}, directive: vi.fn(), component: vi.fn()};
    vue2Plugin.install(Vue, {locales: [`en-US`, `fr-CA`], _eTr: runtime});
    const {tr, trComputed, getLocale} = Vue.prototype;
    const value = {"en-US": `Hello`, "fr-CA": `Bonjour`};
    expect(tr(value)).toBe(`Bonjour`);
    expect(trComputed(value).value).toBe(`Bonjour`);
    expect(getLocale()).toBe(`fr-CA`);
    expect(Vue.prototype._eTr).toBe(runtime);
    expect(Vue.directive.mock.calls[0][1].getSSRProps({arg: `title`, value, modifiers: {}})).toEqual({title: `Bonjour`});
});
