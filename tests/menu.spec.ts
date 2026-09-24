import { test, expect, openRecords, closeRecords } from './fixtures';
test('reference menu opens both records tabs and returns focus', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await openRecords(page); await expect(page.getByRole('table', { name: 'Ranking', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Ranking', exact: true }).press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Match History' })).toBeFocused();
    await expect(page.getByRole('table', { name: 'Match History' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Ranking', exact: true })).toBeFocused();
    await openRecords(page, 'Match History'); await closeRecords(page);
    await expect(page.getByRole('button', { name: 'Match History', exact: true })).toBeFocused();
});