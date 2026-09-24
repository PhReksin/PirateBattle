import { test, expect, start, advance, finish } from './fixtures';
import type { Page } from '@playwright/test';
async function stableImages(page: Page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => { })));
    });
}
test('Main Menu visual', async ({ page }) => {
    await page.goto('/'); await expect(page.getByRole('heading', { name: 'Pirate Battle', exact: true })).toBeVisible(); await stableImages(page);
    await expect(page).toHaveScreenshot('menu.png');
});
test('Arena visual', async ({ page }) => {
    await start(page, 'broadsides'); await advance(page, 100); await stableImages(page);
    await expect(page.getByTestId('arena')).toHaveScreenshot('arena.png');
});
test('Result visual', async ({ page }) => {
    await start(page); await finish(page); await expect(page.getByRole('status')).toHaveText('Registration confirmed');
    await stableImages(page); await expect(page).toHaveScreenshot('result.png');
});

test('Damage stages, central island and sprite HUD visual', async ({ page }) => {
    await start(page, 'visual-damage'); await stableImages(page);
    await expect(page).toHaveScreenshot('game-damage-stages.png');
});

for (const panel of ['Ranking', 'Match History'] as const) {
    test(panel + ' panel visual', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: panel, exact: true }).click();
        await expect(page.getByRole('table', { name: panel, exact: true })).toBeVisible();
        await stableImages(page); await expect(page).toHaveScreenshot(panel === 'Ranking' ? 'ranking-panel.png' : 'history-panel.png');
    });
}
test('Options panel visual', async ({ page }) => {
    await page.goto('/'); await page.getByRole('button', { name: 'Options', exact: true }).click();
    await stableImages(page); await expect(page).toHaveScreenshot('options-panel.png');
});
test('Pause panel visual', async ({ page }) => {
    await start(page); await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await stableImages(page); await expect(page).toHaveScreenshot('pause-panel.png');
});