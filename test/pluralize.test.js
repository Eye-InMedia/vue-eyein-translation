import {describe, it, expect} from "vitest";
import pluralize from "../src/runtime/js/pluralize.js";

describe(`pluralize`, () => {
    it(`picks the zero, one and other choices`, () => {
        const str = `{no time|1 minute|{n} minutes} left`;
        expect(pluralize(str, {n: 0}, `en-US`)).toBe(`no time left`);
        expect(pluralize(str, {n: 1}, `en-US`)).toBe(`1 minute left`);
        expect(pluralize(str, {n: 10}, `en-US`)).toBe(`{n} minutes left`);
    });

    it(`falls back to the last choice for the "many" rule with 4 choices`, () => {
        // fr selects "many" for 1 000 000
        expect(pluralize(`{zero|one|few|{n} other}`, {n: 1000000}, `fr-CA`)).toBe(`{n} other`);
    });

    it(`inserts the chosen text literally, even with $ replacement patterns`, () => {
        expect(pluralize(`{none|one $' x|{n} many}`, {n: 1}, `en-US`)).toBe(`one $' x`);
    });
});
