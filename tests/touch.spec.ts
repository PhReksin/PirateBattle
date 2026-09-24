import { test, expect, start, advance, snapshot, finish } from './fixtures';
test('held multitouch moves and fires, survives resize, pauses and replays', async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'This case uses actual emulated touch points.');
    await start(page, 'front-enemy');
    const cdp = await context.newCDPSession(page);
    const forward = (await page.getByRole('button', { name: 'Forward', exact: true }).boundingBox())!;
    const fire = (await page.getByRole('button', { name: 'Fire front', exact: true }).boundingBox())!;
    const points = [{ id: 1, x: forward.x + forward.width / 2, y: forward.y + forward.height / 2 },
    { id: 2, x: fire.x + fire.width / 2, y: fire.y + fire.height / 2 }];
    const before = await snapshot(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    await advance(page, 700); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const after = await snapshot(page); expect(after.player.x).toBeGreaterThan(before.player.x); expect(after.score).toBe(1);
    await page.setViewportSize({ width: 915, height: 412 });
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap(); const paused = await snapshot(page);
    await advance(page, 1000); expect(await snapshot(page)).toEqual(paused);
    await page.getByRole('button', { name: 'Resume' }).tap(); await finish(page);
    await expect(page.getByRole('status')).toHaveText('Registration confirmed');
    await page.getByRole('button', { name: 'Play Again' }).tap(); await page.waitForFunction(() => window.__gameTest?.ready);
    expect((await snapshot(page)).score).toBe(0); await cdp.detach();
});