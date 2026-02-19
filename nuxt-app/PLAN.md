# План разработки: Proxy-DevTools

## 1. Цели и задачи
Создание инструмента для мониторинга HTTP-трафика (прокси-логгера).
- **Сервер:** Принимает данные (Request/Response) на порту 4444 и хранит их в памяти.
- **Клиент:** Отображает список запросов в реальном времени через WebSocket, позволяет просматривать детали (Headers, Body, Params).

## 2. Технологический стек
- **Nuxt 4** (Nitro v2, h3 v1)
- **Nuxt UI v4** (Tailwind CSS, семантические цвета, `<UApp>`)
- **TypeScript** (строгая типизация)
- **WebSockets** (для связи клиента с BFF)

## 3. Проектирование типов данных (Contract)

### Внешняя среда -> BFF (HTTP POST :4444)
```typescript
export interface ExternalLogPayload {
  method: string;
  url: string;
  status: number;
  duration: number;
  request: {
    headers: Record<string, string>;
    query: Record<string, any>;
    body: any;
    timestamp: number;
  };
  response: {
    headers: Record<string, string>;
    body: any;
    timestamp: number;
  };
}
```

### BFF -> Клиент (WebSocket)
```typescript
export interface LogEntry extends ExternalLogPayload {
  id: string; // UUID или инкремент, генерируется сервером
}

export type WsServerMessage = 
  | { type: 'LOG_ADDED'; payload: LogEntry }
  | { type: 'LOGS_CLEARED' }
  | { type: 'INITIAL_STATE'; payload: LogEntry[] };
```

## 4. Этапы реализации

- [ ] **Этап 1: Контракт данных (Типы)**
  - Создание файла `shared/types.ts` с интерфейсами.
  - *Что проверить:* Отсутствие ошибок типизации в IDE.

- [ ] **Этап 2: Сервер-приемник (Port 4444)**
  - Реализация `server/utils/storage.ts` (in-memory).
  - Реализация Nitro плагина `server/plugins/receiver.ts` (node:http сервер на 4444).
  - *Что проверить:* Отправить POST на `localhost:4444`, увидеть лог в консоли сервера.

- [ ] **Этап 3: WebSocket мост**
  - Реализация `server/routes/_ws.ts` (h3 WebSocket handler).
  - Связь приемника с сокетом для рассылки сообщений.
  - *Что проверить:* Подключение к `ws://localhost:3000/_ws` через любой WS-клиент.

- [ ] **Этап 4: Клиент — Основная таблица**
  - Подключение `useWebSocket` (VueUse).
  - Верстка таблицы `<UTable>` по стандартам Nuxt UI v4.
  - *Что проверить:* При отправке POST на 4444 данные автоматически появляются в таблице в браузере.

- [ ] **Этап 5: Клиент — Детали запроса**
  - Реализация `<USlideover>` для боковой панели.
  - Вкладки `<UTabs>` для Headers, Payload, Response.
  - *Что проверить:* Клик по строке таблицы открывает панель с полными данными.

## 5. Инструкция по сохранению контекста для следующих чатов
> **ВАЖНО для AI-ассистента:**
> 1. Перед началом работы прочитай этот файл `PLAN.md`.
> 2. Следуй правилам в `.cursor/rules/tech-stack.mdc`.
> 3. Используй скиллы из `.cursor/skills/` (Nuxt UI v4, Nuxt 4).
> 4. Все новые типы добавляй в `shared/types.ts`.
> 5. Не используй автоимпорты (согласно правилам проекта).
> 6. Обновляй статус этапов в этом файле после каждого шага.
