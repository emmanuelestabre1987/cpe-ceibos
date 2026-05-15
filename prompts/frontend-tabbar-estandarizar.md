# Agente: Front end | Rama: `dev`

## Contexto

Hay dos componentes de navegación por secciones que deben verse iguales:

- **`WizardProgress`** (`src/components/layout/WizardProgress.tsx`) — usado en `NewRecord`. Muestra: nombre del paso activo (izq) + contador "2 / 7" (der) + barra de progreso con dots tocables.
- **`TabBar`** (función interna en `src/pages/DetalleCupo.tsx` ~línea 368) — usado en `DetalleCupo`. Muestra: tabs horizontales scrolleables con underline.

Ambos tienen `bg-primary` (#1E3252) pero la estructura visual es completamente distinta. El objetivo es que `TabBar` quede visualmente idéntico a `WizardProgress`.

## Qué implementar

Reemplazar el `TabBar` en `DetalleCupo.tsx` para que adopte exactamente el mismo layout que `WizardProgress`:

```
┌─────────────────────────────────┐
│ Intervinientes          2 / 7   │   ← nombre tab activo + contador
│  ●━━━━●━━━━○━━━━○━━━━○━━━━○━━━━○  │   ← dots tocables = navegación entre tabs
└─────────────────────────────────┘
```

**Estructura del nuevo TabBar:**
- Mismo wrapper: `fixed top-14 left-0 right-0 z-30 bg-primary px-4 pt-2 pb-3`
- Fila 1: nombre del tab activo en `text-xs font-mono font-semibold text-white` (izq) + contador "N / 7" en `text-xs font-mono text-white/50` (der)
- Fila 2: barra de progreso con dots, igual que `WizardProgress`, pero cada dot es un `<button>` que llama a `onSelect(tabId)` al tocarlo

El orden de tabs es el mismo que hoy:
```
transporte(1) · intervinientes(2) · grano(3) · procedencia(4) · contingencias(5) · descarga(6) · historial(7)
```

Los dots deben verse:
- **Activo**: `bg-white border-white scale-125`
- **Completado** (índice < activo): `bg-secondary border-secondary`
- **Pendiente**: `bg-white/20 border-white/20`

La barra de progreso rellena hasta el dot activo con `bg-secondary`, igual que `WizardProgress`.

## Criterios de verificación

- [ ] En `/cupo/:id` el componente de navegación se ve idéntico al de `/nueva-carga`
- [ ] Tocar un dot navega al tab correspondiente
- [ ] El nombre del tab activo y el contador se actualizan al navegar
- [ ] No hay regresiones en la navegación entre tabs de `DetalleCupo`

## Archivo a modificar

- `src/pages/DetalleCupo.tsx` — función `TabBar` (~líneas 368–389)
