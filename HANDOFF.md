# HANDOFF - LISTIA (Mi Libreta de Compra)

## 1. Resumen del Proyecto
- **Nombre**: LISTIA
- **Propósito**: PWA móvil y de escritorio con estética de libreta de notas de papel real para gestionar la lista de la compra familiar, con catálogo oficial y actualizado de Mercadona y sincronización instantánea entre pareja.
- **Repositorio**: [https://github.com/kapi21/LISTIA.git](https://github.com/kapi21/LISTIA.git)
- **Despliegue activo**: [https://kapi21.github.io/LISTIA/](https://kapi21.github.io/LISTIA/)
- **Rama principal**: `main`

---

## 2. Pila Tecnológica
- **Frontend**: React 19 + TypeScript + Vite 6.
- **PWA**: `vite-plugin-pwa` con Service Worker para instalación como app nativa y funcionamiento offline.
- **Estilos**: Vanilla CSS con diseño visual de libreta (`src/styles/notebook.css`), fuentes de caligrafía (`Caveat`, `Patrick Hand`).
- **Backend / Sincronización**: Firebase Firestore con emparejamiento por PIN de 6 dígitos (`src/data/notebookSync.ts`).
- **Sincronización de Catálogo**: Script en Python (`sync_mercadona.py`) que consulta directamente la API oficial de Mercadona (`https://tienda.mercadona.es/api/categories/`) y se ejecuta automáticamente cada día a las 04:00 UTC en GitHub Actions (`.github/workflows/deploy.yml`).

---

## 3. Estado Actual y Problemas Clave Resueltos
1. **Adaptación móvil completa (Mobile-First)**:
   - Eliminados marcos oscuros y márgenes desktop innecesarios en pantallas táctiles (`< 768px`).
   - Tipografía ampliada (`1.4rem` para nombres de productos), casillas grandes de `24px` y botones de borrado y acción táctiles.
2. **Alineación del margen vertical rojo**:
   - Margen rojo fijado entre **46px y 48px**.
   - Columna de casillas (checkboxes) aislada en el lateral izquierdo (**0 a 42px**), dejando 13px de margen limpio antes de la raya.
   - Textos, fotos, títulos y secciones alineados a partir de **58px**, garantizando que ninguna letra ni casilla caiga sobre la línea roja.
   - Despensa alineada: corregida la sangría interna errónea para que sus productos sigan la misma columna vertical que la lista activa.
3. **Privacidad de la despensa de usuarios**:
   - Eliminada la carga pública automática del archivo de Listonic.
   - Los visitantes nuevos entran a una libreta limpia (*"Mi Lista"*, 0 productos, 0 en despensa).
   - Los datos personales del usuario original se preservan de forma segura en `localStorage` y en la copia local `backup/listonic-backup.json` (ignorada en git).
4. **Catálogo de Mercadona completo (4.316+ productos)**:
   - Corregido el problema de categorías vacías (como *Desodorante* con 43 productos o *Ambientador* con 49 productos).
   - Se implementaron 4 reintentos automáticos con espera progresiva y concurrencia controlada (6 workers) en `sync_mercadona.py` para evitar los bloqueos por rate-limit de la API de Mercadona.

---

## 4. Comandos de Uso Frecuente
```bash
# Iniciar servidor local (accesible en red local LAN)
abrir.bat
# o bien:
npm run dev -- --host 0.0.0.0 --port 5174

# Ejecutar tests unitarios (10 suites, 26 tests)
npm test

# Compilar para producción (validación de build PWA)
npm run build

# Sincronizar catálogo oficial de Mercadona en local
python sync_mercadona.py
```

---

## 5. Configuración de Despliegue en GitHub Pages
- Flujo en `.github/workflows/deploy.yml`.
- Se activa en cada `push` a `main` o automáticamente cada 24 horas por cron.
- Descarga el catálogo oficial, compila la PWA y publica la build en GitHub Pages.
