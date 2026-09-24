import { test, expect, behavior, finish, openRecords, closeRecords } from './fixtures';
import type { Page } from '@playwright/test';
async function empty(page: Page) {
    await page.goto('/?testScenario=clear-water'); await openRecords(page);
    await expect(page.getByRole('table', { name: 'Ranking', exact: true })).toBeVisible();
    await behavior(page, 'success'); await page.getByLabel('Dataset', { exact: true }).selectOption('empty');
    await page.getByRole('button', { name: 'Reset demo data' }).click();
    await openRecords(page);
    await expect(page.getByText('No completed matches yet.')).toBeVisible();
}
async function play(page: Page) {
    await closeRecords(page);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(() => window.__gameTest?.ready);
}
async function bothTabs(page: Page, id: string) {
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await openRecords(page);
    await expect(page.getByRole('tabpanel').locator('[data-match-id="' + id + '"]')).toHaveCount(1);
    await openRecords(page, 'Match History');
    await expect(page.getByRole('tabpanel').locator('[data-match-id="' + id + '"]')).toHaveCount(1);
}
test('unavailable completion survives refresh and registers once after recovery', async ({ page, expectedFailures }) => {
    expectedFailures.push('/api/matches'); await empty(page); await behavior(page, 'unavailable');
    await play(page); await finish(page);
    const id = (await page.getByTestId('result').getAttribute('data-match-id'))!;
    await expect(page.getByRole('status')).toHaveText('Registration failed'); await page.reload();
    await expect(page.getByTestId('result')).toHaveAttribute('data-match-id', id);
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click(); await behavior(page, 'success');
    await page.getByRole('button', { name: 'View last result' }).click();
    await expect(page.getByRole('status')).toHaveText('Registration confirmed'); await bothTabs(page, id);
});
test('commit then timeout recovers by reusing the original ID', async ({ page, expectedFailures }) => {
    expectedFailures.push('/api/matches'); await empty(page); await behavior(page, 'commit-timeout');
    await play(page); await finish(page);
    const id = (await page.getByTestId('result').getAttribute('data-match-id'))!;
    await expect(page.getByRole('status')).toHaveText('Registration confirmed', { timeout: 15_000 }); await bothTabs(page, id);
});
test('refresh after commit and before acknowledgment does not duplicate a record', async ({ page, expectedFailures }) => {
    expectedFailures.push('/api/matches'); await empty(page); await behavior(page, 'commit-timeout');
    await play(page); await finish(page);
    await page.waitForTimeout(500); // The scenario commits after 100 ms and delays its response for 5 s.
    const id = (await page.getByTestId('result').getAttribute('data-match-id'))!;
    await page.reload(); await expect(page.getByRole('status')).toHaveText('Registration confirmed'); await bothTabs(page, id);
});
test('4xx does not automatically retry; reset cancels an older delayed registration', async ({ page, expectedFailures }) => {
    expectedFailures.push('/api/matches'); await empty(page); await behavior(page, 'http-422');
    let posts = 0; page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/api/matches')) posts++; });
    await play(page); await finish(page); await expect(page.getByRole('status')).toHaveText('Registration failed');
    await page.waitForTimeout(800); expect(posts).toBe(1);
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click(); await behavior(page, 'slow');
    await page.getByRole('button', { name: 'View last result' }).click();
    await page.getByRole('button', { name: 'Retry registration' }).click();
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await page.locator('.network-panel summary').click();
    await page.getByLabel('Dataset', { exact: true }).selectOption('empty');
    await page.getByRole('button', { name: 'Reset demo data' }).click(); await page.waitForTimeout(2000);
    await behavior(page, 'success'); await openRecords(page); await expect(page.getByText('No completed matches yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View last result' })).toHaveCount(0);
    await page.reload(); await openRecords(page); await expect(page.getByText('No completed matches yet.')).toBeVisible();
});
test('out-of-order page responses cannot replace the selected page', async ({ page }) => {
    await page.goto('/'); await openRecords(page); await expect(page.getByRole('table')).toBeVisible(); await behavior(page, 'out-of-order');
    await openRecords(page, 'Match History');
    await openRecords(page, 'Ranking');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Page 2 of 6')).toBeVisible(); await page.waitForTimeout(2100);
    await expect(page.getByText('Page 2 of 6')).toBeVisible();
    await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('06');
});
test('ranking configuration is explicit and filters the database', async ({ page }) => {
    await page.goto('/'); await openRecords(page); await expect(page.getByText('Page 1 of 6')).toBeVisible();
    await closeRecords(page); await page.getByRole('button', { name: 'Options', exact: true }).click();
    await page.getByLabel('Game session time').fill('90'); await page.getByRole('button', { name: 'Main Menu', exact: true }).click(); await openRecords(page);
    await expect(page.getByText('90 second battles · 3 second spawn interval')).toBeVisible();
    await expect(page.getByText('Page 1 of 1')).toBeVisible(); await expect(page.locator('tbody tr')).toHaveCount(4);
});
for (const scenario of ['connection', 'http-503', 'timeout', 'ranking-error']) {
    test(scenario + ' exposes retry while gameplay remains usable', async ({ page, expectedFailures }) => {
        expectedFailures.push('/api/ranking'); await page.goto('/'); await openRecords(page); await expect(page.getByRole('table')).toBeVisible();
        await behavior(page, scenario); await openRecords(page, 'Match History');
        if (scenario !== 'ranking-error') expectedFailures.push('/api/players/');
        await openRecords(page, 'Ranking');
        await expect(page.getByRole('tabpanel').getByRole('alert')).toBeVisible({ timeout: 20_000 });
        await play(page); await expect(page.locator('canvas')).toHaveCount(1);
    });
}
test('history-only failure leaves ranking usable', async ({ page, expectedFailures }) => {
    expectedFailures.push('/api/players/'); await page.goto('/'); await openRecords(page); await expect(page.getByRole('table')).toBeVisible();
    await behavior(page, 'history-error'); await openRecords(page, 'Match History');
    await expect(page.getByRole('tabpanel').getByRole('alert')).toBeVisible();
    await openRecords(page, 'Ranking'); await expect(page.getByRole('table')).toBeVisible();
});
test('API rejects invalid bodies and conflicting duplicates', async ({ page, expectedFailures }) => {
    expectedFailures.push('/api/matches'); await empty(page); await play(page); await finish(page);
    await expect(page.getByRole('status')).toHaveText('Registration confirmed');
    const responses = await page.evaluate(async () => {
        const journal = JSON.parse(localStorage.getItem('pirate-battle:journal:v1')!);
        const record = journal.lastResult;
        const post = async (body: unknown, id: string) => (await fetch('/api/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': id }, body: JSON.stringify(body)
        })).status;
        return [await post(record, record.matchId), await post({ ...record, score: record.score + 1 }, record.matchId), await post({}, 'bad')];
    });
    expect(responses).toEqual([200, 409, 422]);
});

test('history shows loading and supports multiple pages', async ({ page }) => {
    await page.goto('/'); await openRecords(page); await expect(page.getByRole('table')).toBeVisible();
    await behavior(page, 'slow'); await openRecords(page, 'Match History');
    await expect(page.getByText('Loading records…')).toBeVisible();
    await expect(page.getByText('Page 1 of 3')).toBeVisible(); await expect(page.locator('tbody tr')).toHaveCount(5);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Page 2 of 3')).toBeVisible(); await expect(page.locator('tbody tr')).toHaveCount(5);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Page 3 of 3')).toBeVisible(); await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await page.getByRole('button', { name: 'Previous', exact: true }).click(); await expect(page.getByText('Page 1 of 3')).toBeVisible();
});
test('several pending matches can be played and recovered independently', async ({ page, expectedFailures }) => {
    expectedFailures.push('/api/matches'); await empty(page); await behavior(page, 'unavailable');
    await play(page); await finish(page); await expect(page.getByRole('status')).toHaveText('Registration failed');
    const first = await page.getByTestId('result').getAttribute('data-match-id');
    await page.getByRole('button', { name: 'Play Again' }).click(); await page.waitForFunction(() => window.__gameTest?.ready);
    await finish(page); await expect(page.getByRole('status')).toHaveText('Registration failed', { timeout: 15_000 });
    const second = await page.getByTestId('result').getAttribute('data-match-id'); expect(second).not.toBe(first);
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(page.getByText('2 pending registrations')).toBeVisible(); await behavior(page, 'success');
    await expect(page.getByText(/\d+ pending registrations/)).toHaveCount(0); await openRecords(page);
    await expect(page.getByRole('tabpanel').locator('[data-match-id]')).toHaveCount(2);
    await openRecords(page, 'Match History'); await expect(page.getByRole('tabpanel').locator('[data-match-id]')).toHaveCount(2);
});