import { test, expect, start, advance, snapshot } from './fixtures';

test('combat debris pauses, expires and is released when leaving', async ({ page }) => {
    await start(page, 'front-enemy');
    await page.keyboard.down('Space'); await advance(page, 250); await page.keyboard.up('Space');
    expect((await snapshot(page)).enemies[0].hp).toBe(15);
    const effects = await page.evaluate(() => window.__gameTest!.resources().effects);
    expect(effects).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const frozen = await snapshot(page); await advance(page, 10000);
    expect(await snapshot(page)).toEqual(frozen);
    expect(await page.evaluate(() => window.__gameTest!.resources().effects)).toBe(effects);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.keyboard.down('Space'); await advance(page, 500); await page.keyboard.up('Space');
    expect((await snapshot(page)).score).toBe(1);
    await advance(page, 2000);
    expect(await page.evaluate(() => window.__gameTest!.resources().effects)).toBe(0);
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(await page.evaluate(() => Object.values(window.__lastGameResources!).every(count => count === 0))).toBe(true);
});

test('portrait HUD and controls fit without changing world coordinates', async ({ page }) => {
    await start(page, 'visual-damage'); const before = await snapshot(page);
    for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await expect(page.getByRole('meter', { name: 'Health' })).toHaveAttribute('aria-valuenow', '50');
        const layout = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            controls: [...document.querySelectorAll<HTMLButtonElement>('.game-round-button')]
                .map(button => {
                    const r = button.getBoundingClientRect();
                    return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
                }),
        }));
        expect(layout.overflow).toBe(false); expect(layout.controls.every(Boolean)).toBe(true);
        expect(await snapshot(page)).toEqual(before);
    }
});