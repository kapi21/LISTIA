# Tickets Task 5 — Report

## Fix: race conditions on pin change (post-review)

**Date:** 2026-08-08

### Changes

- `useTicketStats`: reset `stats`, `lastResult`, `error` and `connection` at effect start on pin change (A→B included), mirroring `useShoppingList`.
- `loadConnection` accepts optional `isActive()` guard; effect sets `cancelled` flag so stale responses cannot overwrite connection after pin switch.
- `subscribeTicketStats`: optional `onError` callback; `onSnapshot` error handler clears stats and surfaces error message.

### Tests

- `useTicketStats.test.ts`: pin change reset + stale connection ignored.
- `ticketStats.test.ts`: unchanged (2/2 pass).
- **Result:** 5/5 tests pass (`useTicketStats` 3, `ticketStats` 2).
