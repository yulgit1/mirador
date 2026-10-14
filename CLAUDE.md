# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Mirador is an embeddable IIIF (Presentation API v2/v3) image/AV viewer built with React, Redux, redux-saga, MUI, and OpenSeadragon. It is published to npm as an ES module and as a UMD bundle (`dist/mirador.min.js`).

## Commands

- `npm start` — Vite dev server at http://127.0.0.1:4444/. Each page in `demo/*.html` is a separate demo (e.g. `/demo/plugin-add.html`).
- `npm run build` — builds both the ES build (`vite.config.js`) and the UMD build (`vite-umd.config.js`).
- `npm run lint` — ESLint, plus two custom checks:
  - `lint:translations` (`scripts/i18n-lint.js`): every `src/locales/*/translation.json` must have keys sorted case-insensitively and match the keys in `en`.
  - `lint:containers` (`scripts/container-lint.js`): `withPlugins('Name')` in `src/containers/Name.js` must use the file's own name.
- `npm run format` / `npm run format:check` — Prettier.
- `npm run size` — size-limit budget on the gzipped UMD bundle (`.size-limit.json`). Run a build first.
- `npm test` — what CI runs: build, lint, size, then `vitest run`.
- Run one test file: `npx vitest run __tests__/src/components/CanvasInfo.test.jsx`. Filter by test name with `-t "name"`.

CI tests on Node 22, 24, and 26.

## Testing notes

- Vitest with happy-dom and globals (`vitest.config.ts`, `setupTest.js`). Test order is **shuffled**, so tests must not depend on each other.
- The `@tests` alias points to `__tests__/`. Render components with `render` from `@tests/utils/test-utils`, which wraps them in the Redux store, i18n, and the MUI theme. Pass `preloadedState` to seed state.
- Unit tests in `__tests__/src/` mirror `src/` and use a mocked `fetch` (vitest-fetch-mock). Tests under `__tests__/integration/` use the **real network** and boot a full viewer.
- Configs in `__tests__/integration/mirador-configs/` are shared by the integration tests and the `demo/*.html` pages, so changing one affects the other.
- IIIF fixtures live in `__tests__/fixtures/version-2` and `version-3`.

## Architecture

**Entry point:** `Mirador.viewer(config, plugins)` (`src/init.js` → `src/lib/MiradorViewer.jsx`). It validates and filters plugins, builds the store with `createPluggableStore` (which merges the default config, the user config, and plugin reducers/sagas), then renders `App` into `config.id`. The `{ actions, store }` it returns is the public API for driving the viewer.

**State (`src/state/`):** Redux with normalized slices (windows, companionWindows, manifests, infoResponses, annotations, search, workspace, etc.).
- `actions/` are action creators; `action-types.js` holds the constants.
- `reducers/rootReducer.js` combines the core reducers with any plugin reducers.
- `sagas/` handle side effects: fetching manifests, info.json, annotations, and search results, IIIF auth flows, and window setup. Data fetching happens in sagas, not components.
- `selectors/` (reselect) are the only way components read state. Always read state through `miradorSlice()` (`selectors/utils.js`), because the host app can mount Mirador under a sub-key via `settings.state.slice`.

**Components vs. containers:** `src/components/*.jsx` are presentational components that get their data from props. Each matching `src/containers/*.js` connects one to the store with `connect(mapStateToProps, mapDispatchToProps)`, adds `withTranslation`/`withStyles` as needed, and makes `withPlugins('Name')` the **innermost** HOC. Import containers, not raw components, when composing UI. A new component usually needs both files, plus a test in `__tests__/src/components/`.

**Plugin system (`src/extend/`):** plugins are objects like `{ target, mode: 'wrap' | 'add', component, mapStateToProps, mapDispatchToProps, reducers, saga, config, companionWindowKey }`.
- `pluginValidation.js` rejects malformed plugins, and `pluginMapping.js` builds a map from each target to its `wrap`/`add` plugins. That map is provided through `PluginContext`.
- `withPlugins` applies `wrap` plugins, which receive `TargetComponent` and `targetProps`. `add` plugins render where a component places `<PluginHook targetName=... />` (or uses `usePlugins`).
- Plugins with `companionWindowKey` register new companion-window panels in `src/lib/CompanionWindowRegistry.js`.
- Changing a component's name, props, or `PluginHook` placement can break third-party plugins, because those are effectively public API.

**IIIF model (`src/lib/`):** `MiradorManifest`, `MiradorCanvas`, `CanvasWorld`, and the annotation classes wrap `manifesto.js` objects to give one interface over IIIF v2 and v3. OpenSeadragon rendering lives in the viewer components and in `OpenSeadragonCanvasOverlay` (annotation drawing).

**Config:** `src/config/settings.js` holds every default setting (theme, window defaults, panels, translations, etc.). User config is deep-merged over it. CSS class names are namespaced with `mirador-` via `src/config/css-ns.js`. Use `ns()` for classes, so styles don't leak into the host page.

**i18n:** strings live in `src/locales/<lang>/translation.json` (react-i18next). Add new keys to `en` and keep them sorted, or `lint:translations` fails. See `src/locales/README.md`.

## Conventions (from CONTRIBUTING.md)

- Airbnb style via ESLint. Functions get JSDoc comments, often just a minimal `/** */`.
- Target WCAG 2.1 AA accessibility.
- Use dependencies sparingly; size is enforced by size-limit. Never commit built output (`dist/`).
- AI policy: contributors must fully understand, vet, and own any AI-assisted contribution.
