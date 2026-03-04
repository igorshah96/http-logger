# HTTP Logger (Proxy-DevTools)

Инструмент для мониторинга HTTP-трафика в реальном времени с веб-интерфейсом.

## Обзор проекта

**Назначение:** Сервер принимает HTTP-логи (Request/Response) и хранит их в памяти. Клиент отображает список запросов через WebSocket, позволяет просматривать детали (Headers, Body, Params) и фильтровать логи.

**Архитектура:**
- **Сервер (Nitro):** Принимает POST-запросы на `/logs`, хранит данные в in-memory хранилище, рассылает обновления через WebSocket (`/_ws`)
- **Клиент (Nuxt UI v4):** Отображает таблицу логов, детали запроса в боковой панели (USlideover), фильтрацию по URL/методам/status-кодам
- **Группировка:** BFF-запросы отображаются как родительские строки, axios-вызовы — как вложенные (indented под родительским BFF)

## Технологический стек

| Категория | Технологии |
|-----------|------------|
| **Фреймворк** | Nuxt 4.3+ (Nitro v2, h3 v1) |
| **UI** | Nuxt UI v4 (Reka UI + Tailwind CSS v4) |
| **Язык** | TypeScript (строгая типизация) |
| **Реактивность** | Vue 3 + VueUse (`useWebSocket`) |
| **Сборка** | Vite |
| **Пакетный менеджер** | pnpm |

## Структура проекта

```
nuxt-app/
├── app/                      # Клиентская часть
│   ├── components/           # UI-компоненты
│   │   ├── LogDetails.vue    # Боковая панель с деталями запроса
│   │   ├── LogFilters.vue    # Панель фильтров (search, methods, statuses)
│   │   ├── AppLogo.vue
│   │   └── TemplateMenu.vue
│   ├── composables/          # Композаблы
│   │   ├── useLogs.ts        # WebSocket-подключение, управление логами
│   │   ├── useLogFilters.ts  # Фильтрация логов
│   │   └── useGroupedLogs.ts # Группировка BFF + axios запросы
│   ├── pages/
│   │   └── index.vue         # Главная страница с таблицей
│   ├── utils/
│   │   ├── colors.ts         # Цвета для методов/status-кодов
│   │   ├── format.ts         # Форматирование времени
│   │   └── wsProtocol.ts     # Обработка WS-сообщений
│   └── app.vue               # Корневой компонент (<UApp>)
├── server/                   # Серверная часть (Nitro)
│   ├── api/
│   │   ├── logs.get.ts       # Health-check эндпоинт
│   │   ├── logs.post.ts      # Приём логов (POST /logs)
│   │   └── logs.options.ts   # CORS preflight
│   ├── plugins/
│   │   └── receiver.ts       # Пустой плагин (исторически)
│   ├── routes/
│   │   └── _ws.ts            # WebSocket handler (/_ws)
│   └── utils/
│       ├── storage.ts        # In-memory хранилище (EventEmitter)
│       └── transformers.ts   # Нормализация форматов логов
├── shared/                   # Общие типы и конфиги
│   ├── types.ts              # Контракты данных (LogEntry, WsServerMessage)
│   └── config.ts             # Константы (LOGS_MAX_ITEMS = 1000)
└── task_code.ts              # Legacy-типы (CustomLoggerInfo)
```

## Контракты данных

### Входной формат (POST /logs)
```typescript
interface ExternalLogPayload {
  format?: 'custom-logger' | 'external-log' | 'fallback'
  method: string
  url: string
  status: number
  duration: number
  request: {
    headers: Record<string, string>
    query: Record<string, unknown>
    body: unknown
    timestamp: number
  }
  response: {
    headers: Record<string, string>
    body: unknown
    timestamp: number
  }
  userId?: string
  traceId?: string
  bffPath?: string
  source?: string
  meta?: {
    logDetails?: Array<string | Record<string, unknown>>
    axiosRequests?: Array<AxiosRequestMeta>
  }
}
```

### WebSocket протокол
```typescript
// Сервер → Клиент
type WsServerMessage =
  | { type: 'LOG_ADDED', payload: LogEntry }
  | { type: 'LOGS_CLEARED' }
  | { type: 'INITIAL_STATE', payload: LogEntry[] }

// Клиент → Сервер
type WsClientMessage = { type: 'CLEAR_LOGS' }
```

## Сборка и запуск

```bash
# Установка зависимостей
npm install

# Разработка (порт 4443)
npm dev

# Продакшен-сборка
npm build

# Локальный превью продакшен-сборки
npm preview --port 4443

# Очистка кэша
npm clear

# Линтинг
npm lint        # Проверка
npm lintfix     # Авто-исправление

# Проверка типов
npm typecheck
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `HTTP_LOGGER_TOKEN` | Опциональный токен для авторизации POST /logs (проверка по заголовку `X-HTTP-LOGGER-TOKEN`) |

## API

### POST /logs
Приём лога. Тело запроса — `ExternalLogPayload`.

**Заголовки:**
- `X-HTTP-LOGGER-TOKEN` — требуется, если задан `HTTP_LOGGER_TOKEN`

**Ответы:**
- `201` — `{ status: 'ok', id: string }`
- `400` — Invalid JSON
- `413` — Payload too large (>1MB)
- `401` — Unauthorized (неверный токен)

**Пример запроса (curl):**
```bash
curl -X POST http://localhost:4443/logs \
  -H "Content-Type: application/json" \
  -H "X-HTTP-LOGGER-TOKEN: your-token" \
  -d '{
    "method": "GET",
    "url": "/api/users",
    "status": 200,
    "duration": 42,
    "request": {
      "headers": { "accept": "application/json" },
      "query": { "page": "1" },
      "body": null,
      "timestamp": 1709568000000
    },
    "response": {
      "headers": { "content-type": "application/json" },
      "body": { "data": [] },
      "timestamp": 1709568000042
    }
  }'
```

### GET /logs
Health-check. Возвращает `{ status: 'ok' }`.

### WebSocket /_ws
Подключение для real-time обновлений. Автоматически отправляет `INITIAL_STATE` при подключении.

## Разработка

### Конвенции

**Именование:**
- Компоненты: PascalCase (`LogDetails.vue`)
- Композаблы: camelCase с префиксом `use` (`useLogs.ts`)
- Утилиты: camelCase (`colors.ts`, `format.ts`)

**Стиль кода:**
- Prettier: `printWidth: 140`, `singleQuote: true`, `trailingComma: 'all'`
- ESLint: базовая конфигурация Nuxt
- TypeScript: строгая типизация, явные импорты из `#components` и `#imports`

**Импорты:**
```typescript
// Компоненты Nuxt UI
import { UButton, UTable, UBadge } from '#components'

// Композаблы Nuxt
import { useHead, useSeoMeta } from '#imports'

// Общие типы
import type { LogEntry } from '../../shared/types'
```

### Тестирование
Тесты покрывают критичную логику:
- `server/utils/storage.test.ts` — хранилище логов
- `server/utils/transformers.test.ts` — трансформеры форматов
- `app/composables/useLogFilters.test.ts` — фильтрация

## Ключевые файлы для ознакомления

| Файл | Описание |
|------|----------|
| `shared/types.ts` | Контракты данных (LogEntry, WsServerMessage, WsClientMessage) |
| `server/utils/storage.ts` | In-memory хранилище с EventEmitter (addLog, getLogs, clearLogs) |
| `server/utils/transformers.ts` | Нормализация разных форматов логов в ExternalLogPayload |
| `server/api/logs.post.ts` | Обработчик POST /logs (валидация, трансформация, сохранение) |
| `server/routes/_ws.ts` | WebSocket handler (рассылка INITIAL_STATE, LOG_ADDED, LOGS_CLEARED) |
| `app/composables/useLogs.ts` | Клиентское WS-подключение через useWebSocket |
| `app/composables/useGroupedLogs.ts` | Группировка: BFF-запрос + вложенные axios-вызовы в плоский список строк |
| `app/pages/index.vue` | Главная страница (таблица, фильтры, slideover) |

## План разработки

См. `PLAN.md` — этапы реализации, чеклист функциональности, инструкция для AI-ассистентов.

## Навигация по скиллам

Проект использует локальные скиллы в `.cursor/skills/`. **Читай только нужный скилл под задачу:**

| Задача | Скилл | Когда открывать |
|--------|-------|-----------------|
| UI-компоненты (UButton, UTable, формы) | `nuxt-ui/SKILL.md` | Создание/редактирование UI |
| Серверные роуты, middleware, плагины | `nuxt/SKILL.md` | Работа с `server/` |
| `.vue` компоненты, реактивность | `vue/SKILL.md` | Логика компонентов |
| VueUse хуки (useWebSocket, useLocalStorage) | `vueuse/SKILL.md` | Использование готовых композаблов |
| Vite-конфиг, плагины, сборка | `vite/SKILL.md` | Изменение `vite.config.ts` |
| Создание Nuxt-модулей | `nuxt-modules/SKILL.md` | Расширение фреймворка |

**Правило:** Не читай все скиллы сразу. Открывай только тот, который соответствует текущей задаче.

## Лицензия

MIT (см. `LICENSE`)
