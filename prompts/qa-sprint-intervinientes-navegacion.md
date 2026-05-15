# Agente: QA | Rama: `dev`

## Contexto

Se implementaron varias mejoras de UX en el sprint actual. Necesitamos validar que todo funciona correctamente y de forma consistente antes de mergear a `main`.

La app corre en `http://localhost:3002`.

---

## 1. Toggles de roles opcionales en Intervinientes

Esta mejora debe estar presente y funcionar igual en las 4 páginas:

### NewRecord (`/nueva-carga`)
- [ ] Step 2 muestra solo los toggles por defecto, sin campos visibles
- [ ] Activar un toggle muestra los campos CUIT + nombre
- [ ] El CUIT tiene autocomplete (al escribir el CUIT aparece el nombre)
- [ ] Desactivar un toggle oculta los campos y limpia los valores
- [ ] Los campos fijos (Titular, Remitente, Destinatario, Destino, Flete, Intermediario) siempre visibles

### ImportarCupos (`/importar`)
- [ ] La sección Intervinientes muestra solo toggles por defecto
- [ ] Activar/desactivar funciona igual que en NewRecord
- [ ] El guardado incluye correctamente los campos completados

### DetalleCupo (`/cupo/:id`) — tab Intervinientes
- [ ] Al abrir un cupo con roles cargados, los toggles correspondientes aparecen activos con sus valores
- [ ] Al abrir un cupo sin roles opcionales, todos los toggles aparecen inactivos
- [ ] Activar/desactivar funciona igual que en las otras páginas
- [ ] El guardado del tab Intervinientes sigue funcionando

### EditRecord (`/registro/:id/editar`)
- [ ] Mismo comportamiento que DetalleCupo: toggles se auto-activan según datos del registro

---

## 2. Navegación estandarizada (WizardProgress vs TabBar)

- [ ] En `/nueva-carga` el componente de navegación muestra: nombre del paso + contador + barra con dots
- [ ] En `/cupo/:id` el componente de navegación se ve visualmente idéntico al de nueva carga
- [ ] En DetalleCupo, tocar un dot navega al tab correspondiente
- [ ] El nombre del tab activo y el contador se actualizan al navegar entre tabs

---

## 3. CupoCard — estado vacío

- [ ] Una card con datos completos se ve igual que antes
- [ ] Una card sin número de cupo muestra texto de fallback en gris
- [ ] Una card sin grano/destinatario/kg muestra texto de fallback en gris italic

---

## 4. Regresión general

- [ ] El flujo completo de nueva carga (steps 1→7) funciona sin errores
- [ ] El flujo de importación guarda correctamente todos los campos
- [ ] El guardado en DetalleCupo (cada tab) funciona sin errores
- [ ] No hay errores en consola en ninguna de las páginas anteriores

---

## Cómo reportar

Por cada ítem que falle, indicar:
- Página y acción exacta que lo reproduce
- Comportamiento esperado vs comportamiento actual
- Si hay error en consola, copiarlo
