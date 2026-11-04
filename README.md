# Wheel Rush

A one-button pixel arcade for the Squeekchain community. Help Squeektoshi gather sunflower seeds, hop over spikes and mine game blocks inside a front-facing spinning wheel.

**The finished static site is in `dist/`.** Source, package lockfile, original art, local font and validation documentation are included. Static hosting serves that directory directly; it does not need a backend or a rebuild.

## Run locally

Use Node.js 22.18+ and npm.

```sh
npm ci
npm run dev
```

For the production export:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Vite prints the preview address. `vite.config.ts` sets `base: './'`; the export uses relative script, stylesheet, font, favicon and social-image paths. It works under a static-hosting subpath. Serve over HTTP(S), rather than opening the HTML with `file://`. No runtime CDN is used. All gameplay assets and the font are local; the only automatic external request is the public Squeekchain status API.

## Play

- Select **Start run**, or press Space when the page/game control has focus.
- Space, a click on the wheel, or a tap on **Jump** makes Squeektoshi jump. A quick tap clears a single spike; holding gives a higher jump. Release before jumping again.
- Collect 12 sunflower seeds to mine a game block and increase the speed. Later blocks add elevated seeds and wider spike patterns. Speed is capped to keep the game playable.
- A streak builds up to a 5× seed-score combo. Miss a seed or hit a spike and the combo resets. Three spike hits end a run; a hit grants a short invulnerability period.
- **P**, **Escape**, or the pause control pauses/resumes. The game pauses when the window loses focus or the tab is hidden. Opening Help pauses play.
- Sound starts muted. The speaker button enables locally synthesized arcade effects. 中文 / EN switches all game copy between English and Simplified Chinese.
- **Share on X** opens the requested X post intent with the current score, game blocks and `@squeekchain`. It does not post automatically.

Best score and language are saved in localStorage (`wheel-rush-best-v1`, `wheel-rush-lang`). Scores belong to this browser, not a shared leaderboard. When storage is blocked, the game keeps a session-only best and says so.

## How Squeekchain is used

The client makes a credential-free, read-only `GET https://api.squeekchain.com/v1/status` immediately on load, then every **20 seconds**. Each request has an 8-second timeout. No key, wallet, account, relay, transaction, analytics or backend is involved.

| API field | Display / effect |
| --- | --- |
| `measurement.coreStatus` | Real wheel state: Spinning or Idle |
| `measurement.rpmMilli` | Divided by 1000 and displayed as RPM, with up to three decimals |
| `builder.anchor.blockHeight` | Confirmed anchored block, preserved as a string and formatted with BigInt |
| Fresh `SPINNING` state | A small **1.1× cosmetic multiplier** on seed points |

The full telemetry HUD is beside the game on desktop. On phones, a compact strip inside the game shows state, RPM and anchored height as well. The real anchored height is separate from the run's game-block counter.

On a network error, HTTP error, invalid response, an explicit `unavailable` state, or stale/offline measurement, the game enters **Solo mode**, clears unknown telemetry to `—`, and removes the live bonus. It keeps polling automatically. Unavailable data is never converted to zero. A valid `IDLE` measurement with zero RPM is shown as zero. If only the anchor is missing, its value remains unknown.

**Game blocks and points are recreational milestones.** They do not mint tokens, send transactions, mine actual chain blocks or earn money. No official Squeekchain logos are included.

## Validation

Actual worker results, fixes and unperformed checks are recorded in [artifacts/validation.md](artifacts/validation.md), [artifacts/browser-checks.json](artifacts/browser-checks.json), and [artifacts/design-probe.json](artifacts/design-probe.json). [DESIGN.md](DESIGN.md) documents the final tokens and components. Screenshots are in `artifacts/screenshots/`.

The production build and typecheck ran successfully. Seven engine/status tests, 14 browser checks, and all 16 pinned design checks passed. Chromium validation checks the production export under `/preview/`, including keyboard/touch play, score persistence, block progression, lives, pause, help focus, locale switching, sound toggling, polling/error recovery, reduced motion, text enlargement and automated accessibility. The pinned design probe was run and its final results are retained.

The API returned HTTP 200 with `Access-Control-Allow-Origin: *` via curl; the timestamped, minimal real response evidence is in [artifacts/api-check.json](artifacts/api-check.json). Direct requests from the local Chromium session failed with `net::ERR_EMPTY_RESPONSE`; its screenshots honestly show the solo fallback. Live state formatting and recovery were checked with explicitly labeled intercepted test fixtures, which never ship as gameplay data. The `chinese-fixture.png` and `keyboard-focus-fixture.png` screenshots use those test values; `mobile.png`, `desktop.png` and `running.png` use the actual endpoint transport and show solo mode. WebKit could not launch because its required runtime libraries are unavailable. Safari, physical devices, native browser zoom, screen readers and audible sound quality remain unverified. No telemetry or test result was fabricated.

To rerun the optional browser validation without adding tooling to the delivered app:

```sh
npm install --prefix test/scratch/tooling playwright@1.61.1 @axe-core/playwright@4.14.0
node test/scratch/tooling/node_modules/playwright/cli.js install chromium --only-shell
npm run build
npm run check:browser
```

The script manages and closes its own local preview and browser. It uses API fixtures for deterministic state tests, then uses the real endpoint for the screenshots. WebKit is attempted if installed; a missing runtime is recorded as a limitation. The seven unit tests need only the normal repository dependencies.

The pinned design probe, when the assignment inputs are available:

```sh
IMD_PLAYWRIGHT="$PWD/test/scratch/tooling/node_modules/playwright/index.mjs" node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

The original share-card drawing is `public/share-card.svg`. With optional Playwright installed, `npm run share:render` regenerates its 1200×630 PNG; rebuild afterward. The PNG is already included in both `public/` and `dist/`.

## Submission and licensing

This repository is ready to push to GitHub. No remote repository or hosted deployment is created by the local build. Publish the included `dist/` through your static host or the contributor network.

The `.gitignore` has an explicit **0-byte submission budget** for `/node_modules/`, `/test/scratch/`, `/.cache/` and generated `*.tsbuildinfo` files. These are dependency, validation or browser caches; none is part of the deliverable. `dist/`, the source, package manifests/lockfile, required runtime assets and documentation stay included. There are no vendored package archives or submodules. The submission-size check is documented in validation.

Original code/art is MIT. Local font and adapted guidance notices are in [NOTICE.md](NOTICE.md). No credentials or requester-only configuration are needed. The remaining gaps are the browser/runtime verification limitations above; nothing was fabricated to fill them.
