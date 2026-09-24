import { test, expect } from './fixtures';
test('asset failure is visible and Retry starts one runtime', async ({ page, expectedFailures }) => {
    expectedFailures.push('/assets/missing-test-image.png');
    await page.goto('/?testScenario=asset-failure');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await page.evaluate(() => window.__gameTest)).toBeUndefined();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.waitForFunction(() => window.__gameTest?.ready);
    await expect(page.locator('canvas')).toHaveCount(1);
});