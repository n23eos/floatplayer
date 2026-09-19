# Доработки через OpenSpec

OpenSpec 1.13.0 установлен локально как devDependency. Нужен Node.js >=20.19.0.
Установка зависимостей на новом рабочем месте: `npm ci`.
Официальная документация: https://github.com/Fission-AI/OpenSpec.

## Быстрый старт в Codex

Открой новую задачу в этом проекте, чтобы Codex обнаружил `.agents/skills/`.

1. `$openspec-propose Добавить …` — описать доработку; агент подготовит
   proposal, specs, design и tasks в `openspec/changes/<имя>/`.
2. `$openspec-apply-change <имя>` — реализовать задачи и проверить результат.
3. `$openspec-archive-change <имя>` — после завершения перенести изменение
   в архив и обновить основные спецификации.

Если идея ещё не определена: `$openspec-explore`.
Для уточнения существующего изменения: `$openspec-update-change <имя>`.
Можно написать обычным текстом: «Оформи через OpenSpec доработку: …» —
проектный AGENTS.md задаёт тот же процесс.

## Команды терминала

```sh
npm run openspec -- --version
npm run openspec -- list
npm run openspec -- list --specs
npm run openspec -- new change improve-chapters
npm run openspec -- instructions proposal --change improve-chapters
npm run openspec -- status --change improve-chapters
npm run spec:check
```

`new change` создаёт каркас, а не готовые требования. Заполни артефакты через
навык propose или инструкции CLI: proposal → specs → design → tasks.
Команды-примеры не означают, что доработка improve-chapters уже создана.
Для обновления сгенерированных навыков: `npm run openspec -- update`.
Npm-команды отключают телеметрию OpenSpec через OPENSPEC_TELEMETRY=0.

## Что где хранится

- `openspec/config.yaml` — стек, структура проекта, ограничения и правила артефактов.
- `openspec/specs/` — актуальные требования; сейчас описан процесс разработки.
- `openspec/changes/` — незавершённые доработки с планом и задачами.
- `openspec/changes/archive/` — завершённые доработки.
- `.agents/skills/openspec-*/` — сгенерированные навыки для Codex.
- `STATUS.md` — фактическое состояние работы и результаты проверок.

Существующие возможности расширения не объявлены полностью специфицированными.
При первой доработке конкретной возможности сначала проверь её текущий код
и опиши соответствующие требования. Старые записи STATUS.md могут устареть.

## Готовность изменения

Проверь `npm run spec:check`, `npm run check` и `npm test`. Для изменений
расширения выполни `npm run build` (он также запускает check и тесты).
Для UI запусти `npm run preview`, проверь сценарий и осмотри результат.
Отдельно укажи ограничения стенда и непроверенные интеграции живого YouTube.
Обнови задачи и STATUS.md, просмотри diff, затем архивируй готовое изменение.
OpenSpec и навыки не включаются в ZIP: сборка упаковывает только `extension/`.
