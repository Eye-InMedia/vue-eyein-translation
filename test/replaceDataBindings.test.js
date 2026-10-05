import {describe, it, expect} from "vitest";
import replaceDataBindings from "../src/runtime/js/replaceDataBindings.js";

describe(`replaceDataBindings`, () => {
    it(`replaces simple and nested bindings`, () => {
        expect(replaceDataBindings(`Hello {name} from {user.city}`, {name: `Bob`, user: {city: `Montreal`}}, `en-US`, {})).toBe(`Hello Bob from Montreal`);
    });

    it(`applies chained filters`, () => {
        expect(replaceDataBindings(`{name|upper} {city|lower|capitalize}`, {name: `bob`, city: `MONTREAL`}, `en-US`, {})).toBe(`BOB Montreal`);
    });
});
