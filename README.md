# Lista Casa — PWA de lista de compra compartida

Lista de la compra colaborativa por hogar (PIN de 6 dígitos). Sincronización en tiempo real con Firestore cuando configuras Firebase; sin credenciales usa **modo local** (solo en ese navegador).

## Requisitos

- Node.js 20+
- Cuenta Google (para Firebase)
- Opcional: cuenta Algolia (búsqueda de productos Mercadona)

## Instalación

```bash
npm install
```

## Variables de entorno

Copia la plantilla y rellena los valores reales (no commitear `.env.local`):

```bash
cp .env.example .env.local
```

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `VITE_FIREBASE_API_KEY` | Sí (sync) | Config web de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Sí | `{projectId}.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Sí | ID del proyecto |
| `VITE_FIREBASE_STORAGE_BUCKET` | Sí | `{projectId}.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sí | Sender ID |
| `VITE_FIREBASE_APP_ID` | Sí | App ID |
| `VITE_ALGOLIA_*` | No | Búsqueda de productos; sin clave, texto libre funciona |

### Modo local vs Firebase

`src/data/createSync.ts` elige el backend al arrancar:

- **Firebase:** las 6 variables `VITE_FIREBASE_*` están definidas y no vacías → `createFirebaseSync()`, `isLocalMode = false`.
- **Local:** falta alguna → `createMemorySync()`, banner *Modo local — sin sincronización en la nube*.

Tras editar `.env.local`, reinicia `npm run dev`.

## Configurar Firebase (consola)

1. [Firebase Console](https://console.firebase.google.com/) → **Crear proyecto** (o usar uno existente).
2. **Build → Firestore Database** → Crear base de datos (modo producción o prueba).
3. **Build → Firestore Database → Reglas** → pegar el contenido de [`firestore.rules`](firestore.rules) del repo → **Publicar**.

   Las reglas permiten lectura/escritura solo en rutas `households/{pin}` e `items` cuando el PIN tiene exactamente 6 dígitos.

4. **Project settings (⚙) → General → Your apps** → añadir app **Web** (`</>`).
5. Copiar el objeto `firebaseConfig` a `.env.local` (prefijo `VITE_` en cada clave).

### Desplegar reglas desde CLI (opcional)

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # selecciona el proyecto; usa firestore.rules del repo
firebase deploy --only firestore:rules
```

## Desarrollo

```bash
npm run dev
```

Abre la URL que muestra Vite (p. ej. `http://localhost:5173`).

### Crear o unirse a un hogar

1. **Crear hogar:** pulsa *Crear hogar* → se genera un PIN de 6 dígitos y se guarda en Firestore (si Firebase está configurado).
2. **Unirse:** en otro dispositivo/navegador, introduce el mismo PIN → *Unirse*.
3. Comparte el PIN con quien comparta la lista (pantalla de lista muestra el PIN).
4. **Salir:** botón para cerrar sesión local (no borra datos en la nube).

Errores esperados:

- PIN con formato incorrecto → *PIN inválido*
- PIN inexistente en Firestore → *PIN no encontrado*

## Build y preview

```bash
npm test
npm run build
npm run preview
```

## Despliegue

Genera estáticos en `dist/` con `npm run build`. Las variables `VITE_*` se inlined en build time: configúralas en el panel del hosting **antes** del build.

### Firebase Hosting

```bash
firebase init hosting
# Public directory: dist
# Single-page app: Yes
npm run build
firebase deploy --only hosting
```

En CI: define las `VITE_*` como secrets del proyecto y ejecuta `npm run build` antes de `firebase deploy`.

### Cloudflare Pages

1. Conectar repo o subir `dist/`.
2. **Build command:** `npm run build`
3. **Output directory:** `dist`
4. **Environment variables:** las mismas `VITE_*` de `.env.local`.

HTTPS habilitado → instalación PWA en móvil.

## Checklist de aceptación (Task 9)

Marca cuando hayas probado con Firebase real y dos dispositivos:

- [ ] Dos navegadores (o móvil + PC) con el mismo PIN: un alta visible en ambos
- [ ] Marcar comprado se sincroniza entre dispositivos
- [ ] Offline (DevTools → Network → Offline): editar; volver online; converge LWW
- [ ] PIN inexistente → error *PIN no encontrado*
- [ ] Sin red Algolia → añadir producto en texto libre OK
- [ ] Instalar PWA (Chrome *Instalar app* / iOS *Añadir a pantalla de inicio* con HTTPS)

Detalle paso a paso: [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build producción |
| `npm run preview` | Sirve `dist/` localmente |
| `npm test` | Tests Vitest |
