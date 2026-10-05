import {describe, it, expect, vi} from "vitest";
import vue2Plugin from "../vue2.js";

vi.mock(`../src/runtime/components/vue2T.vue`, () => ({default: {}}));

describe(`vue2 plugin install`, () => {
    it(`stubs staticTr and staticTrComputed, which must be compiled at build time`, () => {
        const Vue = {prototype: {}, directive: vi.fn(), component: vi.fn()};
        vue2Plugin.install(Vue, {locales: [`en-US`]});

        expect(() => Vue.prototype.staticTr()).toThrow(/compile time/);
        expect(() => Vue.prototype.staticTrComputed()).toThrow(/compile time/);
    });
});
