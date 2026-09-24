# Panel visual update — verification

Verified on 24 September 2026.

- `npm run typecheck`: passed for the app, Vite and Playwright TypeScript projects.
- `npm run lint`: passed.
- `npm run build`: passed, including the final responsive CSS. Vite reports its existing large-chunk advisory.
- In-app browser at 1800×1000: inspected Ranking, Match History, Options, Pause and an actual completed Result using the supplied artwork.
- Phone checks: Options and Result at 390×844; record tables at 390×844 and 320×740. No horizontal overflow observed. Adjusted history columns so Defeated stays on one line at 320px.
- Landscape at 915×412: Pause heading and all three actions fit; embedded Options can scroll to its return action.
- Records: five rows per page; History Next changes page; direct History opening focuses its selected tab; ArrowLeft selects/focuses Ranking; Main Menu returns focus to the opening button.
- Options: spawn plus changes 3 to 3.5; invalid session 30 exposes validation; valid 90/3.5 survives save and reopen. Restored defaults after these checks.
- Pause → Options → Back to Pause → Resume: one canvas remains, the original 02:00 match time stays frozen while paused, and Resume restores arena focus. Saving 90 seconds changes future settings without changing the active match. Rechecked input autofocus after the final focus fix.
- A real match reached death after about 18 active seconds; Result displayed the actual score, duration, end reason and confirmed registration.
- Browser console inspection returned no errors.

The updated Playwright test files type-check. The full Playwright browser suite
and screenshot baseline generation were not run: direct Chromium startup was
blocked by the desktop sandbox. The UI checks above used the available in-app
browser. They do not establish a full automated regression pass.

To run the focused behavior checks on your machine:

```sh
npm ci
npx playwright install chromium
npm run test:e2e -- tests/options.spec.ts tests/panels.spec.ts tests/network.spec.ts
```

For screenshot baselines, run `npm run test:visual:update`, inspect every image,
then commit approved baselines and run `npm run test:e2e`. Rebuild with ordinary
`npm run build` before publishing; Playwright builds with the E2E test flag.