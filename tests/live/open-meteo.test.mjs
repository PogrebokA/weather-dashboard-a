import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchWeather, geocodeCity } from '../../src/api.js';

const LIVE_TIMEOUT_MS = 30000;

test('живой Open-Meteo: геокодирование Казани', async () => {
  const results = await geocodeCity('Казань', { timeoutMs: LIVE_TIMEOUT_MS });
  assert.ok(results.length > 0);
  assert.ok(results.some((r) => r.name === 'Казань'));
});

test('живой Open-Meteo: прогноз содержит текущие условия и 7 дней', async () => {
  const results = await geocodeCity('Казань', { timeoutMs: LIVE_TIMEOUT_MS });
  const location = results.find((r) => r.admin1 === 'Татарстан') ?? results[0];
  const weather = await fetchWeather(location.latitude, location.longitude, { timeoutMs: LIVE_TIMEOUT_MS });
  assert.equal(typeof weather.current.temperature_2m, 'number');
  assert.equal(weather.daily.time.length, 7);
  assert.ok(weather.hourly.time.length >= 24);
  assert.ok(weather.timezone);
});
