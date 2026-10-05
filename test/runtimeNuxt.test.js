import {beforeAll, afterAll, describe, expect, it} from "vitest";
import {startRuntimeNuxtFixture} from "./helpers/runtimeNuxt.js";

let fixture;
beforeAll(async () => {
    fixture = await startRuntimeNuxtFixture({dependencyRoot: process.env.EYEIN_TEST_NUXT_ROOT});
}, 180000);
afterAll(async () => {
    await fixture?.close();
});

describe(`production Nuxt runtime`, () => {
    it(`isolates interleaved SSR requests and honors route middleware`, async () => {
        const english = fetch(`${fixture.url}/en?gate=1`, {headers: {"accept-language": `fr-CA`}});
        await fixture.controlGate(`wait`);
        let french;
        try {
            const response = await fetch(`${fixture.url}/fr`, {headers: {"cookie": `locale=xx-invalid`, "accept-language": `en-US`}});
            expect(response.status).toBe(200);
            expect(response.headers.get(`set-cookie`)).toContain(`fr-CA`);
            french = await response.text();
            expect(french).toContain(`id="inline">Bonjour`);
            expect(french).toContain(`id="external">Bonjour externe`);
            expect(french).toContain(`id="own-property">Bonjour externe`);
            expect(french).toContain(`id="prototype">Bonjour externe`);
            expect(french).toContain(`id="attribute" title="Bonjour"`);
        } finally {
            await fixture.controlGate(`release`);
        }
        const response = await english;
        const html = await response.text();
        expect(response.status).toBe(200);
        expect(html).toContain(`id="inline">Hello`);
        expect(html).toContain(`id="external">Hello external`);
        expect(html).toContain(`id="own-property">Hello external`);
        expect(html).toContain(`id="prototype">Hello external`);
        expect(html).toContain(`id="computed">Hello`);
        expect(html).toContain(`id="plain">Hello`);
        expect(html).toContain(`id="attribute" title="Hello"`);
        expect(html).toContain(`"$slocale"`);
        expect(html).toContain(`"en-US"`);
        expect(html).not.toContain(`eyeinTranslation`);
    }, 30000);
    it(`keeps HTTPS forwarded cookies secure and redirects into the selected locale`, async () => {
        const response = await fetch(`${fixture.url}/redirect`, {headers: {"x-forwarded-proto": `https`}});
        expect(response.status).toBe(200);
        expect(await response.text()).toContain(`id="inline">Bonjour`);
        expect(response.headers.get(`set-cookie`)).toContain(`Secure`);
    });
});

it(`initializes a production app without pages or a router`, async () => {
    const noPages = await startRuntimeNuxtFixture({pages: false, dependencyRoot: process.env.EYEIN_TEST_NUXT_ROOT});
    try {
        const response = await fetch(noPages.url, {headers: {"accept-language": `fr-CA`}});
        expect(response.status).toBe(200);
        expect(await response.text()).toContain(`id="plain">Bonjour`);
        const cookie = response.headers.get(`set-cookie`);
        expect(cookie).toContain(`fr-CA`);
        expect(cookie).toContain(`Path=/`);
        expect(cookie).toContain(`SameSite=Strict`);
        expect(cookie).not.toContain(`Secure`);
    } finally {
        await noPages.close();
    }
}, 180000);
