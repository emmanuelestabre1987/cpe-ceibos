# Q-04 Comportamiento offline — Resultados

**Fecha:** 2026-05-08  
**Metodología:** Auditoría de código (sin ejecutar la app)

---

## Service Worker

**✅ Configurado — app shell cacheada, sin runtime caching para Supabase.**

`vite.config.ts` usa `vite-plugin-pwa` con `registerType: 'autoUpdate'`. Sin opciones `workbox` explícitas, el plugin aplica la estrategia por defecto: **precaching de todos los assets estáticos** (JS bundles, CSS, index.html).

Esto significa:
- La pantalla de Login y el scaffolding de la app cargan offline ✅
- Las llamadas a Supabase REST (`https://tndcfnjsrqhbczvmdlck.supabase.co`) **no están cacheadas** — no hay `runtimeCaching` configurado ❌
- Ninguna ruta de la app tiene cache-first ni stale-while-revalidate para datos

---

## Panel de Cupos sin conexión

**❌ No funciona.**

`src/hooks/useRecords.ts` (líneas 10–21): la carga de registros va directo a `getRecords()` que llama a Supabase. No hay caché en `localStorage` ni en `IndexedDB`.

**Flujo sin conexión:**
1. App shell carga (service worker entrega el HTML/JS) → pantalla visible ✅
2. `useRecords` llama a Supabase → network error
3. `setError((e as Error).message)` → Home.tsx muestra el mensaje de error con fondo rojo ✅ (no crash)
4. La lista de cupos queda vacía — **el operador no puede ver los cupos que tenía antes** ❌

**Veredicto: ❌ no funciona** — la lista queda vacía y no hay datos del día anterior accesibles.

---

## DetalleCupo sin conexión

**⚠️ Parcial — muestra error claro pero pierde los datos del formulario.**

`DetalleCupo.tsx` no usa `localStorage` ni `IndexedDB`. Si el operador:
1. Entra al detalle de un cupo (ya cargado en el estado React) — el cupo se muestra porque ya está en memoria ⚠️ (solo mientras no recargue la página)
2. Llena el tab Transporte con datos de chofer/camión
3. Toca "Guardar → Transporte Asignado"
4. `handleSaveTransporte()` llama a `updateRecord()` → Supabase call falla
5. El `catch` del `try/catch` (línea 488) hace `show((e as Error).message, 'error')` → toast de error ✅
6. El formulario mantiene los datos ingresados en memoria (el componente no se desmonta) ✅
7. **Pero si el operador sale de la pantalla o recarga, los datos se pierden** ❌

**Caso peor:** el operador recarga la app (común en campo con señal intermitente). Todo se pierde.

**Veredicto: ⚠️ parcial** — muestra error claro, no crashea, pero los datos ingresados no se persisten localmente.

---

## Borrador en NewRecord

**❌ No implementado.**

Búsqueda de `draft_new_record` o `localStorage` en `src/pages/NewRecord.tsx`: **ningún resultado**. El wizard siempre arranca con `const empty: RecordFormData = { ... }` (valores vacíos). Si el operador completa 5 pasos del wizard y la app se recarga, pierde todo.

---

## Indicador visual offline

**✅ Implementado — tanto barra naranja global como ConnectionDot.**

| Componente | Ubicación | Estado |
|---|---|---|
| `useOnlineStatus` hook | `src/hooks/useOnlineStatus.ts` | ✅ Escucha `window.addEventListener('online'/'offline')` |
| `GlobalStatusBanner` | `src/App.tsx:16–41` | ✅ Barra naranja fija en top-14 con texto "Sin conexión — modo offline" |
| Toast de reconexión | `src/App.tsx:22–25` | ✅ Toast "Conexión restaurada" cuando `isOnline` vuelve a true |
| `ConnectionDot` | `src/pages/Home.tsx:201` | ✅ Punto rojo/verde en el header del Panel de Cupos |

---

## Issues detectados

| ID | Prioridad | Descripción | Agente |
|---|---|---|---|
| OFF-1 | P1 | Lista de cupos vacía sin conexión — el operador no puede trabajar si la señal falla al abrir la app | Frontend |
| OFF-2 | P2 | Datos ingresados en DetalleCupo (Transporte, Pesaje, Cierre) se pierden si la conexión falla y el usuario navega o recarga | Frontend |
| OFF-3 | P2 | Wizard NewRecord no tiene borrador en localStorage — el operador pierde el formulario completo si la app se recarga | Frontend |
| OFF-4 | P3 | Service worker no tiene runtime caching para las llamadas a Supabase — imposible pre-fetch o stale-while-revalidate | Frontend/Infra |

---

## Recomendaciones

**1. Cache de lista de cupos en localStorage (OFF-1 — P1)**

En `useRecords.ts`, persistir en `localStorage` tras cada fetch exitoso y usarlo como valor inicial:

```ts
const CACHE_KEY = 'cupos_cache'

const [records, setRecords] = useState<CpeRecord[]>(() => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    return cached ? JSON.parse(cached) : []
  } catch { return [] }
})

// En el fetch exitoso:
setRecords(data)
localStorage.setItem(CACHE_KEY, JSON.stringify(data))
```

**2. Draft de formulario en DetalleCupo (OFF-2 — P2)**

Guardar el estado de cada tab en `localStorage` con clave `draft_cupo_${id}_transporte`, etc., al detectar cambios (`onChange`). Limpiar al guardar exitosamente.

**3. Draft de NewRecord (OFF-3 — P2)**

Implementar `draft_new_record` en localStorage (ya está el patrón en mente). Guardar el estado del form en cada step, recuperarlo al montar el componente.
