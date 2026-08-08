# Lista compra PWA (PIN hogar) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una PWA de lista de la compra compartida por PIN de 6 dígitos, con sync en tiempo casi real, texto libre + sugerencias Mercadona, y caché offline.

**Architecture:** Cliente Vite/React/TS con IndexedDB local; Firestore (Firebase) guarda `households/{pin}/items/{id}`; el PIN es la clave del hogar sin cuentas; búsqueda de productos vía Algolia (credenciales embebidas del frontend de Mercadona) con fallback a texto libre.

**Tech Stack:** Vite 6, React 19, TypeScript, Vitest, idb, Firebase JS SDK, vite-plugin-pwa, CSS modules o CSS variables propias (sin Inter/Roboto como UI principal).

## Global Constraints

- Un hogar = una lista plana; acceso solo por PIN de 6 dígitos.
- Ítem: `name` + `quantity` + `note` + `done` + `productId` opcional.
- Conflictos: last-write-wins por `updatedAt`.
- Catálogo Mercadona no oficial: si falla, texto libre sigue funcionando.
- Tickets de correo / WhatsApp sync: fuera de este plan (fase 2).
- Windows PowerShell: rutas con espacios entre comillas; no asumir `bash`/`make`.
- Commits solo cuando el usuario lo pida explícitamente (salvo que indique lo contrario en la sesión de ejecución).

---

## File map

```
docs/superpowers/specs/2026-08-08-lista-compra-pwa-design.md  (ya existe)
docs/superpowers/plans/2026-08-08-lista-compra-pwa.md          (este plan)
.gitignore
.env.example
package.json
vite.config.ts
index.html
public/icons/icon-192.png
public/icons/icon-512.png
src/main.tsx
src/App.tsx
src/styles/tokens.css
src/styles/app.css
src/domain/types.ts
src/domain/pin.ts
src/domain/merge.ts
src/domain/deviceId.ts
src/data/localDb.ts
src/data/sync.ts
src/data/firebaseSync.ts
src/data/mercadonaSearch.ts
src/hooks/useHousehold.ts
src/hooks/useShoppingList.ts
src/components/WelcomeScreen.tsx
src/components/ListScreen.tsx
src/components/ItemRow.tsx
src/components/AddBar.tsx
src/components/EditItemSheet.tsx
src/components/SyncBadge.tsx
src/vite-env.d.ts
src/domain/pin.test.ts
src/domain/merge.test.ts
src/data/localDb.test.ts
src/data/mercadonaSearch.test.ts
firestore.rules
```

---

### Task 1: Scaffold Vite + React + TS + Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `.env.example`, `.gitignore` (actualizar)
- Test: smoke via `npm run test` y `npm run build`

**Interfaces:**
- Consumes: nada
- Produces: app Vite arrancable; scripts `dev`, `build`, `test`, `preview`

- [ ] **Step 1: Inicializar git si no existe**

```powershell
cd "C:\@MIS PROYECTOS\MERCADONA"
git init
```

Expected: repositorio creado (`.git/`).

- [ ] **Step 2: Crear proyecto Vite React-TS en la raíz**

Si la carpeta no está vacía (docs/), crear archivos a mano o:

```powershell
npm create vite@latest . -- --template react-ts
```

Si el CLI se queja por archivos existentes, generar `package.json` / Vite manualmente con dependencias:

```json
{
  "name": "lista-compra-pwa",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Dependencias: `react`, `react-dom`.  
Dev: `vite`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.

- [ ] **Step 3: Configurar Vitest en `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Añadir `.env.example`**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ALGOLIA_APP_ID=7UZJKL1DJ0
VITE_ALGOLIA_SEARCH_KEY=
VITE_ALGOLIA_INDEX_PREFIX=products_prod_
VITE_DEFAULT_WAREHOUSE=mad1
```

- [ ] **Step 5: Verificar**

```powershell
npm install
npm run test
npm run build
```

Expected: tests vacíos/ok o 0 tests; build sin error.

- [ ] **Step 6: Commit solo si el usuario lo pide**

No hacer commit automático.

---

### Task 2: Dominio — PIN, deviceId, merge LWW

**Files:**
- Create: `src/domain/types.ts`, `src/domain/pin.ts`, `src/domain/deviceId.ts`, `src/domain/merge.ts`
- Test: `src/domain/pin.test.ts`, `src/domain/merge.test.ts`

**Interfaces:**
- Produces:
  - `export type ShoppingItem = { id: string; name: string; quantity: string; note: string; done: boolean; productId: string | null; updatedAt: number; updatedBy: string }`
  - `export type Household = { pin: string; createdAt: number; name?: string }`
  - `export function normalizePin(input: string): string`
  - `export function isValidPin(pin: string): boolean`
  - `export function generatePin(): string`
  - `export function getOrCreateDeviceId(): string`
  - `export function mergeItems(local: ShoppingItem[], remote: ShoppingItem[]): ShoppingItem[]`

- [ ] **Step 1: Escribir tests de PIN**

```ts
// src/domain/pin.test.ts
import { describe, expect, it } from 'vitest'
import { generatePin, isValidPin, normalizePin } from './pin'

describe('pin', () => {
  it('normaliza quitando espacios y no dígitos', () => {
    expect(normalizePin(' 48-29 10 ')).toBe('482910')
  })

  it('valida exactamente 6 dígitos', () => {
    expect(isValidPin('482910')).toBe(true)
    expect(isValidPin('48291')).toBe(false)
    expect(isValidPin('48291a')).toBe(false)
  })

  it('generatePin produce 6 dígitos', () => {
    const pin = generatePin()
    expect(pin).toMatch(/^\d{6}$/)
  })
})
```

- [ ] **Step 2: Run — debe fallar**

```powershell
npm run test -- src/domain/pin.test.ts
```

Expected: FAIL (módulo no encontrado).

- [ ] **Step 3: Implementar `types.ts` + `pin.ts`**

```ts
// src/domain/types.ts
export type ShoppingItem = {
  id: string
  name: string
  quantity: string
  note: string
  done: boolean
  productId: string | null
  updatedAt: number
  updatedBy: string
}

export type Household = {
  pin: string
  createdAt: number
  name?: string
}

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error'
```

```ts
// src/domain/pin.ts
export function normalizePin(input: string): string {
  return input.replace(/\D/g, '')
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

export function generatePin(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return String(n).padStart(6, '0')
}
```

- [ ] **Step 4: Tests merge LWW**

```ts
// src/domain/merge.test.ts
import { describe, expect, it } from 'vitest'
import { mergeItems } from './merge'
import type { ShoppingItem } from './types'

const base = (over: Partial<ShoppingItem>): ShoppingItem => ({
  id: '1',
  name: 'Leche',
  quantity: '1',
  note: '',
  done: false,
  productId: null,
  updatedAt: 100,
  updatedBy: 'a',
  ...over,
})

describe('mergeItems', () => {
  it('elige la versión con updatedAt mayor', () => {
    const local = [base({ name: 'Local', updatedAt: 100 })]
    const remote = [base({ name: 'Remote', updatedAt: 200 })]
    expect(mergeItems(local, remote)[0]!.name).toBe('Remote')
  })

  it('une ids distintos', () => {
    const local = [base({ id: '1' })]
    const remote = [base({ id: '2', name: 'Pan' })]
    expect(mergeItems(local, remote)).toHaveLength(2)
  })
})
```

- [ ] **Step 5: Implementar `merge.ts` + `deviceId.ts`**

```ts
// src/domain/merge.ts
import type { ShoppingItem } from './types'

export function mergeItems(local: ShoppingItem[], remote: ShoppingItem[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>()
  for (const item of [...local, ...remote]) {
    const prev = map.get(item.id)
    if (!prev || item.updatedAt > prev.updatedAt) map.set(item.id, item)
  }
  return [...map.values()]
}
```

```ts
// src/domain/deviceId.ts
const KEY = 'lista.deviceId'

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
```

- [ ] **Step 6: Run tests**

```powershell
npm run test -- src/domain
```

Expected: PASS.

---

### Task 3: IndexedDB local

**Files:**
- Create: `src/data/localDb.ts`
- Test: `src/data/localDb.test.ts`

**Interfaces:**
- Consumes: `ShoppingItem`, `Household` from `src/domain/types.ts`
- Produces:
  - `export async function saveSession(pin: string): Promise<void>`
  - `export async function loadSession(): Promise<string | null>`
  - `export async function clearSession(): Promise<void>`
  - `export async function putItems(pin: string, items: ShoppingItem[]): Promise<void>`
  - `export async function getItems(pin: string): Promise<ShoppingItem[]>`

- [ ] **Step 1: Instalar idb + fake-indexeddb para tests**

```powershell
npm install idb
npm install -D fake-indexeddb
```

- [ ] **Step 2: Test localDb**

```ts
// src/data/localDb.test.ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, getItems, loadSession, putItems, saveSession } from './localDb'

beforeEach(async () => {
  indexedDB.deleteDatabase('lista-compra')
})

describe('localDb', () => {
  it('persiste sesión PIN', async () => {
    await saveSession('123456')
    expect(await loadSession()).toBe('123456')
    await clearSession()
    expect(await loadSession()).toBeNull()
  })

  it('persiste ítems por PIN', async () => {
    await putItems('123456', [
      {
        id: 'a',
        name: 'Pan',
        quantity: '1',
        note: '',
        done: false,
        productId: null,
        updatedAt: 1,
        updatedBy: 'dev',
      },
    ])
    const items = await getItems('123456')
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Pan')
  })
})
```

- [ ] **Step 3: Run — FAIL**

```powershell
npm run test -- src/data/localDb.test.ts
```

- [ ] **Step 4: Implementar `localDb.ts`**

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ShoppingItem } from '../domain/types'

interface ListaDb extends DBSchema {
  meta: { key: string; value: string }
  items: { key: string; value: { pin: string; items: ShoppingItem[] } }
}

let dbPromise: Promise<IDBPDatabase<ListaDb>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<ListaDb>('lista-compra', 1, {
      upgrade(database) {
        database.createObjectStore('meta')
        database.createObjectStore('items', { keyPath: 'pin' })
      },
    })
  }
  return dbPromise
}

export async function saveSession(pin: string): Promise<void> {
  await (await db()).put('meta', pin, 'pin')
}

export async function loadSession(): Promise<string | null> {
  return (await (await db()).get('meta', 'pin')) ?? null
}

export async function clearSession(): Promise<void> {
  await (await db()).delete('meta', 'pin')
}

export async function putItems(pin: string, items: ShoppingItem[]): Promise<void> {
  await (await db()).put('items', { pin, items })
}

export async function getItems(pin: string): Promise<ShoppingItem[]> {
  const row = await (await db()).get('items', pin)
  return row?.items ?? []
}
```

- [ ] **Step 5: Run — PASS**

```powershell
npm run test -- src/data/localDb.test.ts
```

---

### Task 4: Capa sync (contrato + Firebase)

**Files:**
- Create: `src/data/sync.ts`, `src/data/firebaseSync.ts`, `firestore.rules`
- Modify: `.env.example` (ya creado)

**Interfaces:**
- Produces:
  - `export type ListSync = { createHousehold(pin: string): Promise<void>; joinHousehold(pin: string): Promise<boolean>; subscribeItems(pin: string, onChange: (items: ShoppingItem[]) => void): () => void; upsertItem(pin: string, item: ShoppingItem): Promise<void>; deleteItem(pin: string, id: string): Promise<void> }`
  - `export function createFirebaseSync(): ListSync`
  - `export function createMemorySync(): ListSync` (para tests/dev sin Firebase)

- [ ] **Step 1: Instalar Firebase**

```powershell
npm install firebase
```

- [ ] **Step 2: Definir contrato + memory sync en `sync.ts`**

```ts
import type { ShoppingItem } from '../domain/types'

export type ListSync = {
  createHousehold(pin: string): Promise<void>
  joinHousehold(pin: string): Promise<boolean>
  subscribeItems(pin: string, onChange: (items: ShoppingItem[]) => void): () => void
  upsertItem(pin: string, item: ShoppingItem): Promise<void>
  deleteItem(pin: string, id: string): Promise<void>
}

/** Sync en memoria para desarrollo/tests sin credenciales Firebase. */
export function createMemorySync(): ListSync {
  const households = new Map<string, Map<string, ShoppingItem>>()
  const listeners = new Map<string, Set<(items: ShoppingItem[]) => void>>()

  function emit(pin: string) {
    const items = [...(households.get(pin)?.values() ?? [])]
    for (const cb of listeners.get(pin) ?? []) cb(items)
  }

  return {
    async createHousehold(pin) {
      if (!households.has(pin)) households.set(pin, new Map())
    },
    async joinHousehold(pin) {
      return households.has(pin)
    },
    subscribeItems(pin, onChange) {
      if (!listeners.has(pin)) listeners.set(pin, new Set())
      listeners.get(pin)!.add(onChange)
      onChange([...(households.get(pin)?.values() ?? [])])
      return () => listeners.get(pin)?.delete(onChange)
    },
    async upsertItem(pin, item) {
      if (!households.has(pin)) households.set(pin, new Map())
      households.get(pin)!.set(item.id, item)
      emit(pin)
    },
    async deleteItem(pin, id) {
      households.get(pin)?.delete(id)
      emit(pin)
    },
  }
}
```

- [ ] **Step 3: Implementar `firebaseSync.ts`**

```ts
import { initializeApp } from 'firebase/app'
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore'
import type { ListSync } from './sync'
import type { ShoppingItem } from '../domain/types'

export function createFirebaseSync(): ListSync {
  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  const db = getFirestore(app)

  return {
    async createHousehold(pin) {
      await setDoc(doc(db, 'households', pin), { pin, createdAt: Date.now() })
    },
    async joinHousehold(pin) {
      const snap = await getDoc(doc(db, 'households', pin))
      return snap.exists()
    },
    subscribeItems(pin, onChange) {
      return onSnapshot(collection(db, 'households', pin, 'items'), (snap) => {
        const items = snap.docs.map((d) => d.data() as ShoppingItem)
        onChange(items)
      })
    },
    async upsertItem(pin, item) {
      await setDoc(doc(db, 'households', pin, 'items', item.id), item)
    },
    async deleteItem(pin, id) {
      await deleteDoc(doc(db, 'households', pin, 'items', id))
    },
  }
}
```

- [ ] **Step 4: `firestore.rules` (MVP familiar — PIN = secreto)**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{pin} {
      allow read, write: if pin.matches('^[0-9]{6}$');
      match /items/{itemId} {
        allow read, write: if pin.matches('^[0-9]{6}$');
      }
    }
  }
}
```

Nota: cualquiera con el PIN puede leer/escribir; coherente con la spec.

- [ ] **Step 5: Factory en App según env**

Si faltan vars Firebase → `createMemorySync()` + banner “modo local (sin nube)”.

---

### Task 5: Búsqueda Mercadona (Algolia)

**Files:**
- Create: `src/data/mercadonaSearch.ts`
- Test: `src/data/mercadonaSearch.test.ts`

**Interfaces:**
- Produces:
  - `export type ProductSuggestion = { productId: string; name: string; displayName: string }`
  - `export async function searchProducts(query: string, warehouse?: string): Promise<ProductSuggestion[]>`

- [ ] **Step 1: Test con fetch mock**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchProducts } from './mercadonaSearch'

afterEach(() => vi.unstubAllGlobals())

describe('searchProducts', () => {
  it('devuelve [] si query corta', async () => {
    expect(await searchProducts('a')).toEqual([])
  })

  it('mapea hits de Algolia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hits: [{ id: 51621, display_name: 'Queso camembert', name: 'Queso' }],
        }),
      }),
    )
    const hits = await searchProducts('queso')
    expect(hits[0]).toEqual({
      productId: '51621',
      name: 'Queso',
      displayName: 'Queso camembert',
    })
  })

  it('si fetch falla, []', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))
    expect(await searchProducts('leche')).toEqual([])
  })
})
```

- [ ] **Step 2: Implementar cliente**

Usar endpoint Algolia search HTTP:

`POST https://{APP_ID}-dsn.algolia.net/1/indexes/{INDEX}/query`

Headers: `X-Algolia-Application-Id`, `X-Algolia-API-Key`.  
Index: `${VITE_ALGOLIA_INDEX_PREFIX}${warehouse}_es` (default `mad1`).

Si `VITE_ALGOLIA_SEARCH_KEY` vacío: `searchProducts` retorna `[]` siempre (texto libre sigue OK).

Mapear campos reales tras una prueba manual; ajustar nombres (`id`, `display_name`, etc.) según respuesta real.

- [ ] **Step 3: Run tests**

```powershell
npm run test -- src/data/mercadonaSearch.test.ts
```

Expected: PASS.

---

### Task 6: Hooks de sesión y lista

**Files:**
- Create: `src/hooks/useHousehold.ts`, `src/hooks/useShoppingList.ts`

**Interfaces:**
- Consumes: `ListSync`, `localDb`, `mergeItems`, `getOrCreateDeviceId`, pin helpers
- Produces:
  - `useHousehold(): { pin: string | null; status; create(); join(pin); leave(); sync }`
  - `useShoppingList(pin, sync): { items; add(...); toggle(id); update(id, partial); remove(id); syncStatus }`

- [ ] **Step 1: `useHousehold`**

Al montar: `loadSession()`; si hay PIN, `joinHousehold`; si no existe remoto y hay memory/Firebase vacío, mantener local-only hasta create.

Flujos:
- `create()` → `generatePin()` → `createHousehold` → `saveSession` → set state
- `join(raw)` → normalize + validate → `joinHousehold` → si false, error “PIN no encontrado” → si true, `saveSession`
- `leave()` → `clearSession` + clear state

- [ ] **Step 2: `useShoppingList`**

- Cargar `getItems(pin)` al entrar.
- `subscribeItems`: al recibir remote, `mergeItems(local, remote)` → setState → `putItems`.
- `add({ name, quantity, note, productId })`: crear ítem con `crypto.randomUUID()`, `updatedAt: Date.now()`, `updatedBy: deviceId`; optimistic local + `upsertItem`.
- `toggle` / `update` / `remove`: mismo patrón LWW + persist.
- Escuchar `online`/`offline` para `syncStatus`.

- [ ] **Step 3: Smoke manual con MemorySync**

En `App.tsx` temporal: create hogar, add ítem, ver lista. Sin Firebase.

---

### Task 7: UI — Welcome + Lista (layout A)

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/app.css`, `src/components/WelcomeScreen.tsx`, `src/components/ListScreen.tsx`, `src/components/ItemRow.tsx`, `src/components/AddBar.tsx`, `src/components/EditItemSheet.tsx`, `src/components/SyncBadge.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: hooks anteriores + `searchProducts`

- [ ] **Step 1: Tokens visuales**

Definir variables CSS (evitar purple-on-white / cream+terracotta genéricos). Dirección: fresco supermercado — fondo papel cálido suave distinto, acento verde oliva `#3d6b4f`, tipografía: algo tipo `"Fraunces"` + `"Source Sans 3"` vía Google Fonts o similar expressiva.

- [ ] **Step 2: WelcomeScreen**

- Título marca: nombre producto (ej. **Lista Casa**) hero-level.
- Botones: Crear hogar / Unirse.
- Input PIN 6 dígitos + error.

- [ ] **Step 3: ListScreen layout A**

- Cabecera: título + PIN + `SyncBadge`.
- `AddBar` arriba: input, debounce 200ms → `searchProducts`, dropdown sugerencias, Enter = texto libre.
- Lista: pendientes primero (`done === false`), luego comprados tachados.
- `ItemRow`: checkbox, name, `quantity · note`.
- Tap ítem → `EditItemSheet` (cantidad, nota, borrar).

- [ ] **Step 4: Wire App**

```tsx
// Pseudológica
if (!pin) return <WelcomeScreen ... />
return <ListScreen pin={pin} ... />
```

- [ ] **Step 5: Verificar en navegador**

```powershell
npm run dev
```

Expected: crear PIN, añadir “Leche”, marcar comprado, editar nota.

---

### Task 8: PWA instalable

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (o SVG convertido)
- Modify: `vite.config.ts`, `index.html`, `package.json`

- [ ] **Step 1: Instalar plugin**

```powershell
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Configurar**

```ts
import { VitePWA } from 'vite-plugin-pwa'

// plugins:
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icons/*.png'],
  manifest: {
    name: 'Lista Casa',
    short_name: 'Lista',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f4ef',
    theme_color: '#3d6b4f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  workbox: {
    navigateFallback: '/index.html',
    runtimeCaching: [],
  },
})
```

- [ ] **Step 3: Build + preview PWA**

```powershell
npm run build
npm run preview
```

Expected: Application → Manifest OK; installable en Chrome.

---

### Task 9: Firebase real + prueba en dos dispositivos

**Files:**
- Create: `.env.local` (no commitear)
- Modify: docs README corto `README.md`

- [ ] **Step 1: Crear proyecto Firebase**

Consola Firebase → Firestore → pegar `firestore.rules` → copiar config a `.env.local`.

- [ ] **Step 2: Cambiar factory a `createFirebaseSync()` cuando env completo**

- [ ] **Step 3: Prueba aceptación (checklist)**

- [ ] Dos navegadores (o móvil + PC) mismo PIN: alta visible en ambos
- [ ] Marcar comprado sync
- [ ] Offline (DevTools Offline): editar; volver online; converge LWW
- [ ] PIN inexistente → error
- [ ] Sin red Algolia → texto libre OK
- [ ] Instalar PWA

- [ ] **Step 4: `README.md`**

Cómo: `npm install`, `.env.local`, `npm run dev`, crear/unir PIN, desplegar (Firebase Hosting o Netlify/Cloudflare Pages).

---

## Spec coverage (self-review)

| Requisito spec | Task |
|----------------|------|
| Lista plana name/qty/note/done | 2, 6, 7 |
| Texto libre + sugerencias Mercadona | 5, 7 |
| PIN 6 dígitos sin cuentas | 2, 4, 6, 7 |
| Sync + IndexedDB offline | 3, 4, 6 |
| Layout A buscador arriba | 7 |
| Sync badge + PIN cabecera | 7 |
| PWA instalable | 8 |
| LWW updatedAt | 2, 6 |
| Tickets correo fuera | — (no incluido) |
| Criterios 2 dispositivos | 9 |

## Placeholder scan

Sin TBD; Firebase vs Memory resuelto por env; campos Algolia se ajustan con una respuesta real en Task 5.

---

## Execution handoff

Plan guardado en `docs/superpowers/plans/2026-08-08-lista-compra-pwa.md`.

**Opciones de ejecución:**

1. **Subagent-Driven (recomendado)** — un subagente por task, review entre tasks  
2. **Inline Execution** — ejecutar las tasks en esta sesión con checkpoints  

¿Cuál prefieres?
