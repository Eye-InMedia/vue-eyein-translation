# Batch C — locale selection and SSR isolation

Date: 2026-10-05
Baseline: 6.3.1, commit `46f7b0f`
Status: proposed approach approved; written specification pending user review.

## Intent and success criteria

The user requested the next improvement batch using Superpowers after batches A,
E, and B. Batch C addresses locale cookies, Accept-Language negotiation, browser
detection, and consistent translations across SSR, hydration, and navigation.

Success means simultaneous English and French requests retain their own language,
translations never use a partially loaded dictionary, hydration preserves the
server's selected locale, and navigation respects the application's locale
middleware. Existing translation IDs, locale files, Vue 2/3 entry points, and
public method signatures remain compatible. Publishing remains the user's task.

## Evidence from the baseline

Read-only probes established these defects:

1. `_eTr.js` owns a module-level `localeState`. A Vue SSR application renders
   `<p>Hello</p>` after selecting English, then renders `<p>Bonjour</p>` after
   another operation selects French. Both applications use the same state.
2. `loadLocale` writes each dictionary into the shared cache as its import
   resolves. A second call returns because that locale exists in the cache,
   although a later import remains pending. An entry from that import is missing
   until the first call finishes.
3. `useLocale` accepts `xx-invalid` from its cookie without validation.
4. `fr-CA;q=0.1,en-US;q=1` selects French because weights are discarded.
5. A throwing `localStorage` getter escapes `detectBrowserLocale`.
6. With `en-US`, `fi-FI`, `fil-PH`, and `fr-CA` configured, preference `fil`
   selects `fi-FI`, and `FR-CA` selects the default English locale.

The website's `middleware/setLang.global.js` sets `useLocale().value` from
`to.meta.lang`. The plugin must accommodate that existing middleware without
requiring website source changes.

## Approach and alternatives

Use one translation runtime per Nuxt application/request, with a shared,
fully-loaded dictionary cache. All locale-dependent methods close over that
runtime's state. Nuxt composables and Vue injections resolve the same instance.

Passing an explicit locale to every translation call would leave existing
components, computed translations, and directives vulnerable to inconsistent
context. Giving every request a separate dictionary cache would duplicate loads
and complicate HMR. The selected approach isolates request state while retaining
the existing shared data and loading mechanism.

## C1 — isolate locale-dependent runtime state

- Introduce an internal runtime factory in `_eTr.js`. Keep the existing default
  export as the standalone Vue 2/3 runtime.
- Each factory instance owns its active locale ref and locale-change revision.
  Translation data, configuration, HMR updates, and import bookkeeping remain
  shared within the built module.
- `tr`, `trComputed`, `getLocale`, `setLocale`, directive callbacks, and locale
  option lookup must operate through their owning runtime, including when passed
  as unbound functions. No method may accidentally close over the default
  singleton's locale.
- The Nuxt plugin constructs an instance for its `nuxtApp`, provides it through
  Nuxt's application context, and installs the existing Vue 3 plugin with that
  instance using the existing `_eTr` override.
- Nuxt `tr` and `trComputed` resolve their runtime synchronously from the current
  Nuxt application and retain it in computed callbacks. They must not resolve
  Nuxt context later from an asynchronous callback or fall back to a server-wide
  singleton when initialization failed.
- `getLocales` may read immutable configuration without a request instance.
  Existing compiled `_eTr` injections, `<t>`, and `v-t` receive the instance
  without changing compiler-generated translation calls.
- Preserve the existing `useState('locale')` key and `useLocale(): Ref<string>`.
  Keep runtime instances and promises out of the serialized Nuxt payload.

## C2 — complete loading and ordered locale changes

- Maintain a pending load per locale. Concurrent callers wait for the same work;
  a dictionary's presence alone must not signal completion.
- Match locale files by exact filename and directory boundaries, not substring
  matches that include another locale or a directory sharing a prefix.
- Merge imported data into a temporary dictionary. Publish it atomically after
  every matching import succeeds. Preserve existing main-directory precedence
  over additional dictionaries and deterministic traversal of imports.
- Preserve HMR's eager dictionaries and updates. Factory instances must observe
  the shared reactive cache after publication and HMR updates.
- If loading fails, `loadLocale` rejects, discards temporary data, and removes its
  pending entry so a later call can retry. Never mark a failed load as complete.
- Configured locales with empty dictionaries remain valid. An unconfigured
  locale is rejected; a configured production locale with no matching assets is
  reported as a loading error instead of silently becoming active.
- A change revision prevents an older asynchronous completion from overwriting
  a newer selection. Test two delayed changes completed in reverse order.
- Preserve the public `setLocale(locale): void` signature. Already loaded valid
  locales activate synchronously. Background failures are handled and reported
  without an unhandled rejection or replacing the last working locale.
- Initialization and awaited navigation propagate loading failure through Nuxt's
  normal error handling. A client-side background failure retains the previous
  active locale and restores the requested state and cookie if that failed change
  is still the latest request.

## C3 — validated locale negotiation

Separate matching a supported locale from falling back to the configured default.
This prevents an invalid cookie from suppressing a valid browser preference.

- Match configured locale tags case-insensitively and return their configured
  spelling. Prefer an exact match, then a match on the entire base language
  subtag, preserving configured order for regional alternatives.
- Never use the first two characters as the language identifier: `fil` and `fi`
  are distinct. Ignore malformed, empty, or non-string preference values.
- Parse Accept-Language entries, trim whitespace, honor quality values, and keep
  input order for equal weights. Omitted weight means 1; malformed weights and
  entries are ignored. A weight of 0 excludes the corresponding language range.
- Respect more specific ranges when resolving wildcard preferences. `*` can
  choose an otherwise permitted configured locale; it cannot reintroduce an
  excluded locale. With no acceptable match, use the configured default so the
  application can still render.
- Keep `getNearestLocale(preferences)` and its default-locale fallback available
  to existing Vue consumers.

Reference: [RFC 9110, Accept-Language and quality values](https://www.rfc-editor.org/rfc/rfc9110.html#section-12.5.4).

## C4 — cookie, hydration, and routing consistency

Initial selection order is:

1. Valid existing Nuxt locale state, including the SSR payload during hydration.
2. Valid locale cookie.
3. Accept-Language on the server, or navigator preferences in a client-only app.
4. First configured locale.

An application's later explicit locale change, including route middleware, takes
precedence over this initialization. The module does not infer locales from URLs
or take ownership of routing.

- Keep the cookie named `locale`, with root path and the existing strict SameSite
  behavior. Use one consistent cookie option definition for reads and writes.
- Set Secure for HTTPS and allow the preference cookie on HTTP development or
  local production previews. Use Nuxt's effective request URL on the server and
  the browser URL on the client; cover HTTPS forwarded by the deployment proxy.
- Reuse the server payload during hydration even when navigator preferences
  disagree. Do not redetect the language during hydration.
- Coordinate requested locale state, active runtime state, and persistence through
  a single controller per Nuxt application. Repeated `useLocale()` calls must not
  create extra watchers.
- Observe state changes promptly, activate already-loaded languages synchronously,
  and write only the latest successful selection to the cookie.
- Await the latest locale selection after route middleware and before committing
  navigation/rendering. Use the router's resolution stage where available; cover
  initial SSR navigation, client navigation, redirects, and startup without pages
  in integration tests. Register runtime context before middleware/composables
  need it. The exact hook wiring must satisfy these observable tests on the
  supported Nuxt versions, rather than relying on a fire-and-forget watcher.
- Stop application-owned watchers and unregister router callbacks on disposal.
  Invalid later state assignments retain the last supported selection and report
  a useful error; they cannot become an active unsupported locale.

Reference: [Nuxt SSR state management](https://nuxt.com/docs/getting-started/state-management/).

## C5 — safe browser detection

- Access navigator and storage defensively. A throwing storage getter or
  `getItem` must not prevent preference detection.
- Use a supported stored locale when present; otherwise try `navigator.languages`,
  then `navigator.language`, then the configured default.
- Return the configured default when no browser APIs are available. This aligns
  with the declared string return type and avoids passing null to locale loading.
- Reuse supported-locale matching from C3. Do not add a new persistence mechanism
  to standalone Vue applications.

## Scope and compatibility

Expected source areas: `_eTr.js`, the Nuxt runtime plugin and composables, small
internal locale/controller helpers, relevant declarations, and README runtime
documentation. Add test fixtures and tests under the existing `test/` structure.

No new product dependency or public configuration option is planned. Preserve
Vue 2/3 entry points, existing compiler behavior, `.locale` format, translation
IDs, filters, pluralization, and translation text. Keep singleton behavior for
the standalone default Vue plugin; adding a public multi-app Vue API is outside
this batch. An existing explicit locale argument to a Nuxt composable must remain
request-local and must not change that request's selected language.

Changing `loadLocale` from logging and resolving to rejecting on failure is
intentional: awaited callers must be able to detect a failed load. Document this
behavior and retain catch handling in void/background paths. Version selection,
merge, and tagging are part of delivery after validation, not prerequisites for
implementation. Do not publish to npm from this batch's implementation session.

Out of scope: locale-file sorting or purging changes, automatic translation
providers, major dependency upgrades, route generation, HTTP page-cache policy,
new logging flags, and unrelated website edits. The user's uncommitted website
menu work and existing test files must remain untouched.

## Verification and acceptance

Use TDD for each reproduced defect: observe a failing assertion before changing
its implementation. Force concurrency with promises/barriers, not random timing
or arbitrary sleeps.

1. Render two independent Vue SSR applications with interleaved English/French
   setup and suspended rendering. Verify plain translations, computed values,
   injected components, and translated directive attributes in both results.
2. Run concurrent locale loads with delayed additional imports. Every successful
   caller receives the complete merged dictionary. Verify deduplication,
   precedence, import failure, retry, empty dictionaries, missing assets, and HMR.
3. Complete language changes in reverse order; the most recent request wins.
   Exercise both successful changes and a failed latest change.
4. Test valid/invalid cookies and state, mixed-case and three-letter languages,
   whitespace, weights, equal weights, exclusions, wildcards, unsupported values,
   and default fallback.
5. Test blocked/absent storage, absent navigator, navigator.language fallback,
   and valid stored preferences.
6. Run a small production-built Nuxt fixture with locale middleware and both
   inline and external dictionaries. Issue concurrent EN/FR HTTP requests;
   verify HTML, payload, cookie attributes, and route-selected locale. Verify
   SSR hydration with conflicting browser preferences and client navigation.
7. Verify Nuxt 3 and Nuxt 4 compatibility using available versions in isolated
   fixtures or the website, keeping normal supported projects on their existing
   dependencies. Run lint, the complete test/type suite, build, and package dry
   run. Preserve the existing CI Node 18/20/22 coverage.
8. Validate a packed candidate with a real production build of the neighboring
   website. Compare locale IDs/text/order and check that no executable static
   translation placeholder remains. Runtime bundle differences are expected
   because this batch changes runtime code; identical bundles are not a criterion.
   Exercise EN/FR requests and navigation. Snapshot and restore dependencies,
   locale files, build artifacts, and tracked/untracked user work before finishing.

## Review checkpoints

This specification follows the approved C1–C5 scope. The user reviews the written
specification before the implementation plan is created. The implementation plan
then receives its own review and execution-method selection, as required by the
Superpowers architectural workflow. Product code remains unchanged until those
checkpoints are complete.
