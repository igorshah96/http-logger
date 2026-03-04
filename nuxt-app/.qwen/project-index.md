# Project Index: HTTP Logger (Proxy-DevTools)

**Quick Summary:** Real-time HTTP traffic monitoring tool with WebSocket-based live updates. Server accepts HTTP logs via POST, stores in-memory, and broadcasts to clients via WebSocket. Client displays logs in a table with filtering, grouping (BFF + axios), and detailed inspection via slideover panel.

---

## 📁 Complete File Tree

```
nuxt-app/
├── app/                              # Client-side (Nuxt UI v4)
│   ├── assets/
│   │   └── css/main.css              # Global styles (Tailwind v4)
│   ├── components/
│   │   ├── AppLogo.vue               # SVG logo component
│   │   ├── LogDetails.vue            # Slideover panel: Headers, Body, Response tabs
│   │   ├── LogFilters.vue            # Filter panel: search, methods, statuses
│   │   └── TemplateMenu.vue          # Template selector dropdown (legacy)
│   ├── composables/
│   │   ├── useGroupedLogs.ts         # Groups BFF logs with nested axios requests
│   │   ├── useLogFilters.test.ts     # Unit tests for filtering logic
│   │   ├── useLogFilters.ts          # Reactive filters + computed filteredLogs
│   │   └── useLogs.ts                # WebSocket connection via useWebSocket
│   ├── pages/
│   │   └── index.vue                 # Main page: table, filters, slideover
│   ├── utils/
│   │   ├── colors.ts                 # getMethodColor(), getStatusColor()
│   │   ├── format.ts                 # formatTime(), formatDateTime()
│   │   ├── wsProtocol.test.ts        # Unit tests for WS message handling
│   │   └── wsProtocol.ts             # applyLogsServerMessage() handler
│   ├── app.config.ts                 # AppConfig: primary=green, neutral=slate
│   └── app.vue                       # Root: <UApp><UMain><NuxtPage/>
│
├── server/                           # Server-side (Nitro v2, h3 v1)
│   ├── api/
│   │   ├── logs.get.ts               # GET /logs → { status: 'ok' } (health)
│   │   ├── logs.options.ts           # CORS preflight handler
│   │   └── logs.post.ts              # POST /logs: validate, transform, store
│   ├── plugins/
│   │   └── receiver.ts               # Empty plugin (historical)
│   ├── routes/
│   │   └── _ws.ts                    # WebSocket handler (/_ws)
│   └── utils/
│       ├── storage.test.ts           # Unit tests for LogStorage
│       ├── storage.ts                # EventEmitter-based in-memory storage
│       ├── transformers.test.ts      # Unit tests for log transformers
│       └── transformers.ts           # transformLog(): normalizes formats
│
├── shared/                           # Shared types & constants
│   ├── config.ts                     # LOGS_MAX_ITEMS = 1000
│   └── types.ts                      # LogEntry, WsServerMessage, LogFiltersState
│
├── .cursor/
│   ├── rules/
│   │   └── tech-stack.mdc            # Enforces skill usage
│   └── skills/                       # Local skills (nuxt-ui, nuxt, vue, etc.)
│
├── .qwen/
│   ├── agents/                       # Agent configurations
│   ├── output-language.md            # Output language: English
│   └── project-index.md              # THIS FILE
│
├── nuxt.config.ts                    # Nuxt config: modules, nitro.websocket
├── package.json                      # Dependencies, scripts
├── task_code.ts                      # Legacy: CustomLoggerInfo type
├── tsconfig.json                     # TypeScript config
├── PLAN.md                           # Development roadmap (completed stages)
├── QWEN.md                           # Main documentation
└── README.md                         # Starter template readme
```

---

## 🔄 Key Data Flows

### 1. Log Ingestion Flow (POST /logs)
```
External Service → POST /logs (JSON) → logs.post.ts
    ↓
transformLog() (transformers.ts) → normalize to ExternalLogPayload
    ↓
logStorage.addLog() (storage.ts) → store in memory, emit 'logAdded'
    ↓
Return { status: 'ok', id: UUID }
```

### 2. WebSocket Broadcast Flow
```
Client connects to /_ws → _ws.ts handler
    ↓
Send INITIAL_STATE with all logs
    ↓
Subscribe to storage.onLogAdded() → emit LOG_ADDED
    ↓
Subscribe to storage.onLogsCleared() → emit LOGS_CLEARED
```

### 3. Client-Side Log Processing
```
useLogs() → useWebSocket('/_ws')
    ↓
applyLogsServerMessage() (wsProtocol.ts) → update logs ref
    ↓
useLogFilters(logs) → filteredLogs (computed)
    ↓
useGroupedLogs(filteredLogs) → groupedLogs (BFF + axios children)
    ↓
index.vue → UTable displays groupedLogs
```

### 4. Log Grouping (BFF + Axios)
```
LogEntry.meta?.axiosRequests[] → expanded as child rows
    ↓
BFF row (kind: 'bff') → parent log
    ↓
Axios rows (kind: 'axios') → indented children with parent reference
```

---

## 🧩 Component Hierarchy

```
<UApp> (app.vue)
└── <UMain>
    └── <NuxtPage>
        └── index.vue (Main Page)
            ├── LogFilters.vue (v-model: filters)
            ├── UTable (data: groupedLogs)
            │   ├── #method-cell (UBadge + axios indicator)
            │   ├── #status-cell (color-coded)
            │   ├── #url-cell (truncated, indented for axios)
            │   ├── #duration-cell
            │   └── #request-timestamp-cell
            └── LogDetails.vue (v-model:log, axios-log)
                └── <USlideover>
                    └── <UTabs>
                        ├── Headers (request/response)
                        ├── Body (request)
                        ├── Response (body)
                        └── Axios Response (conditional)
```

---

## 📊 Important Constants & Configuration

| Constant | Value | Location |
|----------|-------|----------|
| `LOGS_MAX_ITEMS` | 1000 | `shared/config.ts` |
| `MAX_BODY_BYTES` | 1MB | `server/api/logs.post.ts` |
| Port (dev) | 4443 | `package.json` (npm dev) |
| WebSocket route | `/_ws` | `server/routes/_ws.ts` |
| Logs endpoint | `/logs` | `server/api/logs.post.ts` |
| Primary color | green | `app/app.config.ts` |
| Neutral color | slate | `app/app.config.ts` |

### Environment Variables
| Variable | Purpose |
|----------|---------|
| `HTTP_LOGGER_TOKEN` | Optional auth token for POST /logs (checked via `X-HTTP-LOGGER-TOKEN` header) |

---

## 🏛️ Architecture Patterns

### 1. **In-Memory Storage with EventEmitter**
- `LogStorage` class extends `EventEmitter`
- Methods: `addLog()`, `getLogs()`, `clearLogs()`
- Events: `logAdded`, `logsCleared`
- Unsubscribe pattern: returns cleanup function

### 2. **Transformer Pattern**
- Array of transformers tried in order
- `customLoggerTransformer` → `defaultTransformer` → fallback
- Returns normalized `ExternalLogPayload`

### 3. **Composable Pattern**
- All composables follow `useXxx` naming
- Return reactive refs + computed properties
- Dependencies injected as parameters (e.g., `useLogFilters(logs)`)

### 4. **Explicit Imports**
- No auto-imports (per project rules)
- Components: `import { UTable } from '#components'`
- Types: `import type { LogEntry } from '../../shared/types'`
- Nuxt APIs: `import { useHead } from '#imports'`

### 5. **Type-Safe WebSocket Protocol**
- Union types for messages: `WsServerMessage`, `WsClientMessage`
- Discriminated unions with `type` field
- Type guards in message handlers

---

## 📝 Common Tasks Quick Reference

| Task | Location | Notes |
|------|----------|-------|
| **Add new UI component** | `app/components/MyComponent.vue` | Use PascalCase, import from `#components` |
| **Add new composable** | `app/composables/useXxx.ts` | camelCase with `use` prefix |
| **Add new server route** | `server/api/` or `server/routes/` | Use `defineEventHandler()` |
| **Add new shared type** | `shared/types.ts` | Export interface/type |
| **Add new utility** | `app/utils/` or `server/utils/` | camelCase filename |
| **Modify WS protocol** | `shared/types.ts` + `wsProtocol.ts` | Update both server and client types |
| **Change storage limits** | `shared/config.ts` | Update `LOGS_MAX_ITEMS` |
| **Add filter field** | `LogFiltersState` in `types.ts` + `LogFilters.vue` | Update type and UI |
| **Add table column** | `index.vue` → `columns` array + slot template | Define accessor and custom slot |
| **Write test** | `*.test.ts` alongside source | Use Vitest (`describe`, `it`, `expect`) |

---

## 🔧 Development Commands

```bash
pnpm dev          # Start dev server on port 4443
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm lint         # ESLint check
pnpm lintfix      # Auto-fix ESLint
pnpm typecheck    # TypeScript check
nuxi cleanup      # Clear .nuxt cache
```

---

## 🎯 Key Interfaces & Types

### Core Types (`shared/types.ts`)
```typescript
LogEntry           // Full log with id
ExternalLogPayload // Input format (POST /logs)
WsServerMessage    // Server→Client: INITIAL_STATE | LOG_ADDED | LOGS_CLEARED
WsClientMessage    // Client→Server: CLEAR_LOGS
LogFiltersState    // { search, methods[], statuses[] }
AxiosRequestMeta   // Nested axios call metadata
```

### Composable Return Types
```typescript
useLogs()          // { logs, status, clearLogs }
useLogFilters()    // { filters, filteredLogs }
useGroupedLogs()   // { groupedLogs: GroupedRow[] }
```

### GroupedRow Union (`useGroupedLogs.ts`)
```typescript
BffRow   // { kind: 'bff', log: LogEntry }
AxiosRow // { kind: 'axios', parentId, parent, axios }
```

---

## 🧪 Test Files

| File | Coverage |
|------|----------|
| `server/utils/storage.test.ts` | LogStorage add/clear, event emission |
| `server/utils/transformers.test.ts` | Log format transformation |
| `app/composables/useLogFilters.test.ts` | Filter logic (search, method, status) |
| `app/utils/wsProtocol.test.ts` | WebSocket message handling |

---

## 📚 Skill References

| Task | Skill to Read |
|------|---------------|
| UI components (UButton, UTable) | `.cursor/skills/nuxt-ui/SKILL.md` |
| Server routes, middleware | `.cursor/skills/nuxt/SKILL.md` |
| Vue components, reactivity | `.cursor/skills/vue/SKILL.md` |
| VueUse hooks | `.cursor/skills/vueuse/SKILL.md` |
| Vite configuration | `.cursor/skills/vite/SKILL.md` |
| Nuxt modules | `.cursor/skills/nuxt-modules/SKILL.md` |

**Rule:** Only read the skill relevant to your current task.

---

## 🔍 Quick Debug Tips

1. **WebSocket not connecting?** Check `/_ws` route, verify `nitro.experimental.websocket: true`
2. **Logs not appearing?** Check `useLogs()` status, verify WS messages in browser console
3. **POST /logs failing?** Check `X-HTTP-LOGGER-TOKEN` header if `HTTP_LOGGER_TOKEN` is set
4. **Filters not working?** Verify `LogFiltersState` reactivity, check `filteredLogs` computed
5. **Axios children not showing?** Ensure `log.meta.axiosRequests` array exists

---

**Last Updated:** 2026-03-05  
**Nuxt Version:** 4.3+  
**Nuxt UI Version:** 4.4+
