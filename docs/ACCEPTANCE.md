# Checklist de aceptación — Task 9

Prerrequisitos: `.env.local` con las 6 variables Firebase, reglas desplegadas, app accesible por HTTPS o dos clientes en la misma red (`npm run dev` + túnel, o hosting desplegado).

## Sincronización multi-dispositivo

- [ ] **Alta compartida:** Dispositivo A crea hogar y añade un producto. Dispositivo B se une con el mismo PIN y ve el producto sin recargar (o tras unos segundos).
- [ ] **Marcar comprado:** En A, marca un ítem como hecho. En B aparece marcado.

## Offline y convergencia LWW

- [ ] En un dispositivo, DevTools → Network → **Offline**.
- [ ] Edita cantidad, nota o marca/desmarca un ítem.
- [ ] Vuelve **Online**.
- [ ] El estado converge (última escritura gana por `updatedAt` / merge en cliente).

## Errores y degradación

- [ ] Introducir un PIN de 6 dígitos que **no existe** → mensaje *PIN no encontrado*.
- [ ] Sin `VITE_ALGOLIA_SEARCH_KEY` (o red Algolia caída): añadir ítem escribiendo nombre a mano funciona.

## PWA

- [ ] Con HTTPS (preview con túnel o hosting): icono *Instalar* / *Añadir a pantalla de inicio*.
- [ ] App abre en modo standalone con icono verde.

## Modo local (sanity)

- [ ] Sin variables Firebase en `.env.local`: banner *Modo local* visible; crear hogar no sincroniza entre navegadores (esperado).
