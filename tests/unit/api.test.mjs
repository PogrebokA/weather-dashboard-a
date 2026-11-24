import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, fetchJson, fetchWeather, geocodeCity } from '../../src/api.js';
import { geocodingFixture } from '../fixtures/geocoding.mjs';

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => data };
}

test('fetchJson возвращает JSON при успешном ответе', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ ok: true }));
  const data = await fetchJson('https://example.test/data');
  assert.deepEqual(data, { ok: true });
});

test('fetchJson даёт типизированную ошибку HTTP', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({}, { ok: false, status: 500 }));
  await assert.rejects(
    () => fetchJson('https://example.test/data'),
    (error) => error instanceof ApiError && error.code === 'http' && error.status === 500,
  );
});

test('fetchJson отличает сетевую ошибку', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(
    () => fetchJson('https://example.test/data'),
    (error) => error instanceof ApiError && error.code === 'network',
  );
});

test('fetchJson срабатывает по тайм-ауту', async (t) => {
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  await assert.rejects(
    () => fetchJson('https://example.test/slow', { timeoutMs: 20 }),
    (error) => error instanceof ApiError && error.code === 'timeout',
  );
});

test('fetchJson пробрасывает внешнюю отмену как AbortError', async (t) => {
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  const controller = new AbortController();
  const promise = fetchJson('https://example.test/slow', { signal: controller.signal, timeoutMs: 5000 });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(promise, (error) => error.name === 'AbortError');
});

test('geocodeCity rejects пустой ввод без запроса', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => jsonResponse(geocodingFixture));
  await assert.rejects(
    () => geocodeCity('   '),
    (error) => error instanceof ApiError && error.code === 'empty',
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('geocodeCity кодирует название и возвращает результаты', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url) => {
    assert.ok(String(url).includes('name=%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%8C'));
    return jsonResponse(geocodingFixture);
  });
  const results = await geocodeCity('Казань');
  assert.equal(results.length, 2);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('geocodeCity возвращает пустой список при отсутствии results', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({}));
  const results = await geocodeCity('Ыыыы');
  assert.deepEqual(results, []);
});

test('fetchWeather передаёт координаты и нужные параметры', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.searchParams.get('latitude'), '55.78874');
    assert.equal(parsed.searchParams.get('longitude'), '49.12214');
    assert.equal(parsed.searchParams.get('timezone'), 'auto');
    assert.equal(parsed.searchParams.get('forecast_days'), '7');
    assert.ok(parsed.searchParams.get('current').includes('temperature_2m'));
    assert.ok(parsed.searchParams.get('hourly').includes('precipitation_probability'));
    assert.ok(parsed.searchParams.get('daily').includes('temperature_2m_max'));
    return jsonResponse({ current: {}, hourly: {}, daily: {} });
  });
  await fetchWeather(55.78874, 49.12214);
  assert.equal(fetchMock.mock.callCount(), 1);
});
