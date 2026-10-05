# Batch B — 6.3.1 validation

The build-time transformer now parses static translation calls with `@babel/parser` and edits exact source ranges. Runtime APIs and locale IDs remain unchanged for existing supported calls.

## Changes

- Preserve nested argument expressions and nested translation calls; avoid overlapping `this.staticTr` / `staticTr` edits.
- Ignore comments, string contents, unrelated identifiers and unrelated methods.
- Handle multiline imports, existing/aliased/namespace `inject` imports and type-only imports.
- Process normal and setup script blocks independently, with per-block import placement.
- Parse template expressions, including Vue directive grammar and HTML entities; support Vue TypeScript language variants and decorators.
- Restrict translated attribute changes to the exact attribute in its opening tag; handle multiline and empty values.
- Exclude only the package's own translation component paths.

## Verification

- `npm run lint`, `npm test`, `npm run build`, and `npm publish --dry-run` passed.
- 68 tests passed on Node 18, 20, 22, and the local Node 26 installation; TypeScript declarations checked by `npm test`.
- Regressions were observed failing before fixes. An independent, read-only review identified six additional compatibility regressions; fourteen failing tests reproduced them before the final fix pass. Vue compiler checks verify the repaired template syntax.
- Golden comparison against git `76f688d` (6.3.0): 405 Vue files, including 184 files from the website's component submodule. 402 outputs were identical. The three changed files contain commented-out `staticTrComputed` calls, which are now preserved instead of transformed. No transform errors.
- Full production Nuxt builds compared 6.3.0 with the packed 6.3.1 candidate, using the website's Nuxt kit 4.2.2, node-html-parser 7.0.1, and the candidate's Babel parser 7.29.9.
- Both builds produced 587 public Nuxt assets. 580 are byte-identical. The remaining seven paths represent one CSS asset, two JS assets and their compression variants. They differ only in a scoped CSS identifier derived from the changed Amazon component source, and references to the resulting asset filenames. Normalizing those identifiers/references makes all three uncompressed assets identical.
- Locale IDs, sources, targets, and ordering are identical. Fourteen `used` counters per locale decrease because commented-out calls no longer count as uses; locale fingerprints change accordingly. No translation text is lost.
- AST inspection of the compiled output finds zero executable `staticTr`/`staticTrComputed` calls. The 32 remaining textual occurrences are comments; the throwing placeholder is absent.
- Production HTTP checks returned 200 for `/`, `/contact`, `/fr/contactez-nous`, `/alternatives`, `/wifi/technology`, `/amazon-signage-stick`, and `/fr/amazon-signage-stick`.
- Browser check: Contact page hydrated; client navigation to FR displayed “Contactez-nous”.

## Execution decisions

- Used the clean current checkout on the approved `fix/batch-b` branch instead of creating another worktree. The tradeoff is branch isolation rather than directory isolation; no existing plugin edits were present.
- Preserved setup injection for template calls to retain existing generated output. The tradeoff is retaining the prior injection instead of removing it as redundant.
- Skip parsing unrelated script dialects when no translation markers or setup injection require parsing. The website contains legacy JSX with custom directive syntax. Unsupported dialects containing actual translation calls may still require their own parser configuration.
- Kept dependency security auditing and preexisting binding collisions outside this parser regression batch. These were explicitly separated from new regressions during review; no claim is made that this release fixes them.

The website's installed package, locale files, `.nuxt`, and `.output` are restored after validation; its dependency upgrade remains a separate change.
