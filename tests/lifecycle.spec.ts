import { test, expect, start, advance, snapshot, finish } from './fixtures';

test.use({ headless: false });
test('pause freezes time and clears held input; explicit resume restores focus', async ({ page }) => {
    await start(page); await page.keyboard.down('KeyW'); await page.keyboard.down('Space'); await advance(page, 100);
    await page.keyboard.press('KeyP'); const paused = await snapshot(page); await advance(page, 10_000);
    expect(await snapshot(page)).toEqual(paused);
    await page.getByRole('button', { name: 'Resume', exact: true }).click(); await advance(page, 1000);
    const resumed = await snapshot(page); expect(resumed.player.x).toBe(paused.player.x);
    expect(resumed.telemetry.playerFrontProjectilesCreated).toBe(paused.telemetry.playerFrontProjectilesCreated);
    await expect(page.getByTestId('arena')).toBeFocused();
    await page.keyboard.up('KeyW'); await page.keyboard.up('Space');
});
test('timeout persists once, restores after refresh and replays with a fresh ID', async ({ page }) => {
    await start(page); await finish(page); await expect(page.getByRole('status')).toContainText('Registration confirmed');
    const id = await page.getByTestId('result').getAttribute('data-match-id'); await page.reload();
    await expect(page.getByTestId('result')).toHaveAttribute('data-match-id', id!);
    await page.getByRole('button', { name: 'Play Again' }).click(); await page.waitForFunction(() => window.__gameTest?.ready);
    expect((await snapshot(page)).activeSeconds).toBe(0); await finish(page);
    expect(await page.getByTestId('result').getAttribute('data-match-id')).not.toBe(id);
});
test('real contact death opens Result', async ({ page }) => {
    await start(page, 'death'); await advance(page, 100);
    await expect(page.getByTestId('result')).toContainText('Your ship was destroyed');
});
test('five start and exit cycles release owned resources and create no result', async ({ page }) => {
    for (let cycle = 0; cycle < 5; cycle++) {
        if (!cycle) await start(page); else {
            await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForFunction(() => window.__gameTest?.ready);
        }
        await advance(page, 100); await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
        await expect(page.locator('canvas')).toHaveCount(0);
        const counts = await page.evaluate(() => window.__lastGameResources);
        expect(Object.values(counts!)).toEqual(Object.values(counts!).map(() => 0));
        await expect(page.getByRole('button', { name: 'View last result' })).toHaveCount(0);
    }
});
test('browser Back abandons an active match', async ({ page }) => {
    await start(page); await advance(page, 100); await page.goBack();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0); await expect(page.getByTestId('result')).toHaveCount(0);
});
test.describe('Browser visibility', () => {
    test('real tab hiding pauses until explicit resume', async ({ page, context }) => {
        await start(page); await advance(page, 100);
        const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
        await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('hidden');
        await expect.poll(() => page.evaluate(() => window.__gameTest!.snapshot().phase)).toBe('paused');
        const paused = await snapshot(page); await advance(page, 1000); expect(await snapshot(page)).toEqual(paused);
        await page.bringToFront(); expect((await snapshot(page)).phase).toBe('paused');
        await page.getByRole('button', { name: 'Resume' }).click(); expect((await snapshot(page)).phase).toBe('running'); await other.close();
    });
});