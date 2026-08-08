# Lista de la compra PWA (hogar con PIN) — Diseño

Fecha: 2026-08-08  
Estado: aprobado en brainstorming; pendiente review del archivo por el usuario

## Objetivo

PWA instalable para lista de la compra compartida entre dos personas (pareja), usable en el súper, con sugerencias del catálogo de Mercadona y sincronización en tiempo casi real mediante un PIN de hogar.

## Fuera de alcance (fase 2+)

- Importación y análisis de tickets de compra desde el correo electrónico (“lo más comprado”).
- Sync/export avanzado por WhatsApp.
- Varias listas por hogar, agrupación por categorías, precios permanentes en la lista.
- Cuentas con email/Google, roles o permisos finos.

## Requisitos del MVP

1. Lista plana compartida: nombre, cantidad, nota, marcar comprado.
2. Texto libre + sugerencias de catálogo Mercadona (API/Algolia no oficiales).
3. Un hogar = una lista; acceso con PIN de 6 dígitos (sin cuentas).
4. Sync entre dispositivos del mismo PIN; caché local (IndexedDB) para uso offline.
5. Layout principal: buscador arriba + lista en una sola pantalla (opción A validada).
6. Indicador de sync y PIN visible en cabecera.
7. Instalable como PWA (Android/Chrome; iOS vía “Añadir a inicio”).

## Arquitectura

```
[Móvil A] ⇄ Backend tiempo real (Firebase o Supabase) ⇄ [Móvil B]
   │              hogar identificado por PIN
IndexedDB
(caché offline)
   │
   └── (online) Algolia / API tienda.mercadona.es → sugerencias
```

- **Frontend:** Vite + React + TypeScript, Service Worker (PWA).
- **Backend:** solo para hogar + ítems en tiempo real. El PIN identifica el documento/colección del hogar; cada dispositivo guarda un `deviceId` local anónimo (sin login).
- **Catálogo Mercadona:** llamadas desde el cliente; no se replica el catálogo en el backend.
- **Conflictos:** last-write-wins por `updatedAt` del ítem.

## Pantallas y flujo

1. **Bienvenida:** Crear hogar (genera PIN) o Unirse con PIN.
2. **Lista:** buscador superior; pendientes primero; comprados tachados.
3. **Añadir:** al escribir, sugerencias; elegir catálogo o confirmar texto libre.
4. **Editar ítem:** cantidad, nota, borrar.
5. **Cabecera:** PIN + estado sync (conectado / offline).

## Modelo de datos

### Hogar

| Campo | Tipo | Notas |
|-------|------|--------|
| pin | string (6 dígitos) | clave de acceso |
| createdAt | timestamp | |
| name | string opcional | ej. “Casa” |

### Ítem

| Campo | Tipo | Notas |
|-------|------|--------|
| id | string | |
| name | string | siempre |
| quantity | string | texto libre (“2”, “1 kg”) |
| note | string | opcional |
| done | boolean | |
| productId | string \| null | id Mercadona si aplica |
| updatedAt | timestamp | sync / LWW |
| updatedBy | string | id dispositivo anónimo |

### Local (dispositivo)

- PIN del hogar unido.
- Copia de ítems en IndexedDB.
- Preferencia opcional: código postal (para almacén/precios en sugerencias).

## Comportamiento ante errores

- **Offline:** edición local; re-sync al recuperar red.
- **PIN inválido:** mensaje claro; no entrar.
- **Catálogo Mercadona no disponible:** texto libre sigue funcionando; aviso discreto.
- **Seguridad del PIN:** suficiente para uso familiar; no es un sistema de alta seguridad (cualquiera con el PIN ve/edita la lista).

## Criterios de aceptación

- Dos dispositivos con el mismo PIN ven altas, ediciones y “comprado” en pocos segundos.
- Tras modo offline, los cambios se reflejan al reconectar sin pérdida evidente en el flujo feliz.
- Se puede añadir ítem por texto libre y por sugerencia Mercadona.
- La app es instalable y usable a pantalla completa en móvil.
- Un hogar no mezcla datos con otro PIN.

## Stack propuesto

- Vite + React + TypeScript
- PWA (vite-plugin-pwa o equivalente)
- IndexedDB (idb o similar)
- **Backend por defecto:** Firebase (Firestore o Realtime Database) por sync sencillo y plan gratuito suficiente para 2 usuarios; Supabase como alternativa equivalente si se prefiere SQL
- Cliente HTTP/Algolia para búsqueda Mercadona

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Prioridad | Lista PWA primero; tickets correo después |
| Sync | Necesario (uso en pareja) |
| Acceso | PIN hogar 6 dígitos, sin email |
| Añadir productos | Texto libre + sugerencias Mercadona |
| Organización | Lista plana |
| Campos ítem | Nombre + cantidad + nota |
| UI principal | Buscador arriba + lista (layout A) |
| Backend en MVP | Sí, ligero, solo para sync |
