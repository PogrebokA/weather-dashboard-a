import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  currentView,
  dailyView,
  formatCityTime,
  hourlyView,
  locationLabel,
  normalizeLocation,
} from '../../src/transform.js';
import { weatherText } from '../../src/weather-codes.js';
import { forecastFixture } from '../fixtures/forecast.mjs';
import { geocodingFixture } from '../fixtures/geocoding.mjs';

test('normalizeLocation и locationLabel собирают подпись города', () => {
  const location = normalizeLocation(geocodingFixture.results[0]);
  assert.equal(location.name, 'Казань');
  assert.equal(location.timezone, 'Europe/Moscow');
  assert.equal(locationLabel(location), 'Казань, Татарстан, Россия');
});

test('currentView возвращает понятные показатели', () => {
  const view = currentView(forecastFixture);
  assert.equal(view.temperature, 0.2);
  assert.equal(view.apparent, -3.1);
  assert.equal(view.humidity, 78);
  assert.equal(view.wind, 3.2);
  assert.equal(view.pressure, 1002);
  assert.equal(view.text, 'Переменная облачность');
  assert.equal(view.isDay, true);
});

test('hourlyView начинается с текущего часа города и ограничивает выдачу', () => {
  const items = hourlyView(forecastFixture, 3);
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.hour), ['17:00', '18:00', '19:00']);
  assert.equal(items[1].precipitationProbability, 0);
  assert.equal(items[2].text, 'Пасмурно');
});

test('dailyView возвращает 7 дней с макс/мин и вероятностью осадков', () => {
  const days = dailyView(forecastFixture);
  assert.equal(days.length, 7);
  assert.equal(days[1].max, 0);
  assert.equal(days[1].min, -2);
  assert.equal(days[1].precipitationProbability, 100);
  assert.equal(days[1].text, 'Сильный снег');
});

test('formatCityTime показывает время в часовом поясе города', () => {
  const text = formatCityTime('Europe/Moscow', new Date('2026-11-23T14:45:00Z'));
  assert.ok(text.includes('17:45'), text);
});

test('weatherText обрабатывает неизвестный код', () => {
  assert.equal(weatherText(0), 'Ясно');
  assert.equal(weatherText(999), 'Неизвестные условия');
});
