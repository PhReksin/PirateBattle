import { test, expect, start, snapshot, advance, openRecords, closeRecords } from './fixtures';

test('Options in Pause saves future settings without restarting or changing the current match', async ({ page }) => {
    await start(page); await advance(page, 100);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const frozen = await snapshot(page);
    await page.getByRole('dialog', { name: 'Paused', exact: true }).getByRole('button', { name: 'Options', exact: true }).click();
    await expect(page.getByLabel('Game session time', { exact: true })).toBeFocused();
    await page.getByLabel('Game session time', { exact: true }).fill('90');
    await page.getByLabel('Enemy spawn time', { exact: true }).fill('2.5');
    await page.getByRole('button', { name: 'Back to Pause', exact: true }).click();
    await advance(page, 10000); expect(await snapshot(page)).toEqual(frozen);
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByTestId('arena')).toBeFocused();
    const resumed = await snapshot(page);
    expect(resumed.config).toEqual(frozen.config); expect(resumed.activeSeconds).toBe(frozen.activeSeconds);
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(() => window.__gameTest?.ready);
    expect((await snapshot(page)).config.sessionSeconds).toBe(90);
    expect((await snapshot(page)).config.spawn.intervalSeconds).toBe(2.5);
});

test('steppers respect bounds and half-second spawn increments', async ({ page }) => {
    await page.goto('/'); await page.getByRole('button', { name: 'Options', exact: true }).click();
    await page.getByRole('button', { name: 'Increase enemy spawn time', exact: true }).click();
    await expect(page.getByLabel('Enemy spawn time', { exact: true })).toHaveValue('3.5');
    await page.getByLabel('Game session time', { exact: true }).fill('180');
    await expect(page.getByRole('button', { name: 'Increase game session time', exact: true })).toBeDisabled();
    await page.getByLabel('Enemy spawn time', { exact: true }).fill('1');
    await expect(page.getByRole('button', { name: 'Decrease enemy spawn time', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await expect(page.getByLabel('Game session time', { exact: true })).toHaveValue('120');
    await expect(page.getByLabel('Enemy spawn time', { exact: true })).toHaveValue('3');
});

test('Captain’s Log keeps keyboard tabs, focus restoration and narrow-screen tables usable', async ({ page }) => {
    await page.goto('/'); await openRecords(page, 'Match History');
    await expect(page.getByRole('tab', { name: 'Match History', exact: true })).toBeFocused();
    await page.getByRole('tab', { name: 'Match History', exact: true }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Ranking', exact: true })).toBeFocused();
    await expect(page.getByRole('table', { name: 'Ranking', exact: true })).toBeVisible();
    for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.getByRole('dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
        await expect(page.locator('tbody tr')).toHaveCount(5);
    }
    await closeRecords(page);
    await expect(page.getByRole('button', { name: 'Match History', exact: true })).toBeFocused();
});