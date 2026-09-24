import { test, expect, start, advance, snapshot } from './fixtures';
test('moves and rotates while firing; cooldown permits the next shot', async ({ page }) => {
    await start(page); const before = await snapshot(page);
    await page.keyboard.down('KeyW'); await page.keyboard.down('Space');
    await advance(page, 100); const first = await snapshot(page);
    expect(first.player.x).toBeGreaterThan(before.player.x);
    expect(first.telemetry.playerFrontProjectilesCreated).toBe(1);
    expect(first.projectiles).toHaveLength(1);
    await advance(page, 200); expect((await snapshot(page)).telemetry.playerFrontProjectilesCreated).toBe(1);
    await page.keyboard.down('KeyD'); await advance(page, 100);
    const next = await snapshot(page);
    expect(next.telemetry.playerFrontProjectilesCreated).toBe(2); expect(next.player.angle).toBeGreaterThan(0);
    await page.keyboard.up('KeyW'); await page.keyboard.up('Space'); await page.keyboard.up('KeyD');
});
test('front cannon damages then kills exactly once', async ({ page }) => {
    await start(page, 'front-enemy'); await page.keyboard.down('Space');
    await advance(page, 250); const damaged = await snapshot(page);
    expect(damaged.enemies[0].hp).toBeLessThan(damaged.enemies[0].maxHp);
    await advance(page, 500); const killed = await snapshot(page);
    expect(killed.enemies).toHaveLength(0); expect(killed.score).toBe(1);
    await advance(page, 1000); expect((await snapshot(page)).score).toBe(1);
    await page.keyboard.up('Space');
});
test('both broadsides create three parallel projectiles and kill separate enemies', async ({ page }) => {
    await start(page, 'broadsides'); await page.keyboard.down('KeyQ'); await page.keyboard.down('KeyE');
    await advance(page, 17); const fired = await snapshot(page);
    const left = fired.projectiles.filter((shot) => shot.faction === 'player' && shot.direction.y < 0);
    const right = fired.projectiles.filter((shot) => shot.faction === 'player' && shot.direction.y > 0);
    expect(left).toHaveLength(3); expect(right).toHaveLength(3);
    for (const shots of [left, right]) {
        expect(new Set(shots.map((shot) => JSON.stringify(shot.direction))).size).toBe(3);
    }
    await page.keyboard.up('KeyQ'); await page.keyboard.up('KeyE'); await advance(page, 400);
    expect((await snapshot(page)).score).toBe(2);
});
test('island blocks movement and cannonballs; boundary contains the player', async ({ page }) => {
    await start(page, 'island'); await page.keyboard.down('KeyW'); await page.keyboard.down('Space');
    await advance(page, 700); await page.keyboard.up('Space'); await advance(page, 1000);
    const stopped = await snapshot(page);
    expect(stopped.player.x).toBeLessThanOrEqual(400 - stopped.player.radius);
    expect(stopped.projectiles).toHaveLength(0); await page.keyboard.up('KeyW');
    await start(page, 'boundary'); await page.keyboard.down('KeyW'); await advance(page, 1000);
    expect((await snapshot(page)).player.x).toBeLessThanOrEqual(938); await page.keyboard.up('KeyW');
});
test('chaser moves around an island; shooter respects line of sight', async ({ page }) => {
    await start(page, 'blocked-chaser'); const before = await snapshot(page); await advance(page, 2000);
    const after = await snapshot(page); expect(after.enemies[0].y).not.toBe(before.enemies[0].y);
    expect(after.enemies[0].x < 380 || after.enemies[0].y < 180 || after.enemies[0].y > 360).toBe(true);
    await start(page, 'blocked-shooter'); await advance(page, 100);
    expect((await snapshot(page)).projectiles).toHaveLength(0);
    await start(page, 'shooter'); await advance(page, 1000);
    expect((await snapshot(page)).player.hp).toBeLessThan(100);
});
test('ram damages player, removes chaser and gives no score', async ({ page }) => {
    await start(page, 'ram'); await advance(page, 100); const state = await snapshot(page);
    expect(state.player.hp).toBe(75); expect(state.enemies).toHaveLength(0); expect(state.score).toBe(0);
});
test('normal spawning alternates kinds and avoids initial overlaps', async ({ page }) => {
    await start(page, 'normal'); await advance(page, 3000); const first = await snapshot(page);
    expect(first.enemies[0].kind).toBe('chaser');
    expect(Math.hypot(first.player.x - first.enemies[0].x, first.player.y - first.enemies[0].y)).toBeGreaterThanOrEqual(275);
    await advance(page, 3000); expect((await snapshot(page)).enemies.some((enemy) => enemy.kind === 'shooter')).toBe(true);
});