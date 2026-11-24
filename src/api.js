export class ApiError extends Error {
  constructor(message, { code = 'api', status, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 10000;

export const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
export const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export async function fetchJson(url, { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const relay = () => controller.abort();
  signal?.addEventListener('abort', relay, { once: true });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new ApiError(`Сервер ответил ${response.status}`, { code: 'http', status: response.status });
    }
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ApiError('Превышено время ожидания ответа', { code: 'timeout', cause: error });
    }
    throw new ApiError('Не удалось связаться с сервисом погоды', { code: 'network', cause: error });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', relay);
  }
}

export async function geocodeCity(name, options = {}) {
  const query = String(name ?? '').trim();
  if (!query) throw new ApiError('Введите название города', { code: 'empty' });

  const url = `${GEOCODING_ENDPOINT}?name=${encodeURIComponent(query)}&count=5&language=ru&format=json`;
  const data = await fetchJson(url, options);
  return Array.isArray(data?.results) ? data.results : [];
}

export async function fetchWeather(latitude, longitude, options = {}) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '7',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  });
  return fetchJson(`${FORECAST_ENDPOINT}?${params}`, options);
}
