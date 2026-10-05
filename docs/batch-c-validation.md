# Batch C validation

Candidate branch: `fix/batch-c`, based on 6.3.1 (`46f7b0f`).
Validation date: 2026-10-05. Release target: 6.3.2.

## Changes and regression evidence

- Supported locale matching handles case, complete language subtags, invalid
  preferences, blocked browser storage, and weighted/excluded HTTP ranges.
  Seven assertions failed against the original runtime before the fixes.
- Dictionary imports are shared and published atomically. Four original-runtime
  failures reproduced premature completion, partial dictionaries, swallowed
  import failure, and incorrect/missing assets. Retry, exact directory boundaries,
  empty dictionaries and prototype-like translation IDs are covered.
- Each Nuxt application owns a runtime. Real Vue SSR reproduced cross-request
  contamination in translations, computed values, the injected component and a
  directive attribute. Revision tests reproduced reverse-completion and error
  handling failures. The standalone Vue 2/3 adapters retain their runtime bindings.
- One controller observes each application's state. Invalid cookies, weighted
  headers, HTTP cookie options, late failures, rollback, disposal and changes
  arriving during readiness waits are covered.
- Nuxt composables retain the application runtime. Cross-context contamination
  and a real Vue Router resolution preceding a delayed dictionary load failed
  before wiring/navigation corrections.
- The actual Vite dev transform and accepted HMR callback are exercised. An
  additional catalog update overwrote the main translation before the fix; a
  second regression pinned production's precedence among additional catalogs.
  Updates now rebuild complete dictionaries without changing active locales.

## Automated production integration

The test helper builds a separate Nuxt application and runs its Nitro server on a
private port. An explicit fixture-only HTTP barrier suspends English rendering,
allows French to finish, then releases English. Both retain their own inline,
external, computed, component and attribute translations. Route middleware beats
conflicting headers/cookies. Redirects, HTTP and forwarded-HTTPS cookies, locale
payload state and startup with `pages: false` are checked.

- Root dependency fixture: Nuxt **3.14.1592**, Nitro **2.10.4**.
- Separate normal npm installation: Nuxt **4.5.2**, Nitro **2.13.4**, Node
  **22.23.3**. The same three production HTTP tests pass; this is real Nuxt 4,
  rather than Nuxt 3 with kit 4.
- Full suite: **116 tests**, plus TypeScript declaration checks.
- Lint, full tests and module build checked with available Node 18.20.8,
  20.20.2 and 22.23.3 runtimes. CI continues to cover 18/20/22.
- Package validation includes a fresh module build and `npm publish --dry-run`;
  no actual npm publication is performed by the agent.

## Browser checks

T3's collaborative browser opened production Nuxt 3 and Nuxt 4 fixtures with
`/fr?browserLocale=en-US`. The fixture's pre-enforced client plugin confirmed
navigator preferences were English, while hydrated text, attributes and the
cookie stayed French. English/French link navigation changed text and cookie
without reloading (the same per-page token remained). Captured console warnings,
errors and unhandled rejections remained empty.

The snapshot operation repeatedly returned a T3 preview automation error; no
screenshot is claimed. Navigation, JavaScript inspection and interactions were
verified with the available T3 tools. Browser checks are manual release checks,
not CI assertions.

## Neighboring website

An isolated copy of `eye-in-website-nuxt` received the packed candidate through a
normal `npm install`. Its installed Nuxt **3.20.2**, Nitro **2.12.8** and Node
**22.23.3** production build succeeded. The original development server remained
running.

Interleaved HTTP requests with deliberately conflicting cookies/preferences
returned 200 and the correct route-language headings/cookies for:

- `/` and `/fr`;
- `/contact` and `/fr/contactez-nous`;
- `/digital-signage/videowalls` and
  `/fr/affichage-numerique/mur-ecrans-video`.

The candidate output contains no executable `staticTr`/`staticTrComputed` call or
Nuxt throwing auto-import placeholder. Source comments containing those names and
the Vue adapter's intentionally retained compile-time stub are not executable
uncompiled calls.

Both main catalogs retained every ID, source/target text and entry order (4,103
English and 4,102 French top-level entries, including metadata/groups). Shared
catalog files were byte-identical. Main files had existing usage-count and
fingerprint metadata refreshed by the site's current source; no translation text
or order changed.

The production browser rendered French video-wall text and runtime state, then
navigated to English with matching heading, cookie and runtime locale. Captured
navigation diagnostics were empty. Static pages were checked; the isolated
server's unrelated Mongo startup/configuration warnings limit checks of
DB-backed pages.

A before/after snapshot of **10,609** original website file hashes and git status
was identical, including source/untracked user work, manifests/lock, locale
files, dependency manifests and production output. The running dev server's
`.nuxt` scratch directory was excluded because that process owns it. All candidate
builds, installs and servers use owned scratch paths.

## Scope and known limits

Fixture catalogs are populated with the real translation compiler before Nuxt
consumes them. A newly discovered inline ID on a first-ever catalog generation
can otherwise be absent from the client catalog consumed before `buildEnd`, while
SSR sees the later saved file. This is a separate existing build-order issue;
these runtime checks model a project with generated catalogs, as does the real
website validation.

The work does not change page-cache policies, introduce route inference, or
publish runtime factories as package entry points. Nuxt applications sharing a
cached whole-page response still need an application-appropriate cache key.
