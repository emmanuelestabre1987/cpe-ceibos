# Q-03 Transiciones de estado — Resultados

**Fecha:** 2026-05-08  
**Archivo revisado:** `src/pages/DetalleCupo.tsx`

---

## Mecanismo de bloqueo

`DetalleCupo.tsx` declara el mapa `LOCKED_TABS` (líneas 48–54):

```ts
const LOCKED_TABS: Record<CupoStatus, Set<TabId>> = {
  IMPORTADO:  new Set(['transporte', 'pesaje', 'cierre']),
  TRANSPORTE: new Set(['pesaje', 'cierre']),
  CARGADO:    new Set(['cierre']),
  CERRADO:    new Set(),
  ENVIADO:    new Set(),
}
```

El handler de selección de tab (líneas 389–395) verifica el set antes de cambiar de tab:

```ts
const handleTabSelect = (tab: TabId) => {
  if (lockedTabs.has(tab)) {
    show('Completá la etapa anterior primero.', 'info')
    return
  }
  setActiveTab(tab)
}
```

La `TabBar` renderiza el ícono `<Lock>` junto al label cuando el tab está bloqueado (líneas 260–261).

---

## Tabla de verificación

| # | Transición | Resultado | Evidencia |
|---|---|---|---|
| 1 | IMPORTADO → tab Transporte | ✅ PASA | `LOCKED_TABS['IMPORTADO']` incluye `'transporte'` → toast + return. `DetalleCupo.tsx:49,390` |
| 2 | IMPORTADO → tab Pesaje | ✅ PASA | `LOCKED_TABS['IMPORTADO']` incluye `'pesaje'` → toast + return. `DetalleCupo.tsx:49,390` |
| 3 | IMPORTADO → tab Cierre | ✅ PASA | `LOCKED_TABS['IMPORTADO']` incluye `'cierre'` → toast + return. `DetalleCupo.tsx:49,390` |
| 4 | TRANSPORTE → tab Pesaje | ✅ PASA | `LOCKED_TABS['TRANSPORTE']` incluye `'pesaje'` → toast + return. `DetalleCupo.tsx:50,390` |
| 5 | CARGADO → tab Cierre | ✅ PASA | `LOCKED_TABS['CARGADO']` incluye `'cierre'` → toast + return. `DetalleCupo.tsx:51,390` |
| 6 | CERRADO → todos los tabs | ✅ PASA | `LOCKED_TABS['CERRADO']` = `new Set()` → todos accesibles. `DetalleCupo.tsx:52` |
| 7 | Forzar estado via menú ⋮ | ✅ PASA (intencional) | `handleForceStatus()` acepta cualquier estado, disponible para todos los usuarios. `DetalleCupo.tsx:399–412` |
| 8 | Tab Cierre con status CERRADO | ✅ PASA | `cierreReadOnly = status === 'CERRADO' \|\| status === 'ENVIADO'` → renderiza `<ReadOnlyField>` + banner "Cupo cerrado — solo lectura". Botón "Cerrar cupo" oculto. `DetalleCupo.tsx:386,670–690,740–751` |

---

## Bugs encontrados

**Ninguno.** Los 8 casos están correctamente implementados.

---

## Casos especiales verificados

### Menú ⋮ → Forzar estado: ¿muestra el estado actual con ✓?

**✅ SÍ.** El bottom sheet de "Forzar estado" (líneas 813–826) itera todos los estados y:

```tsx
{s === status ? `✓ ${s} (actual)` : s}
```

El estado actual también tiene `disabled={s === status}` para evitar llamar al endpoint con el mismo estado. La lógica es correcta.

### Tab Cierre en CERRADO: ¿campos son read-only?

**✅ SÍ.** Cuando `cierreReadOnly = true` (línea 386), el tab renderiza `<ReadOnlyField>` para todos los campos (RUCA, Ingeniero, Contacto, GPS), muestra un banner verde "Cupo cerrado — solo lectura", y el botón "Cerrar cupo" de la BottomBar está condicional: `{activeTab === 'cierre' && !cierreReadOnly && <BottomBar>...}` (línea 740), por lo que no aparece.

### Tab Historial: sin bloqueo

El tab `'historial'` no aparece en ningún `LOCKED_TABS` (correcto — el historial siempre es accesible).

---

## Veredicto

- [x] ✅ **Todos los casos pasan** — sin bugs en las transiciones de estado

---

## Observación adicional (no es bug, es nota de diseño)

La validación de CUIT/CUIL en el tab Transporte (`validateCuitTransporte`, `validateCuilChofer`) se activa en `onBlur`. El botón "Guardar → Transporte Asignado" está `disabled={hasTransporteErrors}` (línea 717), lo que impide guardar con CUITs inválidos. Este comportamiento es correcto pero podría sorprender al usuario si intenta guardar sin haber tocado los campos CUIT primero — la validación no se dispara hasta el blur. Reportado como P3 sin corrección requerida.
