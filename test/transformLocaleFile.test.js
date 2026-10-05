import {expect, it} from "vitest";
import MagicString from "magic-string";
import transformLocaleFile from "../src/vite/transformLocaleFile.js";

it(`flattens groups containing a custom hasOwnProperty translation ID`, () => {
    const src = new MagicString(JSON.stringify({group: {hasOwnProperty: `Own property`, greeting: {source: `Hello`, target: `Bonjour`}}}));
    transformLocaleFile({src});
    expect(src.toString()).toContain(`"group.hasOwnProperty":"Own property"`);
    expect(src.toString()).toContain(`"group.greeting":"Bonjour"`);
});

it(`keeps own prototype-like IDs in the executable locale module`, () => {
    const src = new MagicString(`{"__proto__":"Prototype","constructor":"Constructor","hasOwnProperty":"Own property"}`);
    transformLocaleFile({src});
    const dictionary = new Function(src.toString().replace(`export default locale;`, `return locale;`))();
    expect(Object.prototype.hasOwnProperty.call(dictionary, `__proto__`)).toBe(true);
    expect(dictionary.__proto__).toBe(`Prototype`);
    expect(dictionary.constructor).toBe(`Constructor`);
    expect(dictionary.hasOwnProperty).toBe(`Own property`);
});
