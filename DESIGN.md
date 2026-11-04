# Wheel Rush design system

## Overview

A compact community arcade for Squeekchain players on phones and desktops. An original pixel hamster in a sunflower-yellow, front-facing wheel carries the visual idea. Warm paper surrounds a sage game scene; berry accents mark the main action and game progress. The game precedes its field guide. This is an implemented community design, not an official brand system.

`src/main.tsx` owns the React interface, `src/game.ts` the game state and physics, `src/art.ts` the Canvas 2D artwork, and `src/style.css` the canonical tokens and component styles.

## Colors

Tokens are hexadecimal custom properties in `src/style.css:8`.

| Token | Value | Role |
| --- | --- | --- |
| `--page` | `#faf7ef` | Warm paper background |
| `--surface` | `#fffdf8` | Game shell, result/help panels, primary-button text |
| `--ink` | `#302f2b` | Main text and scores |
| `--muted` | `#686459` | Supporting text and telemetry labels |
| `--line` | `#dfdbd0` | Structural borders/dividers |
| `--accent` | `#ad3855` | Primary action, progress, display highlight |
| `--accent-hover` | `#932b45` | Primary-action hover |
| `--positive` | `#366448` | Verified spinning state and bonus |
| `--positive-soft` | `#e7eee2` | Spinning/active-bonus background |
| `--focus` | `#265d87` | Keyboard focus perimeter |
| `--game-bg` | `#e9ede3` | Canvas scene/stage |

`--accent-soft` (`#f5e3e5`) and `--gold` (`#eabb57`) are defined but currently unused by CSS components; they do not imply additional variants. The muted bonus surface is `#eeeae0`, inactive badge `#eeebe2`, and mobile telemetry strip `#f0eee5`. The separate artwork palette in `src/art.ts` uses brown/cream hamster pixels, gold treads and rose spikes.

Status uses words as well as color. Unknown readings use an absence marker or localized “Unavailable”, never a fabricated zero. There is one light theme. Actual contrast measurements and art-overlay limitations are recorded in `artifacts/validation.md` and `artifacts/design-probe.json`.

## Typography

`public/fonts/bricolage-latin.woff2` is a locally served Latin variable font, registered as `Bricolage` at weights 400–800 with `font-display: swap`. Used weights are **400, 600 and 800**. Chinese uses `PingFang SC`, `Microsoft YaHei`, then system sans-serif. Font synthesis is disabled; no italic style is requested. The OFL notice accompanies the asset.

| Token | Default size | Use |
| --- | --- | --- |
| `--s1` | 0.75rem / 12px | Captions, status, control hints |
| `--s2` | 0.875rem / 14px | Secondary labels, compact prose |
| `--s3` | 1rem / 16px | Primary action, intro, section heading |
| `--s4` | 1.25rem / 20px | Wordmark, compact scores, block message |
| `--s5` | 2rem / 32px | Scores, phone headline, result/dialog headings |
| `--s6` | 3.5rem / 56px | Desktop headline |

Headline line-height is 1.05 desktop / 1.08 phone, with −0.055em / −0.045em display tracking. Result/dialog headings use 1.1 and −0.035em. Body prose uses 1.5; narrow guide text uses 1.65. Small labels use natural tracking. Data uses tabular numbers and the same font. There is no monospace prose; `<kbd>` inherits the UI family.

One `h1` precedes `h2` guide/telemetry titles and `h3` guide items. Headings use balanced wrapping. Scores and block heights are not ellipsized.

## Layout

`.wrap` aligns header, intro, game and footer. Standard maximum width is 1264px with 40px inline padding; at 1440px and above it is 1344px with 48px padding. Spacing repeatedly uses 4, 8, 12, 16, 20, 24, 28, 32 and 40px, with small optical adjustments.

`.game-layout` has a flexible game column, 288px sidebar and 32px gap. At 1440px the sidebar is 296px and gap 40px. The HUD aligns score, combo, game blocks and hearts. Controls remain in document flow, inset inside the shell. Telemetry uses definition-list rows. There are no sticky controls over the game.

| Breakpoint | Implemented adaptation |
| --- | --- |
| ≤1100px | 28px outer padding, 256px sidebar, 24px gap; adjacent control hint hidden when crowded |
| ≤850px | One game column; telemetry and guide form two columns below |
| ≤600px | 20px outer padding, 72px header, 32px two-line headline, compact best score, 280px scene. Phone telemetry strip appears; full telemetry/guide stack below. Primary action and Share occupy one row, directions follow immediately. Secondary stage copy is hidden. |
| ≤359px | 14px outer padding, 260px scene, tighter HUD, 20px score figures |

Desktop scene height is 420px, or 456px at 1440px and above. The canvas backing store matches CSS dimensions at up to 2× device pixel ratio. Wheel radius is the smaller of 40.5% of scene width and height.

English and Chinese were checked at 320, 390, 768, 1024 and 1440px with no horizontal overflow. The 390×844 first screen includes product, telemetry strip and main action. Text enlargement to 200% was checked separately from native browser zoom. Physical-device and native-zoom checks remain unperformed.

## Elevation & Depth

Flat surfaces use one-pixel structural borders and tonal fills. There are no shadows, nested card stacks, gradient text or animated entrances. The paused/end overlay sits only inside the isolated stage, using a translucent sage scrim (`#e9ede3b8`) and paper result panel. The action row stays reachable below.

Help uses native `<dialog>` with a dark translucent backdrop (`#302f2b99`), browser-managed modal focus and scroll containment.

## Shapes

Game shell and help dialog use 16px radii; the phone game shell uses 12px. Result panels use 12px, primary buttons 9px, utilities/bonus/pause controls 8px and status labels 5px. The rounded progress track is 8px high. Pixel artwork keeps square edges inside the softer interface containers.

## Components

| Pattern / source | Behavior and reuse |
| --- | --- |
| `.brand`, `.utilities` / `src/main.tsx` | Original hamster/wordmark at leading edge, language/sound/help at trailing edge. Icon controls have names; sound exposes `aria-pressed`. |
| `.game-hud`, `.wheel-ticker` | Game blocks remain distinct from real anchored height. Hearts use a named `role="img"`; decorative hearts are hidden from assistive technology. Phone ticker also identifies the live score bonus. |
| Canvas / `drawGame`, `src/art.ts` | Front-facing wheel, rotating spokes/treads, seeds, spikes and hamster. Descriptive accessible name; Jump provides the keyboard equivalent. Original art, no remote imagery. |
| `.primary` / `src/main.tsx`, CSS | Start run → Jump → Keep rolling or Run it back. Space and Enter work from the control. Pointer capture handles hold/release outside. Rest, hover, active and focus states exist. |
| `<progress>`, `.progress-area` | Counts seeds toward a 12-seed milestone; completion shows a block message and raises difficulty. |
| `.telemetry`, `.state`, `.bonus` | Connecting, Spinning, Idle and Solo. Errors clear unknown values and remove bonus; polling continues. Missing anchor alone stays unknown. |
| `.share-button` | Native X intent link; encoded score text mentions `@squeekchain`. Opens a post composer, never posts automatically. |
| `.help-dialog` | Opening pauses play. Native modal contains focus, Escape closes, focus returns to Help. |
| `.result-panel` | Paused/run-complete summary; restart/resume uses the established action row. “Personal best!” is accurate for a tied or improved best. |
| `Icon`, `PixelHeart`, `PixelSeed`, `PixelHamster` / `src/icons.tsx` | Original inline vectors, decorative by default. UI icons use currentColor and a consistent 1.8px stroke; pixel art uses filled squares. |

Primary targets are 50px desktop / 48px phone; utilities aim for 44px. The probe reports one compact target below 44px, still meeting its 24px/spacing baseline. Focus is a 3px outline with 4px offset. Hover is gated on hover capability. Transitions name only background-color, color and transform, last 120ms and run only under `prefers-reduced-motion: no-preference`; pressed scale is 0.96.

The idle scene is static. Player-started play moves the wheel; Pause freezes it. Reduced motion removes decorative leg stride and button transforms; essential wheel/obstacle motion remains during play. Damage invulnerability uses steady transparency rather than flashing. Locally synthesized audio requires opt-in and starts muted.

## Do's and Don'ts

- Reuse `.wrap`, existing type tokens and button/control patterns. Keep the game/action ahead of supporting information.
- Keep live anchored height separate from game blocks. Preserve unknown readings and identify the scope of data. Extend telemetry through the same labeled-row pattern.
- Keep one filled main action, utility controls in their established zones and visible keyboard focus.
- Keep instructions beside controls and translated copy in `src/i18n.ts`. State must have words, not only color.
- Extend the original artwork; do not add official logos, external font/image CDNs or wallet infrastructure.
- For another page, reuse the wrapper and semantic type roles, keep assets relative and avoid routes needing a server rewrite. Rebuild `dist/` and recheck affected phone/desktop states after changes.
