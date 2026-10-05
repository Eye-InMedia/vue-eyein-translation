import {describe, it, expect} from "vitest";
import _eTr from "../src/runtime/js/_eTr.js";

describe(`_eTr.tr`, () => {
    it(`converts every {{variable}} to a data binding`, () => {
        expect(_eTr.tr({"en-US": `Hi {{a}} and {{b}}`}, {a: `A`, b: `B`}, `en-US`)).toBe(`Hi A and B`);
    });
});
