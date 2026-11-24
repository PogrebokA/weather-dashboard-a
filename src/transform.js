import { weatherText } from './weather-codes.js';

export function normalizeLocation(raw) {
  return {
    id: raw.id,
    name: raw.name,
    admin1: raw.admin1 ?? '',
    country: raw.country ?? '',
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
  };
}

export function locationLabel(location) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(', ');
}

export function currentView(weather) {
  const c = weather.current;
  return {
    time: c.time,
    temperature: c.temperature_2m,
    apparent: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    wind: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    pressure: c.surface_pressure,
    precipitation: c.precipitation,
    code: c.weather_code,
    text: weatherText(c.weather_code),
    isDay: c.is_day === 1,
  };
}

export function hourlyView(weather, count = 24) {
  const h = weather.hourly;
  const found = h.time.findIndex((t) => t >= weather.current.time);
  const from = found < 0 ? 0 : found;
  return h.time.slice(from, from + count).map((time, i) => {
    const index = from + i;
    return {
      time,
      hour: time.slice(11, 16),
      temperature: h.temperature_2m[index],
      precipitationProbability: h.precipitation_probability?.[index] ?? null,
      code: h.weather_code[index],
      text: weatherText(h.weather_code[index]),
    };
  });
}

export function dailyView(weather) {
  const d = weather.daily;
  return d.time.map((date, i) => ({
    date,
    label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
      .format(new Date(`${date}T00:00`)),
    code: d.weather_code[i],
    text: weatherText(d.weather_code[i]),
    max: d.temperature_2m_max[i],
    min: d.temperature_2m_min[i],
    precipitationProbability: d.precipitation_probability_max?.[i] ?? null,
    sunrise: d.sunrise?.[i],
    sunset: d.sunset?.[i],
  }));
}

export function formatCityTime(timeZone, date = new Date()) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
