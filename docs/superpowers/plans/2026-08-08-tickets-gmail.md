# Tickets Gmail (ranking lo más comprado) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar Gmail vía backend, importar PDF de tickets Mercadona y mostrar ranking “lo más comprado” por hogar PIN en la PWA.

**Architecture:** Firebase Cloud Functions manejan OAuth Gmail, descarga de PDF y parseo; escriben `ticketStats` / `importedMessages` / `gmailConnection` bajo `households/{pin}`. La PWA añade sección Compras que lee stats y dispara `connect` / `sync`. El parseo de texto PDF vive en un módulo puro testable (compartible o copiado a `functions/`).

**Tech Stack:** Firebase Functions (Node 20), `googleapis`, `pdf-parse`, Firestore, React PWA existente, Vitest para dominio/parse.

## Global Constraints

- Solo Gmail + PDF adjuntos; solo ranking (nombre, veces, última fecha).
- Un Gmail por hogar; tokens OAuth nunca en el cliente.
- Mismo `households/{pin}` que la lista; no duplicar por `messageId`.
- Depende de Firebase configurado; sin Functions desplegadas la UI lo dice explícitamente.
- Windows PowerShell; commits solo si el flujo SDD/usuario lo pide en ejecución.
- Fuera: detalle ticket, añadir a lista, Outlook, subida manual.

---

## File map

```
functions/
  package.json
  tsconfig.json
  src/index.ts
  src/oauth.ts
  src/gmail.ts
  src/importTickets.ts
  src/config.ts
src/domain/productKey.ts
src/domain/productKey.test.ts
src/domain/ticketTypes.ts
src/tickets/parseTicketText.ts
src/tickets/parseTicketText.test.ts
src/tickets/fixtures/sample-ticket.txt
src/data/ticketStats.ts
src/hooks/useTicketStats.ts
src/components/PurchasesScreen.tsx
src/components/AppShell.tsx   (nav Lista | Compras)
src/App.tsx                  (wire shell)
firestore.rules              (ampliar)
.env.example                 (vars Functions + VITE_FUNCTIONS_URL)
docs/ACCEPTANCE_TICKETS.md
README.md                    (sección tickets)
```

Copia o empaquetado: `functions` debe poder importar la misma lógica de `productKey` + `parseTicketText`. Preferencia: duplicar mínimos en `functions/src/parse/` **o** `functions` importa desde `../src/tickets` vía path; más simple para MVP: **copiar** los módulos puros a `functions/src/parse/` y testear solo en `src/` (fuente de verdad). Tras cambiar parse, sincronizar carpeta functions (Task 2 note).

---

### Task 1: Dominio productKey + tipos ranking

**Files:**
- Create: `src/domain/ticketTypes.ts`, `src/domain/productKey.ts`, `src/domain/productKey.test.ts`

**Interfaces:**
- Produces:
  - `export type TicketStat = { productKey: string; name: string; count: number; lastPurchasedAt: number }`
  - `export type GmailConnectionPublic = { email: string; lastSyncAt: number | null; status: 'connected' | 'needs_reauth' | 'disconnected' }`
  - `export function normalizeProductKey(raw: string): string`
  - `export function displayNameFromRaw(raw: string): string`

- [ ] **Step 1: Tests productKey**

```ts
// src/domain/productKey.test.ts
import { describe, expect, it } from 'vitest'
import { displayNameFromRaw, normalizeProductKey } from './productKey'

describe('normalizeProductKey', () => {
  it('minúsculas, sin precio ni espacios dobles', () => {
    expect(normalizeProductKey('  Leche Entera  1,05 € ')).toBe('leche entera')
  })

  it('quita acentos', () => {
    expect(normalizeProductKey('Plátano canario')).toBe('platano canario')
  })
})

describe('displayNameFromRaw', () => {
  it('recorta ruido de precio pero conserva mayúsculas útiles', () => {
    expect(displayNameFromRaw('Leche Entera 1,05 €')).toBe('Leche Entera')
  })
})
```

- [ ] **Step 2: Run — FAIL**

```powershell
npm run test -- src/domain/productKey.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/domain/ticketTypes.ts
export type TicketStat = {
  productKey: string
  name: string
  count: number
  lastPurchasedAt: number
}

export type GmailConnectionPublic = {
  email: string
  lastSyncAt: number | null
  status: 'connected' | 'needs_reauth' | 'disconnected'
}
```

```ts
// src/domain/productKey.ts
export function stripPriceNoise(raw: string): string {
  return raw
    .replace(/\d+[.,]\d{2}\s*€?/g, '')
    .replace(/\b\d+\s*(kg|g|l|ml|ud|uds)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function displayNameFromRaw(raw: string): string {
  return stripPriceNoise(raw)
}

export function normalizeProductKey(raw: string): string {
  const base = stripPriceNoise(raw).toLowerCase()
  return base.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}
```

- [ ] **Step 4: Run — PASS**

```powershell
npm run test -- src/domain/productKey.test.ts
```

---

### Task 2: Parseo texto ticket (puro)

**Files:**
- Create: `src/tickets/parseTicketText.ts`, `src/tickets/parseTicketText.test.ts`, `src/tickets/fixtures/sample-ticket.txt`

**Interfaces:**
- Consumes: `normalizeProductKey`, `displayNameFromRaw`
- Produces: `export function parseTicketText(text: string): { name: string; productKey: string }[]`

- [ ] **Step 1: Fixture mínima** (texto sintético estilo ticket)

```
MERCADONA
LECHE ENTERA HACENDADO 1,05
PAN DE MOLDE 1,20
TOTAL 2,25
```

- [ ] **Step 2: Test**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseTicketText } from './parseTicketText'

describe('parseTicketText', () => {
  it('extrae productos e ignora TOTAL', () => {
    const text = readFileSync(new URL('./fixtures/sample-ticket.txt', import.meta.url), 'utf8')
    const lines = parseTicketText(text)
    expect(lines.map((l) => l.productKey)).toEqual(['leche entera hacendado', 'pan de molde'])
  })

  it('texto vacío → []', () => {
    expect(parseTicketText('')).toEqual([])
  })
})
```

- [ ] **Step 3: Implement heurística**

Reglas MVP:
- Ignorar líneas: `TOTAL`, `TARJETA`, `IVA`, `MERCADONA`, solo números, longitud &lt; 3.
- Aceptar línea si tras `stripPriceNoise` queda texto con letras.
- Devolver `{ name: displayNameFromRaw(line), productKey: normalizeProductKey(line) }`.
- Deduplicar por `productKey` **dentro del mismo ticket** (count 1 por producto por ticket; el agregador global suma tickets).

- [ ] **Step 4: PASS tests**

```powershell
npm run test -- src/tickets/parseTicketText.test.ts
```

- [ ] **Step 5:** Copiar `productKey.ts` + `parseTicketText.ts` a `functions/src/parse/` cuando exista Task 3 (o crear stub folder ahora).

---

### Task 3: Scaffold Firebase Functions + OAuth Gmail

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts`, `functions/src/oauth.ts`, `functions/src/config.ts`
- Modify: `.env.example`, `README.md` (pasos Google Cloud)

**Interfaces:**
- HTTP:
  - `GET /gmailStart?pin=XXXXXX` → redirect Google OAuth (`scope: gmail.readonly`)
  - `GET /gmailCallback?code=&state=` → guarda refresh token en `households/{pin}/gmailConnection`, redirect a PWA `/?purchases=1`
- Produces env: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`, `PWA_ORIGIN`, `GOOGLE_APPLICATION_CREDENTIALS` / Admin SDK

- [ ] **Step 1: Init functions**

```powershell
cd "C:\@MIS PROYECTOS\MERCADONA"
mkdir functions -Force
cd functions
npm init -y
npm install firebase-admin firebase-functions googleapis
npm install -D typescript @types/node
```

- [ ] **Step 2: `oauth.ts` — generar URL y canjear code**

`state` = PIN firmado o PIN + HMAC (`OAUTH_STATE_SECRET`) para evitar fijar PIN ajeno.

- [ ] **Step 3: Export functions**

Usar `onRequest` (v2) con CORS restringido a `PWA_ORIGIN`.

- [ ] **Step 4: Documentar en README**

Crear OAuth client Web, scopes, testers, redirect URI de Functions.

- [ ] **Step 5: Emulator smoke (opcional)**

```powershell
# desde raíz, si firebase-tools instalado
npx firebase emulators:start --only functions
```

Sin proyecto Firebase del usuario: dejar Functions compilables (`npm run build` en `functions/`) y documentar deploy.

---

### Task 4: Gmail list + PDF download + import pipeline

**Files:**
- Create: `functions/src/gmail.ts`, `functions/src/importTickets.ts`, `functions/src/parse/*` (copia)
- Modify: `functions/src/index.ts` → `POST /syncTickets` body `{ pin }`

**Interfaces:**
- `listMercadonaPdfMessages(auth): Promise<{ id: string; internalDate: number }[]>`
- `downloadFirstPdf(auth, messageId): Promise<Buffer | null>`
- `importNewTickets(pin: string): Promise<{ imported: number; skipped: number; errors: number }>`

- [ ] **Step 1: Query Gmail**

```
from:mercadona.es has:attachment filename:pdf
```

(Ajustar `from:` tras probar un correo real del usuario.)

- [ ] **Step 2: Por cada messageId**

Si existe `importedMessages/{id}` → skip.  
Else: PDF → `pdf-parse` → `parseTicketText` → batch update `ticketStats` (increment `count`, max `lastPurchasedAt`) → write imported status.

- [ ] **Step 3: Auth errors**

Si refresh falla → `gmailConnection.status = 'needs_reauth'`.

- [ ] **Step 4: Endpoint sync**

`POST /syncTickets` con header/body pin; verifica PIN 6 dígitos; no expone tokens en response (solo resumen).

- [ ] **Step 5: Unit test parse path en functions** (opcional) o confiar en tests `src/tickets`.

Instalar: `npm install pdf-parse` en `functions/`.

---

### Task 5: Cliente PWA — leer stats + llamar sync

**Files:**
- Create: `src/data/ticketStats.ts`, `src/hooks/useTicketStats.ts`
- Modify: `.env.example` → `VITE_FUNCTIONS_BASE_URL=`

**Interfaces:**
- `subscribeTicketStats(pin, cb): () => void` (Firestore `ticketStats` orderBy count — o sort client-side)
- `getGmailConnectionPublic(pin): Promise<GmailConnectionPublic>`
- `startGmailOAuth(pin): void` → `window.location = `${FUNCTIONS}/gmailStart?pin=``
- `syncTickets(pin): Promise<{ imported: number; skipped: number; errors: number }>`

- [ ] **Step 1: Si no hay Firebase env → connection `disconnected` y stats `[]`; sync lanza error claro.**

- [ ] **Step 2: Hook `useTicketStats(pin)`**

Estado: `stats`, `connection`, `syncing`, `lastResult`, `error`, `connect()`, `refresh()`.

- [ ] **Step 3: Test hook con mock fetch** (mínimo 1 test refresh).

---

### Task 6: UI Compras + navegación

**Files:**
- Create: `src/components/PurchasesScreen.tsx`, `src/components/AppShell.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`

**Interfaces:**
- AppShell tabs: Lista | Compras (solo si `pin` set)
- PurchasesScreen: CTA conectar / actualizar / ranking

- [ ] **Step 1: AppShell**

Mantener Welcome si no hay pin. Con pin: shell con outlet Lista / Compras.

- [ ] **Step 2: PurchasesScreen copy**

- Desconectado: “Conecta Gmail para importar tickets PDF de Mercadona.”
- `needs_reauth`: “Vuelve a conectar.”
- Sin `VITE_FUNCTIONS_BASE_URL`: aviso “Backend de tickets no configurado.”
- Lista ranking: `{name} · {count} veces · {fecha}`

- [ ] **Step 3: Estilos coherentes** con tokens existentes (`#3d6b4f`, Fraunces).

- [ ] **Step 4: `npm run build` + `npm test` PASS**

---

### Task 7: Reglas Firestore + docs aceptación

**Files:**
- Modify: `firestore.rules`
- Create: `docs/ACCEPTANCE_TICKETS.md`
- Modify: `README.md`

**Rules MVP familiar:**
- Cliente puede **leer** `ticketStats` y campos públicos de connection (`email`, `lastSyncAt`, `status`) — **no** `refreshToken`.
- Preferible: doc público `gmailConnectionPublic` escrito solo por Functions; `gmailConnection` privado solo Admin SDK.
- Implementación recomendada: Functions escriben `gmailConnectionPublic` (sin token) + `gmailSecrets/gmail` (solo admin). Cliente solo lee public + stats + no escribe stats.

- [ ] **Step 1: Ajustar modelo** si hace falta split public/secret (actualizar `importTickets` / oauth).

- [ ] **Step 2: Checklist aceptación**

- [ ] OAuth completa y status connected  
- [ ] Sync importa ≥1 PDF de prueba  
- [ ] Segunda sync no duplica  
- [ ] Ranking visible en 2º dispositivo mismo PIN  
- [ ] PDF basura → error parcial, no crash  

- [ ] **Step 3: README sección Tickets** (GCP OAuth, deploy functions, env vars).

---

## Spec coverage

| Requisito | Task |
|-----------|------|
| OAuth Gmail readonly vía backend | 3 |
| Buscar PDF Mercadona | 4 |
| Parse PDF → productos | 2, 4 |
| Firestore stats + no duplicar messageId | 4, 7 |
| UI Compras connect/sync/ranking | 5, 6 |
| Un Gmail / ranking compartido PIN | 3, 4, 6 |
| Sin backend → mensaje claro | 5, 6 |
| Tokens no en cliente | 3, 7 |

## Placeholder scan

Sin TBD; query Gmail `from:` se ajusta con correo real en Task 4. Split `gmailConnectionPublic` vs secret explicitado en Task 7.

---

## Execution handoff

Plan guardado en `docs/superpowers/plans/2026-08-08-tickets-gmail.md`.

**Opciones:**

1. **Subagent-Driven (recomendado)** — un subagente por task  
2. **Inline** — esta sesión con checkpoints  

¿1 o 2?
