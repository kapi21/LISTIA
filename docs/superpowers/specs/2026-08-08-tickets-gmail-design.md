# Extracción de tickets Mercadona (Gmail PDF) — Diseño

Fecha: 2026-08-08  
Estado: aprobado en brainstorming; pendiente review del archivo por el usuario  
Depende de: lista PWA con hogar PIN + Firebase (`2026-08-08-lista-compra-pwa-design.md`)

## Objetivo

Conectar Gmail una vez, importar automáticamente los PDF de tickets de Mercadona y mostrar un ranking de “lo más comprado” por hogar (PIN), compartido con quien use la misma lista.

## Fuera de alcance (MVP tickets)

- Detalle de cada compra / líneas de un ticket concreto.
- Botón “añadir a la lista” desde el ranking.
- Outlook, subida manual de PDF, tickets en HTML o imagen.
- Varios Gmail por hogar.

## Requisitos del MVP

1. OAuth Gmail (solo lectura) desde la PWA vía backend.
2. Buscar correos con adjuntos PDF de Mercadona.
3. Parsear PDF → líneas de producto; agregar conteos.
4. Persistencia en Firestore bajo el mismo `households/{pin}`.
5. UI “Compras”: conectar / actualizar / ranking (nombre, veces, última fecha).
6. No reimportar el mismo mensaje (`importedMessageIds`).
7. Un Gmail por hogar; el otro miembro ve el ranking sin conectar correo.

## Arquitectura

```
[PWA] --Conectar / Actualizar--> [Firebase Function / mini-backend]
                                      | OAuth + Gmail API
                                      | PDF attach → parse
                                      v
                                 Firestore households/{pin}/
                                   gmailConnection
                                   importedMessageIds
                                   ticketStats/{productKey}
```

- Tokens OAuth se almacenan solo en backend/Firestore con acceso restringido (no en el cliente).
- La PWA lee `ticketStats` en tiempo real o al abrir la sección.

## Pantallas

1. Sección **Compras** en la PWA.
2. Sin conexión: CTA **Conectar Gmail**.
3. Con conexión: email conectado, **Actualizar**, `lastSyncAt`, resumen de importación.
4. Ranking ordenado por `count` desc; fila: nombre, veces, última fecha.

## Modelo de datos

### `households/{pin}/gmailConnection` (doc)

| Campo | Tipo | Notas |
|-------|------|--------|
| email | string | cuenta conectada |
| refreshToken | string | solo servidor |
| lastSyncAt | timestamp | |
| status | string | `connected` \| `needs_reauth` |

### `households/{pin}/importedMessages/{messageId}`

| Campo | Tipo |
|-------|------|
| importedAt | timestamp |
| status | `ok` \| `skipped` \| `error` |
| error | string opcional |

### `households/{pin}/ticketStats/{productKey}`

| Campo | Tipo | Notas |
|-------|------|--------|
| name | string | display |
| count | number | veces visto en tickets |
| lastPurchasedAt | timestamp | |
| productKey | string | nombre normalizado |

## Parseo PDF

1. Extraer texto del PDF.
2. Identificar líneas de producto (heurística Mercadona; ajustar con muestras reales).
3. Normalizar → `productKey` (minúsculas, sin acentos opcionales, colapsar espacios, quitar ruido de precios).
4. Incrementar `count` y actualizar `lastPurchasedAt` por ticket/fecha del correo.
5. PDF ilegible: `importedMessages` con `error`; continuar con el resto.

## Errores y límites

- Token caducado / revocado → `needs_reauth` y mensaje “Vuelve a conectar”.
- Google Cloud OAuth en modo prueba: solo testers autorizados hasta verificación.
- Sin red: mostrar último ranking cacheado si existe; Actualizar requiere red.
- Seguridad PIN = secreto familiar (igual que la lista); tokens Gmail no se exponen al cliente.

## Criterios de aceptación

- Tras OAuth, “Actualizar” importa PDFs nuevos y sube el ranking.
- Re-ejecutar Actualizar no duplica conteos del mismo `messageId`.
- Dos dispositivos con el mismo PIN ven el mismo ranking.
- Un correo sin PDF parseable no tumba el resto del lote.
- Sin Firebase / sin Function desplegada: la sección indica que hace falta backend (no silencioso).

## Stack propuesto

- Firebase Cloud Functions (o Cloud Run) + Gmail API
- Librería PDF en Node (`pdf-parse` o similar)
- Misma PWA React; nueva ruta/sección Compras
- Google Cloud proyecto (puede ser el mismo que Firebase)

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Origen | PDF en correos Gmail |
| Ingesta | Automática OAuth (no subida manual en MVP) |
| Resultado | Solo ranking lo más comprado |
| Alcance hogar | Un Gmail; ranking compartido por PIN |
| Backend | Necesario (opción 1 del brainstorm) |
