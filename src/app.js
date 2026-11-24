import { ApiError, fetchWeather, geocodeCity } from './api.js';
import {
  currentView,
  dailyView,
  formatCityTime,
  hourlyView,
  locationLabel,
  normalizeLocation,
} from './transform.js';

const form = document.querySelector('#search-form');
const input = document.querySelector('#city-input');
const statusEl = document.querySelector('#status');
const resultsEl = document.querySelector('#results');
const dashboardEl = document.querySelector('#dashboard');
const cityTitleEl = document.querySelector('#city-title');
const localTimeEl = document.querySelector('#local-time');
const currentEl = document.querySelector('#current');
const hourlyEl = document.querySelector('#hourly');
const dailyEl = document.querySelector('#daily');

let searchController = null;
let weatherController = null;
let activeLocation = null;
let clockTimer = null;

function setStatus(message, kind = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.kind = kind;
  statusEl.hidden = !message;
}

function messageForError(error) {
  if (error instanceof ApiError) {
    if (error.code === 'timeout') return 'Сервис погоды не ответил вовремя. Попробуйте ещё раз.';
    if (error.code === 'network') return 'Ошибка сети. Проверьте подключение и повторите запрос.';
    if (error.code === 'http') return `Сервис погоды вернул ошибку (${error.status}). Попробуйте позже.`;
    if (error.code === 'empty') return error.message;
  }
  return 'Не удалось получить данные. Попробуйте ещё раз.';
}

function hideDashboard() {
  dashboardEl.hidden = true;
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

function renderResults(locations) {
  resultsEl.replaceChildren();
  const list = document.createElement('ul');
  list.className = 'results-list';
  for (const raw of locations) {
    const location = normalizeLocation(raw);
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-button';
    button.textContent = locationLabel(location);
    button.addEventListener('click', () => loadWeather(location));
    item.append(button);
    list.append(item);
  }
  resultsEl.append(list);
}

function renderCurrent(view) {
  currentEl.replaceChildren();
  const main = document.createElement('div');
  main.className = 'current-main';
  const temp = document.createElement('p');
  temp.className = 'current-temp';
  temp.textContent = `${Math.round(view.temperature)} °C`;
  const description = document.createElement('p');
  description.className = 'current-text';
  description.textContent = view.text;
  main.append(temp, description);

  const details = document.createElement('dl');
  details.className = 'current-details';
  const rows = [
    ['Ощущается как', `${Math.round(view.apparent)} °C`],
    ['Влажность', `${view.humidity} %`],
    ['Ветер', `${Math.round(view.wind)} км/ч`],
    ['Давление', `${Math.round(view.pressure)} гПа`],
    ['Осадки', `${view.precipitation} мм`],
  ];
  for (const [term, value] of rows) {
    const fact = document.createElement('div');
    fact.className = 'fact';
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    fact.append(dt, dd);
    details.append(fact);
  }
  currentEl.append(main, details);
}

function renderHourly(items) {
  hourlyEl.replaceChildren();
  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'hour-card';
    const hour = document.createElement('span');
    hour.className = 'hour-time';
    hour.textContent = item.hour;
    const temp = document.createElement('span');
    temp.className = 'hour-temp';
    temp.textContent = `${Math.round(item.temperature)} °C`;
    const text = document.createElement('span');
    text.className = 'hour-text';
    text.textContent = item.text;
    const precip = document.createElement('span');
    precip.className = 'hour-precip';
    precip.textContent = item.precipitationProbability == null ? '' : `${item.precipitationProbability} %`;
    card.append(hour, temp, text, precip);
    hourlyEl.append(card);
  }
}

function renderDaily(items) {
  dailyEl.replaceChildren();
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'day-row';
    const date = document.createElement('span');
    date.className = 'day-date';
    date.textContent = item.label;
    const text = document.createElement('span');
    text.className = 'day-text';
    text.textContent = item.text;
    const temps = document.createElement('span');
    temps.className = 'day-temps';
    temps.textContent = `${Math.round(item.max)} / ${Math.round(item.min)} °C`;
    const precip = document.createElement('span');
    precip.className = 'day-precip';
    precip.textContent = item.precipitationProbability == null ? '' : `${item.precipitationProbability} %`;
    li.append(date, text, temps, precip);
    dailyEl.append(li);
  }
}

function startClock(timeZone) {
  if (clockTimer) clearInterval(clockTimer);
  const tick = () => {
    localTimeEl.textContent = `Местное время: ${formatCityTime(timeZone)}`;
  };
  tick();
  clockTimer = setInterval(tick, 30000);
}

function renderWeather(location, weather) {
  activeLocation = location;
  cityTitleEl.textContent = locationLabel(location);
  renderCurrent(currentView(weather));
  renderHourly(hourlyView(weather));
  renderDaily(dailyView(weather));
  dashboardEl.hidden = false;
  startClock(weather.timezone || location.timezone);
}

async function loadWeather(location) {
  weatherController?.abort();
  weatherController = new AbortController();
  setStatus('Загружаем прогноз…');
  try {
    const weather = await fetchWeather(location.latitude, location.longitude, {
      signal: weatherController.signal,
    });
    renderWeather(location, weather);
    setStatus('');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    hideDashboard();
    setStatus(messageForError(error), 'error');
  } finally {
    weatherController = null;
  }
}

async function handleSearch(event) {
  event.preventDefault();
  const query = input.value.trim();
  resultsEl.replaceChildren();
  hideDashboard();

  if (!query) {
    setStatus('Введите название города.', 'error');
    return;
  }

  searchController?.abort();
  weatherController?.abort();
  searchController = new AbortController();
  setStatus('Ищем город…');

  try {
    const locations = await geocodeCity(query, { signal: searchController.signal });
    if (locations.length === 0) {
      setStatus(`Город «${query}» не найден. Проверьте название.`, 'error');
      return;
    }
    renderResults(locations);
    if (locations.length === 1) {
      setStatus('Город найден. Загружаем прогноз…');
      await loadWeather(normalizeLocation(locations[0]));
    } else {
      setStatus('Найдено несколько совпадений — выберите город.');
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setStatus(messageForError(error), 'error');
  } finally {
    searchController = null;
  }
}

form.addEventListener('submit', handleSearch);
setStatus('Введите город и нажмите «Найти».');
