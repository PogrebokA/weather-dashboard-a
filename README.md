# Weather Dashboard A

Статический погодный дашборд (маршрут A) на HTML/CSS/JavaScript без сборки, сервера приложений и БД. Данные получает из Open-Meteo Geocoding API и Forecast API без ключа.

- **Версия**: 0.1.0
- **Среда выполнения**: OpenCode, модель Big Pickle (`opencode/big-pickle`)
- **Публикация**: https://pogreboka.github.io/weather-dashboard-a/

## Возможности

- Поиск города через Open-Meteo Geocoding.
- Выбор при нескольких совпадениях.
- Текущие условия, почасовой прогноз на 24 часа, прогноз на 7 дней.
- Местное время города (`timezone=auto` от Open-Meteo).
- Обработка пустого ввода, ненайденного города, сетевых ошибок, тайм-аута и отмены устаревших запросов.

## Требования

- Windows 10/11 (основной путь).
- Node.js LTS и npm.
- Git.
- GitHub CLI `gh` для публикации.
- Microsoft Edge для UI-тестов Playwright (`channel: msedge`).

## Быстрый старт (Windows, PowerShell)

```powershell
cd weather-dashboard-a
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
npm.cmd install
npm.cmd run dev
```

Открыть: `http://127.0.0.1:5173`.

> В PowerShell может быть заблокирован `npm.ps1`; используйте `npm.cmd`.

## Команды

| Команда | Назначение |
|---|---|
| `npm.cmd run dev` | Локальный статический сервер |
| `npm.cmd test` | Модульные тесты на фикстурах (`node:test`) |
| `npm.cmd run test:live` | Живой smoke-тест Open-Meteo |
| `npm.cmd run test:ui` | UI-тесты Playwright + Edge |

## Отличия macOS

- Используйте `npm` вместо `npm.cmd`.
- Обычно не нужен ручной пересбор PATH после установки.
- Для UI-тестов можно использовать установленный Chrome/Edge или настроить Playwright-браузер; в текущей конфигурации задан `channel: msedge`.
- Команды shell в документации приведены для PowerShell; в macOS используйте bash/zsh эквиваленты.

## Тесты и ограничения

- Unit/UI тесты используют фикстуры и/или подмену сетевых запросов; они не зависят от живого API.
- `test:live` делает реальные запросы к Open-Meteo и требует интернет.
- UI-тесты проверяют: пустой ввод, ненайденный город, выбор совпадения, сетевую ошибку, тайм-аут, отмену устаревшего поиска.

## Дизайн

- Дизайн-навык: Taste Skill 2.5.1, https://github.com/Leonxlnx/taste-skill, commit `6c0b5c78f5d31776e2210305abaa210cdc0030bf`.
- Локальная копия: `.opencode/skills/design-taste-frontend` (не коммитится).
- Применённые выводы: palette `teal-on-paper`, type `chivo`, radius `soft`.
- Референс: `reference/dashboard-reference.html`.
- Скриншоты до/после: `screenshots/stage1-before-desktop.jpeg`, `screenshots/stage3-after-desktop.png`, `screenshots/stage3-after-mobile.png`.

## Данные и атрибуция

- Погода и геокодирование: [Open-Meteo](https://open-meteo.com/).
- Лицензия данных Open-Meteo: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Проект использует Open-Meteo только в некоммерческих целях в рамках учебного задания.

## Публикация GitHub Pages

```powershell
git init
git add .
git commit -m "Initial weather dashboard"
gh repo create weather-dashboard-a --public --source=. --remote=origin --push
gh api repos/PogrebokA/weather-dashboard-a/pages -X POST -f build_type=legacy -f source[branch]=main -f source[path]=/
```

После включения Pages проверить HTTPS-ссылку в окне/профиле, где нет авторизации автора.
