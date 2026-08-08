# Checklist de aceptación — Tickets Gmail (Mercadona)

Prerrequisitos: Firebase con reglas desplegadas (`firebase deploy --only firestore:rules`), Cloud Functions desplegadas, OAuth Gmail configurado en Google Cloud, variables `GMAIL_*` / `PWA_ORIGIN` / `OAUTH_STATE_SECRET` en Functions, `.env.local` con `VITE_FIREBASE_*` y `VITE_FUNCTIONS_BASE_URL`.

Modelo de datos: la PWA lee `gmailConnectionPublic/current` (email, status, lastSyncAt) y `ticketStats`; los tokens viven en `gmailSecrets/gmail` (inaccesible desde cliente).

## OAuth y conexión

- [ ] **OAuth completa y status connected:** Desde Compras, *Conectar Gmail* → consentimiento Google → vuelta a la PWA con `?purchases=1`. En Firestore, `gmailConnectionPublic/current` muestra `status: connected` y el email. `gmailSecrets/gmail` existe pero no es legible desde la consola del navegador (reglas deniegan).

## Sincronización

- [ ] **Sync importa ≥1 PDF de prueba:** Con Gmail conectado, *Sincronizar* importa al menos un ticket PDF de Mercadona de la bandeja. Aparecen filas en `ticketStats` y el ranking en Compras.
- [ ] **Segunda sync no duplica:** Repetir *Sincronizar* no incrementa de nuevo los mismos productos del mismo mensaje (`importedMessages/{messageId}` evita reprocesar).

## Multi-dispositivo

- [ ] **Ranking visible en 2º dispositivo mismo PIN:** Segundo navegador/dispositivo con el mismo PIN de 6 dígitos ve el mismo ranking de compras (lectura de `ticketStats` en tiempo real).

## Resiliencia

- [ ] **PDF basura → error parcial, no crash:** Un adjunto PDF ilegible o no ticket registra error en `importedMessages` (vía Functions) y la sync termina con contadores de error; la app no se cae y el resto de mensajes se procesan.

## Seguridad (sanity)

- [ ] Cliente **no** puede escribir en `ticketStats`, `gmailConnectionPublic`, `gmailSecrets` ni `importedMessages` (probar en consola o emulador con reglas).
- [ ] Cliente **no** puede leer `gmailSecrets` (no debe exponer `refreshToken`).

Detalle de despliegue: sección *Cloud Functions — Gmail OAuth* en [README.md](../README.md).
