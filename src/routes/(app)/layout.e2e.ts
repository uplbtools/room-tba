import { expect, test } from '@playwright/test';

test('the desktop bar reserves map space and opens sign in after navigation', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/map');
	await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
	const bar = page.getByRole('banner', { name: 'App navigation' });
	const map = page.locator('.map-container');
	const barBounds = await bar.boundingBox();
	const mapBounds = await map.boundingBox();
	expect(mapBounds!.y).toBeGreaterThanOrEqual(barBounds!.y + barBounds!.height);
	expect(mapBounds!.y + mapBounds!.height).toBeLessThanOrEqual(800);
	await bar.getByRole('link', { name: 'Planner', exact: true }).click();
	await expect(page).toHaveURL(/\/map\/planner\/?$/);
	await bar.getByRole('button', { name: 'Contributor sign in', exact: true }).click();
	await expect(
		page.getByRole('dialog', { name: 'Contributor sign in', exact: true })
	).toBeVisible();
});

test('the phone map keeps the full viewport without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 800 });
	await page.goto('/map');
	await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
	await expect(page.getByRole('banner', { name: 'App navigation' })).toBeHidden();
	const bounds = await page.locator('.map-container').boundingBox();
	expect(bounds).toMatchObject({ x: 0, y: 0, width: 390, height: 800 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('static wiki pages keep their own navigation', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/wiki');
	await expect(page.getByRole('banner', { name: 'App navigation' })).toHaveCount(0);
	await expect(
		page.getByRole('heading', { name: 'The campus details nobody explains' })
	).toBeVisible();
});

test('an editor link opens sign in and removes the handled query parameter', async ({ page }) => {
	await page.goto('/map?editor=login');
	await expect(page.getByRole('dialog', { name: 'Contributor sign in', exact: true })).toBeVisible({
		timeout: 30_000
	});
	await expect(page).toHaveURL(/\/map\/?$/);
});
