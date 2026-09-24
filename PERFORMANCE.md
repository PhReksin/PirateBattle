# Performance evidence

Status: measurements have not been collected for your project. Do not replace these fields with estimates.
The target is 60 FPS; passing build or simulation tests does not establish rendering performance.

## Collect a full run

1. Run `npm run build` and `npm run preview -- --host 127.0.0.1`. This rebuild removes the E2E clock.
2. Open `http://127.0.0.1:4173/?profile=1`; use Options to set 180 seconds and your documented spawn interval.
3. Play for the full 180 active seconds. Pauses and loading are excluded. Repeat if death ends the run early.
4. On Result, click Download performance data and save the JSON under `evidence/performance/`.
5. Record a representative busy segment with Chrome DevTools Performance. Save its trace alongside the JSON.
6. Record actual hardware, OS/browser, display refresh, commit and viewport below. The export already includes config, seed, duration, DPR and renderer resolution.

Average FPS is measured frame intervals / total interval seconds. p95 is the nearest-rank 95th percentile.
The JSON retains all intervals and once-per-second entity samples. Real stalls stay in the data.
`fullDurationRun` must be true for the required full-length evidence.

| Field | Measured value / evidence |
| --- | --- |
| Commit and build | TO MEASURE |
| CPU, GPU, RAM | TO MEASURE |
| OS and browser | TO MEASURE |
| Display refresh, viewport, DPR | TO MEASURE |
| Config, seed, active duration | Link the exported JSON |
| Average FPS / 60 FPS target | TO MEASURE |
| p95 frame interval (ms) | TO MEASURE |
| Peak enemies / projectiles / effects | Derive from the exported samples |
| Trace and observed bottleneck | TO MEASURE |

## Five-cycle memory comparison

Warm the shared textures with one match, return to Menu, then take a baseline heap snapshot after garbage collection.
Perform five identical start/play/exit cycles and take a menu-state heap snapshot after each, using the same GC procedure.
Record retained canvases, runtime tickers/listeners, views and simulation objects; inspect retaining paths for growth.
A shared texture cache remaining warm is expected. JavaScript heap size excludes some GPU allocations.
The E2E lifecycle test separately checks actual owned resource counts after five exits; it does not replace heap evidence.

| Snapshot | Heap size | Retained match objects | Evidence file |
| --- | --- | --- | --- |
| Warm baseline | TO MEASURE | TO MEASURE | TO CAPTURE |
| Cycle 1 | TO MEASURE | TO MEASURE | TO CAPTURE |
| Cycle 2 | TO MEASURE | TO MEASURE | TO CAPTURE |
| Cycle 3 | TO MEASURE | TO MEASURE | TO CAPTURE |
| Cycle 4 | TO MEASURE | TO MEASURE | TO CAPTURE |
| Cycle 5 | TO MEASURE | TO MEASURE | TO CAPTURE |

Document measured bottlenecks, any optimization, and the subsequent remeasurement.
Never substitute the target or test clock step rate for observed FPS.