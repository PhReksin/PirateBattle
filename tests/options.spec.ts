import { expect, test } from './fixtures';

test('validates and persists options', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await page.getByLabel('Game session time').fill('30');
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('60–180');
    await page.getByLabel('Game session time').fill('90');
    await page.getByLabel('Enemy spawn time').fill('2.5');
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await expect(page.getByLabel('Game session time')).toHaveValue('90');
    await expect(page.getByLabel('Enemy spawn time')).toHaveValue('2.5');
});

test('empty and fractional invalid edits are rejected; Discard changes preserves saved options', async ({ page }) => {
    await page.goto('/'); await page.getByRole('button', { name: 'Options', exact: true }).click();
    await page.getByLabel('Game session time').fill(''); await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('required');
    await page.getByLabel('Game session time').fill('60.5'); await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('60–180');
    await page.getByLabel('Game session time').fill('90'); await page.getByLabel('Enemy spawn time').fill('1.2');
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('0.5-second');
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await expect(page.getByLabel('Game session time')).toHaveValue('120'); await expect(page.getByLabel('Enemy spawn time')).toHaveValue('3');
});