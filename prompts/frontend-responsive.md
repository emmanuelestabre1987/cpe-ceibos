# Prompt — Front end: Responsive Desktop

Necesito hacer la app CPE Campo responsive para desktop. Hoy toda la app usa `max-w-mobile` (430px) y en pantalla completa queda una columna angosta. El 80% del uso es mobile (que ya funciona perfecto), el 20% es desktop — y esos usuarios son los que cargan cupos nuevos y datos comerciales, así que los formularios tienen que ser cómodos en desktop.

**Reglas:**
- Mobile no cambia nada — todo lo que existe hoy en mobile debe seguir igual
- Desktop no puede perder ninguna funcionalidad
- Usar breakpoint `md:` (768px) para aplicar cambios de desktop
- No hacer sidebar ni rediseño estructural — solo ampliar anchos y reorganizar layouts

---

## Cambios a implementar

**1. `tailwind.config.js` — ampliar max-width**
Agregar:
```js
maxWidth: {
  mobile: '430px',
  desktop: '900px',
}
```

**2. Todas las páginas — ancho responsive**
Reemplazar `max-w-mobile` por `max-w-mobile md:max-w-desktop` en todos los contenedores principales de:
- `Home.tsx`
- `NewRecord.tsx`
- `DetalleCupo.tsx`
- `RecordDetail.tsx`
- `Admin.tsx`
- `ImportarCupos.tsx`
- `AsignarTransporte.tsx`
- `AsignarDatos.tsx`
- `EditRecord.tsx`
- `Login.tsx`

**3. `Home.tsx` — grilla de 2 columnas en desktop**
Las tarjetas de cupos (`CupoCard`) hoy son una lista vertical. En desktop mostrarlas en grilla de 2 columnas:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {cupos.map(...)}
</div>
```

**4. `NewRecord.tsx` y `DetalleCupo.tsx` — formularios en 2 columnas en desktop**
Los campos de formulario (`FormField`, `CuitField`, `VoiceInput`) hoy se apilan verticalmente. En desktop mostrarlos en grilla de 2 columnas:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <FormField label="Campo A" ... />
  <FormField label="Campo B" ... />
</div>
```
Aplicar esto en todas las secciones de carga: Intervinientes, Transporte, Grano, Procedencia, Descarga.
Los campos de observaciones y los que ocupan todo el ancho (GPS, toggles) deben tener `md:col-span-2`.

**5. `Header.tsx` — centrar contenido en desktop**
El header ya es full-width, pero el contenido interior debe respetar el nuevo max-width:
```jsx
<div className="max-w-desktop mx-auto w-full flex items-center justify-between">
  {/* contenido actual del header */}
</div>
```

**6. Bottom action bar (`DetalleCupo.tsx` y `NewRecord.tsx`) — inline en desktop**
En mobile el botón de acción está fijo al fondo (`fixed bottom-0`). En desktop debe ser inline al final del formulario:
```jsx
<div className="fixed md:relative bottom-0 left-0 right-0 ...">
```

**7. `ImportarCupos.tsx` — tabla responsive**
Si hay listas de cupos importados, en desktop mostrarlas como tabla HTML con columnas en lugar de tarjetas apiladas.

**8. `Admin.tsx` — tabla de usuarios en desktop**
La lista de emails autorizados en desktop debe mostrarse como tabla con columnas (Email / Admin / Fecha / Acciones) en lugar de tarjetas.

---

## Lo que NO debe cambiar
- Colores, tipografía, spacing general
- Comportamiento mobile (todo debe seguir igual en pantallas < 768px)
- Lógica de negocio, estados, handlers
- El wizard progress bar y la tab bar de DetalleCupo

**Stack:** React + TypeScript + Tailwind CSS
**Proyecto:** `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`
