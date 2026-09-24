import { defineConfig } from '@playwright/test';

// These exercise real combat rules and an isolated Web Audio adapter; no browser is launched.
export default defineConfig({
    testDir: './tests', testMatch: 'audio.unit.spec.ts',
    workers: 1, fullyParallel: false, reporter: 'list',
    outputDir: './test-results/audio',
});
