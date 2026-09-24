# Pirate Battle

A single-player naval survival game built with React 19, TypeScript, PixiJS 8 and Vite. Steer around a central island, fire the front cannon and both broadsides, and survive until the session timer expires. Destroying an enemy with a player weapon earns one point; being rammed does not.

React renders the menus, loading screen, HUD, touch controls and records panels. PixiJS renders the battle. Axios and TanStack Query communicate with a browser-based MSW API backed by IndexedDB. **The ranking is a local demonstration, not a shared online leaderboard.** The mock API also runs in production builds.

See [ARCHITECTURE.md](ARCHITECTURE.md) for implementation details, contracts, persistence, resource ownership and balance decisions.

## Live demo

[Play Pirate Battle](https://pirate-battle-zeta.vercel.app/#game)

The demo is deployed on Vercel. Ranking and match history use MSW mock APIs
and browser-local storage. Records are not shared between devices or domains.

## Production build

Use Node.js 22.12 or newer within the 22.x release line.
Run `npm ci`, then `npm run build`.
Run `npm run preview` to inspect the production build locally.
The deployment must use `VITE_TEST_MODE=false`.

## Setup

Requirements:

- Node.js 22, using a current 22.x patch release, and npm. The project declares `engines.node: 22.x` and provides `.nvmrc`.
- A modern browser with WebGL, service workers, IndexedDB and Web Audio support. Automated browser tests target Chromium.
- Localhost for development or HTTPS for a published build. Service workers and the Web Crypto APIs used by the game require a secure context.

Open a terminal in the directory containing `package.json`:

```sh
# If you use nvm:
nvm install
nvm use

npm ci
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`. The supplied artwork and sounds must be under `public/assets/`. The generated MSW worker must be present at `public/mockServiceWorker.js`.

If the worker is missing, generate it with the installed MSW version:

```sh
npx msw init public --save
```

There is no separate API server, database service, account registration or API key to configure. The first successful data-service startup seeds the browser's mock database with sample records.

## Commands

Run these from the project root:

| Purpose | Command |
| --- | --- |
| Development server | `npm run dev` |
| Production build, including TypeScript checks | `npm run build` |
| Serve the current build locally | `npm run preview -- --host 127.0.0.1 --port 4173` |
| ESLint | `npm run lint` |
| Type-check application, Vite and Playwright projects | `npm run typecheck` |
| Install Chromium for Playwright | `npx playwright install chromium` |
| Full Playwright suite | `npm run test:e2e -- --workers=1` |
| List tests without running them | `npm run test:e2e -- --list` |
| Desktop Chromium only | `npm run test:e2e -- --project=desktop-chromium --workers=1` |
| Mobile Chromium only | `npm run test:e2e -- --project=mobile-chromium --workers=1` |
| Focused audio tests, without launching a browser | `npx playwright test --config playwright.audio.config.ts` |
| Visual comparisons | `npm run test:visual -- --workers=1` |
| Create/update visual baselines after reviewing the change | `npm run test:visual:update -- --workers=1` |
| Open the latest HTML test report | `npm run test:report` |

`preview` serves existing `dist/` files; it does not rebuild them. Normally run `npm run build` first.

Playwright builds in E2E mode and starts its own preview server on port 4173. Stop any existing server on that port before running the suite. The config defines desktop Chromium and Pixel 7 emulation. Lifecycle tests explicitly use a headed browser because they exercise real tab visibility; use one worker and avoid changing browser focus during those tests. Linux CI needs a display such as Xvfb for these headed cases, as well as Playwright's browser system dependencies.

**After running E2E tests, run `npm run build` again before normal preview or deployment.** The tests replace `dist/` with a build whose simulation clock advances only through the test harness.

Tests cover gameplay, options, loading, lifecycle, touch input, network failures, panels, presentation and audio. Screenshot baselines must be reviewed on a consistent browser/platform. The current Pause Options test expects a button that is commented out in the UI; see Known limitations. Test existence is not a claim that the complete suite currently passes.

## Environment variables and diagnostic modes

No environment variables are required for ordinary local play.

| Setting | Value and purpose |
| --- | --- |
| `VITE_TEST_MODE` | Only the exact string `true` enables deterministic test scenes and `window.__gameTest`. It also disables automatic simulation-clock advancement. Leave unset or use `false` for normal play. |
| `.env.e2e` | Contains `VITE_TEST_MODE=true`; loaded by `vite build --mode e2e`. |
| `.env.production` | Contains `VITE_TEST_MODE=false` for production builds. |
| `CI` | Read by Playwright: a truthy value enables one retry of a failed test. This is separate from the API request retry policy. |
| Vite `BASE_URL` | Supplied by Vite's `base` setting. The current game assumes deployment at the domain root; several artwork URLs and `/api` paths are root-relative. |

Vite substitutes client environment values at build time. Restart the dev server or rebuild after changing them. A shell or hosting environment setting of `VITE_TEST_MODE=true` can override the env files, so remove it from production settings. Do not place secrets in `VITE_*` variables. There is currently no configurable API-base-URL environment variable; Axios uses `/api`.

Two URL parameters are available:

- `?profile=1`: enables performance collection in a normal build. Result offers **Download performance data**. Follow [PERFORMANCE.md](PERFORMANCE.md) for full-duration and memory measurements.
- `?testScenario=asset-failure` and other scenes in `src/testing/scenarios.ts`: recognized only when `VITE_TEST_MODE=true`. They are test fixtures, separate from the Network scenarios selector.

## Controls

Click **Play** to load assets and focus the arena. Keyboard input applies while the arena has focus; click it again if necessary.

| Action | Keyboard | Touch / pointer |
| --- | --- | --- |
| Move forward | `W` or `↑` | Hold the forward icon |
| Turn left | `A` or `←` | Hold the left-turn icon |
| Turn right | `D` or `→` | Hold the right-turn icon |
| Front cannon | `Space` | Hold the front-fire icon |
| Left broadside | `Q` | Hold the left-fire icon |
| Right broadside | `E` | Hold the right-fire icon |
| Pause | `P` or `Escape` | Pause icon |
| Resume | Activate **Resume**; `Escape` also closes the Pause dialog through its resume handler | **Resume** |
| Abandon the current match | Main Menu button, or browser Back | Home icon / **Main Menu** |

Movement and firing can be held together; touch controls support simultaneous pointers. Each broadside fires three cannonballs with its own cooldown. Leaving the tab or losing browser focus pauses the match and clears held input. Returning to the page does not automatically resume it.

The player has a green health bar above the ship, and enemies have red bars. Ships use damaged artwork as health falls; critical ships show fire. The top HUD displays player HP, score and remaining active time.

**Sound On / Sound Off** and **Volume** controls are available on the main menu and Pause panel. The sound toggle has the accessible label **Mute sound**. Audio starts after a user gesture. Shooting, hits, destruction, button feedback and an ocean ambience loop use the supplied sound files. Sound failures do not prevent play.

## Gameplay configuration

Open **Options** from the main menu:

| Setting | Default | Allowed values |
| --- | --- | --- |
| Game session time | 120 seconds | 60–180, whole seconds |
| Enemy spawn time | 3 seconds | 1–10, in 0.5-second increments |

Edit the number or use the plus/minus buttons. **Main Menu** saves valid values; **Discard changes** leaves the saved values unchanged. Empty, non-finite, out-of-range and invalid-step values are rejected by TypeScript validation. Saved settings apply to the next match. Each match captures a cloned, recursively frozen configuration, which is also stored in its result.

Advanced tuning lives in [src/game/config.ts](src/game/config.ts): ship HP, size and speed; turn rates; weapon damage, speed, radius, range, lifetime and cooldown; spawn clearance and sequence; navigation; arena and islands. Coordinates use logical world units, time uses seconds, and headings/turn rates use radians. **`player.broadsideOuterAngle` is the exception: it uses degrees**, currently `0` for parallel shots. A positive value below 90 fans the outer projectiles while the middle projectile continues perpendicular to the ship.

The default arena is 960 × 540 with one central island. Spawns alternate Chaser and Shooter. Chasers pursue and ram; Shooters navigate around the island and fire when distance, aim and line of sight permit. A match ends at zero player HP or when active time runs out. Loading and pauses consume no match time. Returning to Menu during play abandons the match and creates no completed record.

Changing the configuration changes its SHA-256 comparison key. Ranking can use **Saved options** or **Last result**; it only compares matches with the same complete configuration. History shows this browser's local player's matches across configurations. Both panels display five rows per page. Ranking contains match results, not one aggregate/best row per player.

## Network scenarios and reset

On the main menu, scroll below the main panel and expand **Network scenarios**. **Network behavior** controls subsequent mock API requests and persists across refreshes. Changing it resets request-sequence counters without deleting records. To issue a new list request after changing behavior, open or reopen Ranking/Match History, or use **Retry** on an error. Selecting `success` also triggers pending-record recovery and query refreshes.

| Network behavior | Injected behavior |
| --- | --- |
| `success` | Normal response after approximately 100 ms. |
| `slow` | 1,500 ms delay. |
| `variable` | Repeating 80 / 900 / 250 ms delays per HTTP method and pathname. |
| `out-of-order` | First GET per pathname delayed 1,800 ms; later GETs 100 ms. Page query parameters share the same counter. |
| `timeout` | 5,000 ms delay, exceeding Axios's 4,000 ms timeout. A timeout is not proof that a POST was never stored. |
| `connection` | Simulated network failure. |
| `http-422` | HTTP 422 responses; no automatic request retry. |
| `http-503` | HTTP 503 responses. |
| `ranking-error` | Only ranking GETs fail with 503. |
| `history-error` | Only history GETs fail with 503. |
| `unavailable` | POST registration fails with 503; list GETs still work. |
| `commit-timeout` | A new POST is stored, then its response is delayed by 5 seconds. Repeating the same match returns the existing record without duplicating it. |

Transient errors receive up to two automatic retries after the initial attempt. This includes connection failures, timeouts, HTTP 408/429 and 5xx. Other 4xx responses require an explicit retry or correction. Automatic retries can delay the final error message.

To replace demo data:

1. Select **Dataset → Multiple pages** or **Empty**.
2. Enter **Fixture seed**, an integer from 0 to 4,294,967,295; the default is 1337.
3. Click **Reset demo data** and wait for it to finish.

Reset deletes confirmed demo matches, all pending registrations and the last result; clears the query cache and request counters; and loads the selected fixtures. **It preserves local identity, saved gameplay options, audio preferences and the selected network behavior.** Choose `success` separately to restore normal requests. Do not reset while trying to preserve and recover a pending result.

`Multiple pages` creates 31 deterministic records: 27 for the current saved configuration, four for an alternate session duration, and 12 belonging to the local player. The fixture seed affects demo scores; it does not change the gameplay RNG seed. Reset fixtures after changing saved options if you want multiple matching ranking pages.

## Reproducing failures and recovery

Use a fresh demo reset when a recipe needs known records. Browser DevTools → Network, filtered to `/api`, shows requests and retries. Network simulations operate inside MSW; do not use the browser's Offline switch as a substitute for the specific scenarios below.

### Failed registration survives refresh

1. Select `unavailable` and start a match. Let time expire or allow enemies to sink the player.
2. Result appears immediately. Wait for automatic attempts to finish: the registration becomes failed while the record remains pending locally.
3. Refresh while still on Result. The same result and match ID are restored and submission is attempted again.
4. Return to Main Menu and select `success`, without resetting demo data.
5. Open Match History and confirm the completed match appears once. The app-level outbox can recover records while the Result screen is closed.

### Stored result with a lost acknowledgment

1. Select `commit-timeout`, complete a match and observe the POST in DevTools.
2. The mock database commits the first request, but Axios times out before the response arrives.
3. An automatic retry uses the same `Idempotency-Key` and returns the existing record. Result should become **Registration confirmed** with one history entry.
4. Refreshing after the commit but before acknowledgment exercises the same recovery across a reload. The focused network tests cover this timing precisely.

### List errors, cached data and empty states

1. With `success` and `Multiple pages`, open Ranking once to populate its cache, then return to Main Menu.
2. Select `ranking-error` and reopen Ranking. After retries fail, the previously cached page can remain visible with an error and **Retry**. Open Match History to check that it still works.
3. Select `success` to recover. Repeat with `history-error` to reverse the affected panel.
4. Use `connection`, `timeout` or `http-503` for broader request failures. For `http-422`, verify that one request fails without automatic retries.
5. Select **Empty**, reset, and open a records panel to see **No completed matches yet**.

### Delayed and out-of-order requests

Select `slow` or `variable` and open records to inspect loading/updating states. For `out-of-order`, first load multiple pages under `success` so pagination is available, then select `out-of-order`, reopen records and switch pages quickly. Requests for another page must not replace the selected page. The automated network test makes this sequence deterministic.

### Asset load failure

Run the focused automated case:

```sh
npm run test:e2e -- tests/assets.spec.ts --project=desktop-chromium --workers=1
```

For manual inspection, stop the normal dev server, run `npm run dev -- --mode e2e`, and open `http://localhost:5173/?testScenario=asset-failure` (use the port Vite prints). Click Play: the first asset attempt uses an intentionally missing image. Loading shows an error with **Retry** and **Main Menu**. Retry uses the real URL and should create one canvas. Reload the page to reset the one-time failure. In this mode the simulation intentionally waits for the test bridge; restart with ordinary `npm run dev` to play normally.

Useful focused suites:

```sh
npm run test:e2e -- tests/network.spec.ts --project=desktop-chromium --workers=1
npm run test:e2e -- tests/lifecycle.spec.ts --project=desktop-chromium --workers=1
```

The network suite additionally tests invalid payloads, conflicting duplicate IDs, reset during delayed registration, multiple pending matches and refresh before acknowledgment. The lifecycle suite checks pause/resume, abandonment and repeated mount/disposal.

## Build and public hosting

```sh
npm run lint
npm run typecheck
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Publish the complete `dist/` directory to an HTTPS static host at the domain root. Use Node 22, install command `npm ci`, build command `npm run build`, and output directory `dist`. Ensure `VITE_TEST_MODE` is unset or `false`. Preserve `dist/assets/` and `dist/mockServiceWorker.js`; the worker must be served as JavaScript, not rewritten to HTML.

The app uses React screen state and a `#game` history entry, not separate `/options` or `/ranking` routes. It currently needs no server API deployment. Opening the public URL in another browser creates a separate identity, database and leaderboard. A public URL does not turn this mock into a shared backend.

## Known limitations

- `MainMenu.tsx` currently leaves its `statusPanel` commented out. Start/storage/data-service errors, pending count, **Retry data service** and **View last result** supplied by `App.tsx` are therefore hidden on Menu. Result still shows its own registration status/retry. If data-service startup fails, correct the underlying problem and reload; its menu retry is not presently reachable.
- `PauseDialog.tsx` has its **Options** button commented out. Edit gameplay settings from the main menu. `tests/panels.spec.ts` still expects the Pause Options flow and needs to be aligned with the intended UI before the full suite can pass.
- IndexedDB and localStorage are browser-local and can be cleared or unavailable. There is no login, cross-device sync, real multiplayer, server-authoritative score validation or continuous background-sync worker.
- The following camera shows a closer portion of the logical arena; world boundaries may be off-screen. Ship collisions use circles and island collisions use rectangles rather than exact artwork outlines.
- Balancing values are starting points. The clock has no catch-up-step cap for a long foreground stall, and enemies have no fixed population cap. These are performance considerations at aggressive spawn settings.
- [PERFORMANCE.md](PERFORMANCE.md) currently contains uncollected measurements. A 60 Hz simulation does not establish 60 FPS rendering. Full performance and memory evidence must be measured.
- The generated `public/mockServiceWorker.js` may produce an ESLint unused-disable warning with the current ignore configuration. Maintain lint exclusions for generated files rather than editing generated worker code.
- [ASSET_SOURCES.md](ASSET_SOURCES.md) records the supplied challenge assets but still needs its older water/health-bar description and sound attribution inventory updated. Do not infer a redistribution license where none is recorded.

More detailed tradeoffs and persistence compatibility limits are recorded in [ARCHITECTURE.md](ARCHITECTURE.md).
