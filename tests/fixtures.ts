import { test as base, expect } from '@playwright/test';
import type { ConsoleMessage, Page } from '@playwright/test';
export { expect };
export const test = base.extend<{ diagnostics: void; expectedFailures: string[] }>({
    expectedFailures: async ({ page }, provide) => { void page; await provide([]); },
    diagnostics: [async ({ page, expectedFailures }, provide) => {
        const errors: string[] = [];
        const pageError = (error: Error) => errors.push(error.message);
        const consoleError = (message: ConsoleMessage) => {
            if (message.type() !== 'error') return;
            const text = message.text();
            const url = message.location().url;
            if (expectedFailures.some((path) => url.includes(path)) && /Failed to load resource|net::ERR_/.test(text)) return;
            if (expectedFailures.includes('/assets/missing-test-image.png') && text.includes('/assets/missing-test-image.png') && /load|decode/i.test(text)) return;
            errors.push(text);
        };
        page.on('pageerror', pageError); page.on('console', consoleError);
        await provide();
        page.off('pageerror', pageError); page.off('console', consoleError);
        expect(errors, 'Unexpected browser errors').toEqual([]);
    }, { auto: true }],
});
export async function start(page: Page, scene = 'clear-water') {
    await page.goto('/?testScenario=' + scene);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(() => window.__gameTest?.ready === true);
}
export async function advance(page: Page, milliseconds: number) {
    await page.evaluate((time) => window.__gameTest!.advance(time), milliseconds);
}
export async function snapshot(page: Page) { return page.evaluate(() => window.__gameTest!.snapshot()); }
export async function behavior(page: Page, value: string) {
    await closeRecords(page);
    const panel = page.locator('.network-panel');
    if ((await panel.getAttribute('open')) === null) await panel.locator('summary').click();
    await page.getByLabel('Network behavior').selectOption(value);
}
export async function finish(page: Page) {
    const state = await snapshot(page);
    await advance(page, state.config.sessionSeconds * 1000);
    await expect(page.getByTestId('result')).toBeVisible();
}

export async function openRecords(page: Page, name: 'Ranking' | 'Match History' = 'Ranking') {
    const dialog = page.getByRole('dialog', { name: 'Captain’s log' });
    if (await dialog.isVisible()) await dialog.getByRole('tab', { name, exact: true }).click();
    else await page.getByRole('button', { name, exact: true }).click();
    await expect(dialog).toBeVisible();
}
export async function closeRecords(page: Page) {
    const dialog = page.getByRole('dialog', { name: 'Captain’s log' });
    if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Main Menu', exact: true }).click();
}