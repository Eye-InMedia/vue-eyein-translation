# Batch C Runtime and SSR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate Nuxt request languages and make locale detection, loading, cookies, hydration, and navigation reliable without changing translation files or existing method signatures.

**Architecture:** Keep configuration and complete dictionaries shared, but create an independent runtime for each Nuxt application. A single application controller coordinates requested locale state, active runtime state, loading completion, and cookie persistence. The existing default runtime remains available to standalone Vue 2/3 consumers.

**Tech Stack:** JavaScript ES modules, Vue reactivity and SSR renderer, Nuxt 3/4 application context, Vite, Vitest, existing TypeScript declaration checks, and the T3 collaborative browser for hydration checks.

**Spec:** [2026-10-05-batch-c-runtime-ssr-design.md](../specs/2026-10-05-batch-c-runtime-ssr-design.md)

## Global Constraints

- Baseline: 6.3.1, commit `46f7b0f`; implementation branch: `fix/batch-c`.
- No new product dependency or public configuration option is planned.
- Preserve Vue 2/3 entry points, existing compiler behavior, `.locale` format, translation IDs, filters, pluralization, and translation text.
- Preserve `useState('locale')`, `useLocale(): Ref<string>`, and `setLocale(locale): void`.
- Keep singleton behavior for the standalone default Vue plugin.
- Keep runtime instances and promises out of the serialized Nuxt payload.
- Publishing remains the user's task; do not publish to npm during execution.
- The user's uncommitted website menu work and existing test files must remain untouched.
- Preserve the existing CI Node 18/20/22 coverage; introduce no runtime API newer than the declared Node >=16 baseline.
- Use deterministic barriers for races and record each failing assertion before its fix.
- Commit each independently testable correction without a Co-Authored-By trailer.

## Review Focus

- A regional zero-weight range must not be reintroduced through a broader or wildcard preference; Task 1 pins specificity.
- A dictionary directory with the same prefix must not contribute unrelated translations; Task 2 pins directory boundaries.
- An old load failing after a newer successful selection must not roll back that selection or its cookie; Tasks 3 and 4 pin this ordering.
- A redirect or page-less Nuxt startup must settle language selection without assuming a page component exists; Tasks 5 and 6 cover both.
- Prototype-like translation IDs must not confuse loaded/pending bookkeeping; Task 2 covers these IDs and complete publication.

## File structure

| File | Responsibility |
|---|---|
| `src/runtime/js/localeSelection.js` (new) | Supported-tag matching, HTTP negotiation, defensive browser detection. |
| `src/runtime/js/localeLoader.js` (new) | Shared pending loads and atomic publication of complete dictionaries. |
| `src/runtime/js/translationRuntime.js` (new) | Existing translation methods bound to an instance's locale and change revision. |
| `src/runtime/js/_eTr.js` | Preserve Vite replacement markers and HMR; assemble the shared catalog, internal factory, and default instance. |
| `src/runtime/js/localeController.js` (new) | Coordinate one app's requested state, runtime changes, readiness, rollback, and disposal. |
| `src/runtime/composables/useLocale.js` | Initialize validated SSR-safe state using cookie/preferences without duplicate watchers. |
| `src/runtime/js/runtimeContext.js` (new) | Resolve the Nuxt application's runtime and shared cookie options. Keep this helper outside the auto-imported composables directory. |
| `src/runtime/composables/tr.js`, `trComputed.js` | Use the current Nuxt runtime, retaining it in computed callbacks. |
| `src/runtime/plugin.js` | Create/provide the runtime and controller, install Vue plugin, await navigation and startup, register cleanup. |
| `types/eTr.d.ts`, `types/module.d.ts`, `test/types/usage.ts` | Preserve public signatures and describe Nuxt's internal injected runtime. |
| `test/localeSelection.test.js`, `localeLoader.test.js`, `translationRuntime.test.js`, `localeController.test.js`, `nuxtRuntime.test.js` (new) | Focused unit/SSR/context regression checks. |
| `test/helpers/nuxtApp.js` (new), `vitest.config.js` | Test-only `#app` alias with controllable application/state/cookie context. |
| `test/runtimeNuxt.test.js`, `test/fixtures/runtime-ssr/**`, `test/helpers/runtimeNuxt.js` (new) | Real production-built Nuxt fixture and HTTP verification. |
| `README.md`, `docs/batch-c-validation.md` (new) | Runtime guarantees, intentional error behavior, and recorded verification. |

## Task 1: Supported locale selection and safe browser detection (C3, C5)

**Files:** Create `src/runtime/js/localeSelection.js`, `test/localeSelection.test.js`; modify `_eTr.js`'s existing detection methods.

**Interfaces:**
- `matchSupportedLocale(preference: unknown, locales: string[]): string | null` returns configured spelling without a default fallback.
- `nearestLocale(preferences: unknown, locales: string[]): string` tries an ordered array and otherwise returns `locales[0]`.
- `negotiateAcceptLanguage(header: unknown, locales: string[]): string` resolves validated HTTP ranges and quality values.
- `detectBrowserLocale(locales: string[], environment = globalThis): string` safely reads storage and navigator.

- [ ] **Step 1: Add the failing matching/browser tests.** First exercise the baseline `_eTr` methods with controlled configuration or a temporary transformed module, so failures demonstrate actual defects rather than only missing new exports. Include these assertions in the final helper suite:

```js
const locales = ['en-US', 'fi-FI', 'fil-PH', 'fr-CA'];
expect(matchSupportedLocale('FR-CA', locales)).toBe('fr-CA');
expect(matchSupportedLocale('fil', locales)).toBe('fil-PH');
expect(matchSupportedLocale('xx-invalid', locales)).toBeNull();
expect(nearestLocale([null, '', 'xx', 'fr'], locales)).toBe('fr-CA');
expect(detectBrowserLocale(locales, blockedStorageWithFrenchNavigator)).toBe('fr-CA');
expect(detectBrowserLocale(locales, {})).toBe('en-US');
```

Use object getters that throw for storage/navigator access; also cover throwing `getItem`, invalid stored preferences, empty `languages`, `navigator.language`, and valid stored preferences.
- [ ] **Step 2: Run `npx vitest run test/localeSelection.test.js` and record incorrect case/three-letter matches and the uncaught storage error.**
- [ ] **Step 3: Implement the matching/browser helpers and delegate existing runtime methods to them.** Trim valid tags, match case-insensitively, and compare complete base subtags. Reject malformed/non-string input without stringifying it. Do not add browser persistence.
- [ ] **Step 4: Add and run failing HTTP negotiation cases.** Assert `fr-CA;q=0.1,en-US;q=1` -> `en-US`; equal weights retain order; whitespace is harmless; malformed weights/ranges are ignored; `fr;q=0,en;q=0.8` -> `en-US`; `en;q=0,*;q=1` chooses a non-English locale; `en-US;q=0,en;q=1` with `['en-US','en-GB','fr-CA']` -> `en-GB`; `*;q=0,fr-CA;q=1` -> `fr-CA`; no acceptable match -> default. Validate q syntax/range and resolve each configured tag's most specific applicable range before applying quality/order.
- [ ] **Step 5: Implement negotiation and run the focused suite plus `npm test` and `npm run lint`.** Expect all assertions and existing tests/type checks to pass.
- [ ] **Step 6: Commit only this task's files:** `fix: validate locale preferences and tolerate blocked browser storage`.

## Task 2: Shared complete dictionary loading (C2)

**Files:** Create `src/runtime/js/localeLoader.js`, `test/localeLoader.test.js`; modify `_eTr.js`'s loading and HMR assembly as necessary.

**Interfaces:**
- `createLocaleLoader({locales, translations, localeFilesPromises, assetsDir, additionalLocalesDirs}): (locale: string) => Promise<void>`.
- `translations` remains the shared Vue reactive dictionary map; eager HMR entries count as complete. Production entries are assigned only after all imports resolve.
- Loader bookkeeping is internal and cannot be confused with dictionary IDs.

- [ ] **Step 1: Add the baseline regression with two import barriers.** Start a French load, resolve the first import, then start a second French load while the additional import remains blocked. Assert the second load has not completed and `translations['fr-CA']` is unpublished; release the barrier and assert both callers see `{first:'Bonjour', second:'Au revoir'}`. Use the current loader via a temporary transformed module for the initial failing assertion, then the extracted helper for focused tests.
- [ ] **Step 2: Run `npx vitest run test/localeLoader.test.js`.** Expect baseline early resolution/partial publication to fail the assertions.
- [ ] **Step 3: Extract and implement the loader.** Use pending entries keyed by locale, temporary merged dictionaries, exact basename/directory matching, and cleanup on rejection. Main dictionaries override additional dictionaries; main/additional paths and iteration retain current valid behavior. Explicit `loadLocale` rejects on errors.
- [ ] **Step 4: Add failing assertions for deduplication, retry, precedence, empty dictionaries, missing assets, and boundaries.** One import invocation serves two callers. Rejecting a later import publishes nothing and permits retry. `/assets-other/locales/fr-CA.locale` and `not-fr-CA.locale` never load. An eager HMR dictionary remains accessible without a production import. IDs `constructor` and `__proto__` cannot affect the pending map or publication checks. Use JSON-parsed fixtures for own `__proto__` entries.
- [ ] **Step 5: Complete the implementation and run `npx vitest run test/localeLoader.test.js test/localeSelection.test.js`, then `npm test` and `npm run lint`.** Expect complete dictionaries for every successful caller and no unhandled rejections.
- [ ] **Step 6: Commit:** `fix: publish locale dictionaries only after complete shared loads`.

## Task 3: Per-instance translation runtime and ordered changes (C1, C2)

**Files:** Create `translationRuntime.js`, `test/translationRuntime.test.js`; modify `_eTr.js`; extend `test/vue2.test.js`; add `test/vue3.test.js` if needed; modify `types/eTr.d.ts` and type usage only where necessary.

**Interfaces:**
- Catalog: `{locales: string[], translations: ReactiveDictionary, loadLocale: (locale: string) => Promise<void>}` from Task 2.
- `createTranslationRuntime(catalog, initialLocale = null)` in `translationRuntime.js` returns the existing `ETr` methods plus internal `changeLocale(locale: string): Promise<void>`.
- `_eTr.js` imports the lower-level factory as `createRuntime`, exports internal `createTranslationRuntime(initialLocale = null)` assembled with its shared catalog, and keeps its default standalone runtime export.
- `changeLocale` activates a loaded locale synchronously, otherwise awaits loading and commits only if its revision is still current. Public `setLocale` remains void and catches/reports background rejection.
- `trComputed(value, data = null, locale = null)` may honor an explicit override without mutating the runtime's selected locale; existing two-argument calls are unchanged.

- [ ] **Step 1: Add a two-application SSR failure using the actual baseline runtime.** Suspend English setup with a barrier, initialize/render French, then release English and expect its translation to remain `Hello`. Repeat with computed translation, injected translation component, and translated directive attribute. Assert method references remain bound when destructured.
- [ ] **Step 2: Run `npx vitest run test/translationRuntime.test.js`; record cross-request French output where English is expected.**
- [ ] **Step 3: Move existing translation behavior into the factory with instance-local refs.** Preserve Vite markers and HMR in `_eTr.js`; keep the shared catalog/load function outside instances. Ensure methods and computed callbacks close over their owner instead of the default export. Install separate runtimes using the existing Vue 3 `_eTr` override; retain standalone singleton behavior.
- [ ] **Step 4: Add and observe failing revision tests.** Start French then Filipino changes, complete Filipino first and French later, and assert active `fil-PH`. Fail an older pending change after a newer English success and assert English is retained. Verify unsupported selection cannot activate and void `setLocale` handles background failure. Verify explicit override leaves active state unchanged.
- [ ] **Step 5: Implement revision/error handling and run focused tests, the existing translation/filter/pluralization suites, `npm test`, and `npm run lint`.** Verify Vue 2 prototype methods and Vue 3 provides/directives all receive the specified runtime, and existing declaration signatures still compile.
- [ ] **Step 6: Commit:** `fix: isolate translation runtime state and order locale changes`.

## Task 4: One locale controller per application (C4)

**Files:** Create `localeController.js`, `test/localeController.test.js`; modify `useLocale.js`; create `runtimeContext.js`, `test/nuxtRuntime.test.js`, and `test/helpers/nuxtApp.js` for initialization/cookie options; add the test-only `#app` alias in `vitest.config.js`.

**Interfaces:**
- `createLocaleController({localeState, localeCookie, runtime, onError}): {ready(): Promise<void>, dispose(): void}` consumes Task 3's runtime and Vue refs.
- `ready()` awaits the latest selection; a newer selection during its wait is also settled before it resolves. Navigation/startup failures reject even when a background error observer handles the same failure.
- `localeCookieOptions(url: URL): {path: '/', sameSite: 'strict', secure: boolean}` is a named internal export from `runtimeContext.js`.
- `useLocale()` initializes `useState('locale')` through Task 1's helpers, using valid state -> valid cookie -> environment preferences -> default, and returns the same ref every call. Controller creation remains the plugin's responsibility.

- [ ] **Step 1: Add failing initialization/cookie cases against current `useLocale` with a Vitest `#app` alias/mock.** Assert invalid cookie plus a French preference selects French; weighted preferences select English; a valid SSR payload beats navigator/cookie disagreement; repeated calls return the same ref. Assert HTTP cookies are writable, HTTPS and forwarded-HTTPS options are Secure, path is `/`, and SameSite remains strict. Keep mocks test-only and avoid replacing production import syntax in these tests.
- [ ] **Step 2: Run `npx vitest run test/nuxtRuntime.test.js test/localeController.test.js`; record the baseline selection/persistence failures.**
- [ ] **Step 3: Implement initialization and the controller.** Register one synchronous state watcher per controller; normalize supported spellings; activate loaded selections promptly. Persist only successful current selections. Track latest requested work without placing promises in state. Background failure reports once and restores the last supported state/cookie only if still current. `ready()` separately propagates awaited failure.
- [ ] **Step 4: Add failing controller assertions for reverse completion, late rejection, invalid assignments, and disposal.** After French succeeds, an obsolete English failure cannot change French/state/cookie. The latest failed switch rejects `ready()` and retains the previous working language. Invalid values cannot activate. `dispose()` stops observation; repeated `useLocale` does not multiply calls. Verify state changes arriving while `ready()` is pending are included.
- [ ] **Step 5: Complete the controller and run its suite, the Nuxt context suite, `npm test`, and `npm run lint`.** Expect no duplicate watchers, no unhandled rejection, and payload-compatible string-only state.
- [ ] **Step 6: Commit:** `fix: synchronize locale state and cookies through one app controller`.

## Task 5: Nuxt runtime wiring and navigation readiness (C1, C4)

**Files:** Modify `src/runtime/plugin.js`, `runtimeContext.js`, `tr.js`, `trComputed.js`, `types/module.d.ts`, and `test/nuxtRuntime.test.js`; add a browser adapter cleanup test if needed.

**Interfaces:**
- Nuxt plugin provides `{eyeinTranslation: runtime}` so `nuxtApp.$eyeinTranslation` resolves the request's Task 3 runtime.
- `getNuxtTranslationRuntime(): ETr` in `runtimeContext.js` resolves it through `useNuxtApp()`, with a useful initialization error instead of server singleton fallback.
- Nuxt `tr(value, data = null, locale = null): string` and `trComputed(value, data = null, locale = null): ComputedRef<string>` resolve the runtime at call time, then retain it in later computation.
- Router resolution guards await Task 4's `controller.ready()` after application middleware; startup without a router awaits readiness at the app-created stage. Store disposer functions in the plugin closure.

- [ ] **Step 1: Add and run failing tests with two independent mocked Nuxt app contexts.** The contexts must produce different `tr` and computed results even after control switches to another context. Installed Vue `_eTr`, Nuxt `$eyeinTranslation`, and composable runtime must be the same object. Assert use before installation fails visibly.
- [ ] **Step 2: Implement plugin/provider/composable wiring.** Create and publish context synchronously before awaited initialization, install Vue with the override, await initial loading, and construct one controller. Keep composables out of callbacks that run after Nuxt context is lost. Use the canonical effective request URL for cookie options, including forwarded HTTPS.
- [ ] **Step 3: Add failing lifecycle assertions.** A before-resolve callback waits for middleware-selected French after an English initial preference. No-router startup still waits. Redirect-triggered newer work wins. SSR render completion stops controller observation; client unmount unregisters guards and stops watchers. Use `vueApp.onUnmount` where available and a root-only lifecycle fallback for older Vue 3 versions.
- [ ] **Step 4: Implement guards/cleanup and run `npx vitest run test/nuxtRuntime.test.js test/localeController.test.js test/translationRuntime.test.js`.** Verify guard failure rejects through normal Nuxt handling. Do not assume all Nuxt apps have pages or a router.
- [ ] **Step 5: Extend declarations and run `npm test`, `npm run lint`, and `npm run build`.** Type checks must preserve `setLocale: void`, `loadLocale: Promise<void>`, existing entry points, and computed return types. Avoid introducing a public runtime-factory export in package.json.
- [ ] **Step 6: Commit:** `fix: use request-local translations throughout Nuxt navigation`.

## Task 6: Production Nuxt SSR, hydration, and HMR integration

**Files:** Create `test/runtimeNuxt.test.js`, `test/helpers/runtimeNuxt.js`, `test/fixtures/runtime-ssr/nuxt.config.js`, `app.vue`, `pages/[lang].vue`, `middleware/locale.global.js`, `plugins/browser-preference.client.js`, `server/api/gate.get.js`, and `server/utils/renderGate.js`. Modify `vitest.config.js` only for this suite's isolation/timeouts.

**Interfaces:**
- `startRuntimeNuxtFixture({pages = true} = {}): Promise<{url: string, close(): Promise<void>, controlGate(action: 'wait' | 'release'): Promise<void>}>` creates its own temporary root/assets, builds Nuxt using the local module, and starts a private-port Nitro child process.
- Generate `.locale` fixture files in that temporary root, not user assets. Use the existing Nuxt/test-utils dependencies and Node APIs; no new product or browser dependency.
- Fixture page exposes visible inline/external/computed translations, a translated attribute, and a link switching between `/en` and `/fr`. Middleware selects locale from the route; it deliberately conflicts with incoming preferences in tests.

- [ ] **Step 1: Write the real HTTP assertions before any integration repair.** Hold an English render on the fixture-only barrier, complete a French request, release English, and assert English HTML/payload still contains `Hello`/`en-US`, while French contains `Bonjour`/`fr-CA`. Assert external dictionary entries and translated attributes match too. Test invalid cookies and conflicting headers with route middleware.
- [ ] **Step 2: Run `npx vitest run test/runtimeNuxt.test.js`.** Any failure must be diagnosed at the context/loading/router boundary; preserve a failing assertion before changing hook wiring. A first-pass success is valid integration evidence, not evidence of a new failing-first fix.
- [ ] **Step 3: Add real redirect and no-pages startup checks; fix only demonstrated integration gaps.** Assert final redirect locale, no-pages rendering without router errors, HTTP/forwarded-HTTPS cookie flags, and string-only payload state. Ensure child processes/temp roots are closed on failure as well as success.
- [ ] **Step 4: Verify HMR using the actual Vite dev transform.** Warm two runtimes, update an eager dictionary through its accepted module callback, and assert both observe new text while retaining different active locales. Check main/additional dictionary behavior against Task 2's precedence.
- [ ] **Step 5: Run the complete suite and inspect hydration with T3.** First call preview_status and open the fixture if needed. The fixture-only pre-enforced client plugin reads a `browserLocale` query parameter and overrides navigator preferences before the translation plugin starts; verify the override from the browser. Navigate to `/fr?browserLocale=en-US`, verify SSR-selected French text remains through hydration, navigate EN/FR, and check for hydration errors. Save a screenshot/diagnostic summary. Browser verification is a release check; do not claim it ran in CI.
- [ ] **Step 6: Validate a real Nuxt 4 core in a separate temporary installation using a compatible available Node runtime.** Pin the tested version in the validation record. Do not treat the website's Nuxt 3 + kit 4 as proof of Nuxt 4 support, and do not upgrade either working repository for this check. Run the same SSR/navigation acceptance checks available in that fixture. Preserve normal Node 18/20/22 CI checks for the root project.
- [ ] **Step 7: Commit the fixture and any observed integration fixes:** `test: cover concurrent Nuxt SSR and locale navigation`.

## Task 7: Package and website validation, documentation, and delivery

**Files:** Modify `README.md`; create `docs/batch-c-validation.md`; change package version/lock only after compatibility and release scope are established.

- [ ] **Step 1: Update README with tested behavior.** Document request isolation, initialization priority, route-middleware precedence, `loadLocale` rejection, void/background error handling, and HTTP/HTTPS cookie behavior. Do not promise page-cache isolation or new routing support.
- [ ] **Step 2: Run `npm run lint`, `npm test`, `npm run build`, and `npm publish --dry-run`.** Expect exit 0 throughout and fresh dist/types in the package. Run the available Node 18/20/22 checks or record a missing local runtime and verify through CI when pushed.
- [ ] **Step 3: Capture the neighboring website's current state before candidate validation.** Record git status and hashes of dependency manifests and locale files. Use an isolated site copy or snapshot dependencies and generated artifacts before a temporary install. Preserve the existing dev server and user edits, including untracked files. Use normal npm dependency resolution for the packed candidate rather than hand-unpacking it into a stale dependency graph.
- [ ] **Step 4: Run a real site production build and private-port production server.** Expect build success, no executable `staticTr`/`staticTrComputed` call or throwing placeholder, and no locale ID/text/order changes. Runtime bundle changes are expected. Check `/`, `/fr`, `/contact`, `/fr/contactez-nous`, and the video-wall routes in both languages with interleaved requests and client navigation. Compare route language, rendered text, cookie, and hydration diagnostics rather than requiring byte-identical bundles.
- [ ] **Step 5: Restore the website and prove restoration.** Compare original/current user work, manifest/lock hashes, locale hashes, dependencies, and generated-artifact snapshots. Stop only fixture/candidate processes started by this batch. Record results, tested Nuxt/Node versions, failing-first observations, and any limits in `docs/batch-c-validation.md`.
- [ ] **Step 6: Review the whole branch using the chosen execution workflow.** Address findings with regression evidence and rerun only affected checks plus required final gates. Commit documentation as `docs: record batch C runtime guarantees and validation`.
- [ ] **Step 7: Finish delivery after final review.** A patch candidate `6.3.2` is appropriate only if the completed work retains this approved internal/API scope; otherwise explain the release impact before bumping. Update version/lock, rebuild/package-check, commit, merge into dev and master under the continuing delivery authorization, push branches/tag, and verify CI. If delivery authorization is superseded, leave the tested branch ready for review. Never run an actual npm publish; provide the user's release command after delivery.

## Execution handoff

The written specification is approved. This plan is pending user review and
execution-method selection. Native execution is recommended because catalog,
runtime, controller, and Nuxt wiring have closely coupled interfaces. Implement
the tasks sequentially in this session, then obtain one independent whole-branch
review. Alternatively, choose subagent-driven execution with an implementer and
reviewer for each task. Do not start product code before that choice and review.
