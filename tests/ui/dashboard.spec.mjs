import { expect, test } from '@playwright/test';
import { forecastFixture } from '../fixtures/forecast.mjs';
import { geocodingFixture } from '../fixtures/geocoding.mjs';

const moscowFixture = {
  results: [
    {
      id: 524901,
      name: 'Москва',
      latitude: 55.7558,
      longitude: 37.6173,
      country: 'Россия',
      admin1: 'Москва',
      timezone: 'Europe/Moscow',
    },
  ],
};

async function mockGeocoding(page, payload) {
  await page.route('**/geocoding-api.open-meteo.com/**', (route) => route.fulfill({ json: payload }));
}

async function mockForecast(page, payload = forecastFixture) {
  await page.route('**/api.open-meteo.com/**', (route) => route.fulfill({ json: payload }));
}

test('пустой ввод показывает подсказку', async ({ page }) => {
  await page.goto('/');
  await page.fill('#city-input', '');
  await page.click('#search-form button[type="submit"]');
  await expect(page.locator('#status')).toHaveText('Введите название города.');
});

test('ненайденный город показывает понятную ошибку', async ({ page }) => {
  await mockGeocoding(page, {});
  await page.goto('/');
  await page.fill('#city-input', 'Ыыыы');
  await page.click('#search-form button[type="submit"]');
  await expect(page.locator('#status')).toContainText('не найден');
});

test('несколько совпадений: выбор города загружает прогноз', async ({ page }) => {
  await mockGeocoding(page, geocodingFixture);
  await mockForecast(page);
  await page.goto('/');
  await page.fill('#city-input', 'Казань');
  await page.click('#search-form button[type="submit"]');
  const results = page.locator('.result-button');
  await expect(results).toHaveCount(2);
  await results.first().click();
  await expect(page.locator('#dashboard')).toBeVisible();
  await expect(page.locator('#city-title')).toHaveText('Казань, Татарстан, Россия');
  await expect(page.locator('#current')).toContainText('0 °C');
  await expect(page.locator('#local-time')).toContainText('Местное время');
  await expect(page.locator('.hour-card')).toHaveCount(4);
  await expect(page.locator('.day-row')).toHaveCount(7);
});

test('сетевая ошибка прогноза показана честно', async ({ page }) => {
  await mockGeocoding(page, { results: [geocodingFixture.results[0]] });
  await page.route('**/api.open-meteo.com/**', (route) => route.abort('failed'));
  await page.goto('/');
  await page.fill('#city-input', 'Казань');
  await page.click('#search-form button[type="submit"]');
  await expect(page.locator('#status')).toContainText('Ошибка сети');
  await expect(page.locator('#dashboard')).toBeHidden();
});

test('тайм-аут прогноза показан честно', async ({ page }) => {
  test.setTimeout(25000);
  await mockGeocoding(page, { results: [geocodingFixture.results[0]] });
  await page.route('**/api.open-meteo.com/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 11000));
    await route.fulfill({ json: forecastFixture });
  });
  await page.goto('/');
  await page.fill('#city-input', 'Казань');
  await page.click('#search-form button[type="submit"]');
  await expect(page.locator('#status')).toContainText('не ответил вовремя', { timeout: 15000 });
});

test('устаревший поиск отменяется и не перезаписывает новый результат', async ({ page }) => {
  await page.route('**/geocoding-api.open-meteo.com/**', async (route) => {
    const url = route.request().url();
    if (url.includes('%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%8C')) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({ json: geocodingFixture });
      return;
    }
    await route.fulfill({ json: moscowFixture });
  });
  await mockForecast(page);
  await page.goto('/');
  await page.fill('#city-input', 'Казань');
  await page.click('#search-form button[type="submit"]');
  await page.fill('#city-input', 'Москва');
  await page.click('#search-form button[type="submit"]');
  await expect(page.locator('#city-title')).toHaveText('Москва, Москва, Россия', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await expect(page.locator('#city-title')).toHaveText('Москва, Москва, Россия');
});
