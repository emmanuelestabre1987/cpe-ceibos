# PROMPT — Frontend Agent: Fixes QA · OFF-1, OFF-2, A11Y-1 al A11Y-5, OFF-4

Sos el agente Frontend de CPE Campo (Avancargo). Tenés 7 fixes de QA para aplicar. Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé estos archivos antes de empezar:
- `src/hooks/useRecords.ts`
- `src/pages/Home.tsx`
- `src/pages/DetalleCupo.tsx`
- `src/pages/RecordDetail.tsx`
- `src/components/layout/Header.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/CupoCard.tsx`

---

## FIX 1 — OFF-1 (P1): Cache de registros para modo offline

**Problema:** `useRecords.ts` no cachea los datos. Si el agrónomo abre la app sin señal, el Panel de Cupos queda vacío.

**Solución:** stale-while-revalidate en `src/hooks/useRecords.ts`. Mostrar datos cacheados inmediatamente mientras se busca la versión fresca en segundo plano.

```ts
import { useState, useEffect, useCallback } from 'react'
import { getRecords } from '../lib/storage'
import type { CpeRecord } from '../types'

const CACHE_KEY = 'cpe_records_cache'

function readCache(): CpeRecord[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CpeRecord[]) : []
  } catch {
    return []
  }
}

function writeCache(records: CpeRecord[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(records))
  } catch { /* cuota excedida — ignorar */ }
}

export function useRecords() {
  const [records, setRecords] = useState<CpeRecord[]>(readCache)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecords()
      setRecords(data)
      writeCache(data)
    } catch (e) {
      // Si hay datos cacheados, no mostrar error — el usuario ve datos de la última sesión
      if (readCache().length === 0) {
        setError((e as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { records, loading, error, refresh: fetch }
}
```

**Comportamiento resultante:**
- Con señal: carga cache instantáneamente, refresca desde Supabase, actualiza cache
- Sin señal: muestra datos de la última sesión, no muestra error si hay cache
- Primera vez sin señal (sin cache): muestra el error actual

**No tocar** ningún otro archivo — el cambio es solo en `useRecords.ts`.

---

## FIX 2 — OFF-2 (P2): Draft por tab en DetalleCupo

**Problema:** si el agrónomo completa el Tab Transporte y la app se recarga (por mala señal, cierre accidental), pierde todos los datos ingresados.

**Solución:** auto-guardado en localStorage por tab, con debounce de 800ms. Mismo patrón que NewRecord.tsx (que ya lo tiene).

**En `src/pages/DetalleCupo.tsx`**, agregar al bloque de estado:

```ts
const [tabDirty, setTabDirty] = useState(false)
```

Agregar función utilitaria (fuera del componente, cerca de los helpers `str` y `numOrNull`):

```ts
const TAB_DRAFT_KEY = (id: string, tab: string) => `draft_detalle_${id}_${tab}`

function readTabDraft<T>(id: string, tab: string): T | null {
  try {
    const raw = localStorage.getItem(TAB_DRAFT_KEY(id, tab))
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

function writeTabDraft(id: string, tab: string, data: unknown) {
  try { localStorage.setItem(TAB_DRAFT_KEY(id, tab), JSON.stringify(data)) } catch { /* ignore */ }
}

function clearTabDraft(id: string, tab: string) {
  try { localStorage.removeItem(TAB_DRAFT_KEY(id, tab)) } catch { /* ignore */ }
}
```

**Restaurar drafts al cargar el record.** En el `useEffect` que inicializa los formularios (el que depende de `[record]`), DESPUÉS de llamar a los `initX()`:

```ts
useEffect(() => {
  if (!record) return
  // Inicializar con datos del server
  setDatosF(initDatos(record))
  setTransporteF(initTransporte(record))
  setPesajeF(initPesaje(record))
  setCierreF(initCierre(record))
  setCuitErrors({})

  // Restaurar drafts si existen (sobreescriben los datos del server)
  const draftDatos     = readTabDraft<DatosForm>(record.id, 'datos')
  const draftTransporte = readTabDraft<TransporteForm>(record.id, 'transporte')
  const draftPesaje    = readTabDraft<PesajeForm>(record.id, 'pesaje')
  const draftCierre    = readTabDraft<CierreForm>(record.id, 'cierre')

  if (draftDatos)      setDatosF(draftDatos)
  if (draftTransporte) setTransporteF(draftTransporte)
  if (draftPesaje)     setPesajeF(draftPesaje)
  if (draftCierre)     setCierreF(draftCierre)
}, [record])
```

**Auto-guardar en cada cambio de formulario.** Agregar cuatro `useEffect` de debounce, uno por tab. Ponerlos después del bloque de init:

```ts
// Auto-save drafts con debounce
useEffect(() => {
  if (!record?.id) return
  const t = setTimeout(() => writeTabDraft(record.id, 'datos', datosF), 800)
  return () => clearTimeout(t)
}, [datosF, record?.id])

useEffect(() => {
  if (!record?.id) return
  const t = setTimeout(() => writeTabDraft(record.id, 'transporte', transporteF), 800)
  return () => clearTimeout(t)
}, [transporteF, record?.id])

useEffect(() => {
  if (!record?.id) return
  const t = setTimeout(() => writeTabDraft(record.id, 'pesaje', pesajeF), 800)
  return () => clearTimeout(t)
}, [pesajeF, record?.id])

useEffect(() => {
  if (!record?.id) return
  const t = setTimeout(() => writeTabDraft(record.id, 'cierre', cierreF), 800)
  return () => clearTimeout(t)
}, [cierreF, record?.id])
```

**Limpiar draft al guardar exitosamente.** En cada handler de save, después del `await reload()` exitoso, agregar:

```ts
// En handleSaveDatos:
clearTabDraft(id, 'datos')

// En handleSaveTransporte:
clearTabDraft(id, 'transporte')

// En handleSavePesaje:
clearTabDraft(id, 'pesaje')

// En handleSaveCierre:
clearTabDraft(id, 'cierre')
// Y también limpiar todos al cerrar el cupo (es el estado final)
clearTabDraft(id, 'datos')
clearTabDraft(id, 'transporte')
clearTabDraft(id, 'pesaje')
```

**Limpiar draft al eliminar el cupo.** En `handleDeleteCupo`, antes del `navigate`:

```ts
if (record?.id) {
  ['datos', 'transporte', 'pesaje', 'cierre'].forEach(tab => clearTabDraft(record.id, tab))
}
```

**No agregar ningún indicador visual** — el draft se restaura silenciosamente. El objetivo es solo evitar pérdida de datos, no interrumpir el flujo.

---

## FIX 3 — A11Y-1 (P2): Contraste del badge TRANSPORTE

**Problema:** badge `TRANSPORTE` usa `#F59E0B` (amarillo) con texto blanco → ratio ~1.9:1, falla WCAG AA (mínimo 4.5:1 para texto pequeño). Ilegible bajo sol directo en campo.

**Fix:** cambiar el texto del badge TRANSPORTE a color oscuro en lugar de blanco.

**En `src/components/ui/CupoCard.tsx`**, el STATUS_CONFIG ya tiene el `bg` color. Agregar un campo `text` para controlar el color del texto:

```ts
const STATUS_CONFIG: Record<CupoStatus, { bg: string; label: string; text: string }> = {
  IMPORTADO:  { bg: '#2C9FC0', label: 'IMPORTADO',  text: '#ffffff' },
  TRANSPORTE: { bg: '#F59E0B', label: 'TRANSPORTE', text: '#1E3252' }, // texto oscuro
  CARGADO:    { bg: '#FF6C02', label: 'CARGADO',    text: '#ffffff' },
  CERRADO:    { bg: '#16A34A', label: 'CERRADO',    text: '#ffffff' },
  ENVIADO:    { bg: '#15803D', label: 'ENVIADO',    text: '#ffffff' },
}
```

En el JSX del badge, reemplazar `text-white` hardcodeado por el color del config:

```tsx
<span
  className="shrink-0 inline-block px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold leading-5"
  style={{ backgroundColor: bg, color: text }}
>
  {statusLabel}
</span>
```

Aplicar el mismo cambio en **`src/pages/DetalleCupo.tsx`**. El `STATUS_CONFIG` de DetalleCupo también tiene `bg` sin `text`. Agregar el campo `text` igual:

```ts
const STATUS_CONFIG: Record<CupoStatus, { bg: string; label: string; text: string }> = {
  IMPORTADO:  { bg: '#2C9FC0', label: 'IMPORTADO',  text: '#ffffff' },
  TRANSPORTE: { bg: '#F59E0B', label: 'TRANSPORTE', text: '#1E3252' },
  CARGADO:    { bg: '#FF6C02', label: 'CARGADO',    text: '#ffffff' },
  CERRADO:    { bg: '#16A34A', label: 'CERRADO',    text: '#ffffff' },
  ENVIADO:    { bg: '#15803D', label: 'ENVIADO',    text: '#ffffff' },
}
```

Y en el `rightElement` del Header en DetalleCupo, usar `color: statusCfg.text`:

```tsx
<span
  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold"
  style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
>
  {statusCfg.label}
</span>
```

---

## FIX 4 — A11Y-2/3 (P3): aria-label en botones del Header

**Problema:** los botones Volver (ChevronLeft) y Logout (LogOut) en Header.tsx no tienen `aria-label`. Los lectores de pantalla no pueden describirlos.

**En `src/components/layout/Header.tsx`**, agregar `aria-label` a los dos botones:

```tsx
{showBack && (
  <button
    onClick={() => navigate(-1)}
    aria-label="Volver"
    className="text-white p-1 -ml-1 rounded-lg active:bg-white/10"
  >
    <ChevronLeft className="w-6 h-6" />
  </button>
)}
```

```tsx
<button
  onClick={handleLogout}
  aria-label="Cerrar sesión"
  className="text-white p-1 rounded-lg active:bg-white/10"
>
  <LogOut className="w-5 h-5" />
</button>
```

---

## FIX 5 — A11Y-4 (P3): Button size `sm` por debajo del mínimo táctil

**Problema:** `Button` con `size="sm"` tiene `h-9` (36px). El mínimo táctil recomendado para móvil es 44px.

**En `src/components/ui/Button.tsx`**, cambiar la línea del tamaño `sm`:

```ts
const sizes = {
  sm: 'h-11 px-3 text-sm',   // era h-9 (36px) → ahora h-11 (44px)
  md: 'h-12 px-5 text-base',
  lg: 'h-14 px-6 text-lg',
}
```

Verificar que no haya lugares en la UI donde `size="sm"` se use en un contexto donde 44px rompa el layout (ej: Header `rightElement`). Si algún caso se ve mal, ese botón específico puede usar `className` override para ajustar, pero no revertir el default.

---

## FIX 6 — A11Y-5 (P3): Colores de badges en RecordDetail.tsx

**Problema:** `RecordDetail.tsx` es la pantalla legacy (`/registro/:id`). Usa `<Badge>` con `variant` fija: `'green'` si es CERRADO/ENVIADO, `'orange'` para todos los demás. Esto hace que IMPORTADO, TRANSPORTE y CARGADO muestren el mismo badge naranja, sin distinción.

**En `src/pages/RecordDetail.tsx`**, reemplazar el badge de status por un span inline con los colores exactos del sistema:

Buscar este bloque (alrededor de línea 181):
```tsx
<Badge
  label={record.status}
  variant={record.status === 'CERRADO' || record.status === 'ENVIADO' ? 'green' : 'orange'}
/>
```

Reemplazarlo por:
```tsx
{(() => {
  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    IMPORTADO:  { bg: '#2C9FC0', text: '#ffffff' },
    TRANSPORTE: { bg: '#F59E0B', text: '#1E3252' },
    CARGADO:    { bg: '#FF6C02', text: '#ffffff' },
    CERRADO:    { bg: '#16A34A', text: '#ffffff' },
    ENVIADO:    { bg: '#15803D', text: '#ffffff' },
  }
  const cfg = STATUS_COLORS[record.status] ?? { bg: '#2C9FC0', text: '#ffffff' }
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {record.status}
    </span>
  )
})()}
```

---

## FIX 7 — OFF-4 (P3): Runtime caching del service worker para Supabase

**Problema:** el service worker cachea assets estáticos pero no las respuestas de la API de Supabase. Las llamadas a `getRecords()` siempre fallan offline.

**Nota:** OFF-1 ya resuelve el caso principal con localStorage. Este fix es complementario (mejora la experiencia de cupos individuales visitados recientemente).

Buscar el archivo de configuración del service worker. Puede estar en:
- `vite.config.ts` (con `vite-plugin-pwa`)
- `public/sw.js` o `public/service-worker.js`
- `src/sw.ts`

Si existe configuración de `vite-plugin-pwa`, agregar runtime caching para el dominio de Supabase:

```ts
// En el objeto workbox dentro de VitePWA():
runtimeCaching: [
  {
    urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
    handler: 'NetworkFirst',
    options: {
      cacheName: 'supabase-api-cache',
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 hora
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
],
```

Si **no existe** configuración de service worker (puede ser que la PWA use solo el registro básico), documentar en un comentario en `vite.config.ts` que falta configurar el runtime caching y que OFF-1 es el workaround actual. No crear un service worker desde cero — eso requiere más contexto del equipo.

---

## Criterios de aceptación

**OFF-1:**
- [ ] `useRecords.ts` lee de localStorage al montar (datos instantáneos)
- [ ] Después de fetch exitoso, escribe en localStorage
- [ ] Si fetch falla pero hay cache, no muestra error
- [ ] `npm run build` pasa sin errores

**OFF-2:**
- [ ] Al editar Tab Transporte y recargar, los datos persisten
- [ ] Al guardar exitosamente, el draft de ese tab se limpia
- [ ] Al eliminar el cupo, todos los drafts se limpian
- [ ] No hay ningún indicador visual agregado (silencioso)

**A11Y-1:**
- [ ] Badge TRANSPORTE en CupoCard tiene texto `#1E3252` (oscuro)
- [ ] Badge TRANSPORTE en DetalleCupo header tiene texto `#1E3252`
- [ ] Resto de badges mantienen texto blanco

**A11Y-2/3:**
- [ ] Botón back en Header tiene `aria-label="Volver"`
- [ ] Botón logout en Header tiene `aria-label="Cerrar sesión"`

**A11Y-4:**
- [ ] `Button` size `sm` mide `h-11` (44px)
- [ ] Ningún layout se rompió visualmente por el cambio

**A11Y-5:**
- [ ] RecordDetail.tsx muestra cada status con su color exacto
- [ ] TRANSPORTE tiene texto oscuro (consistente con A11Y-1)

**OFF-4:**
- [ ] Si existe config de PWA: runtime caching para Supabase agregado
- [ ] Si no existe: comentario documentando la limitación

**Archivos a modificar:**
- `src/hooks/useRecords.ts`
- `src/pages/DetalleCupo.tsx`
- `src/components/ui/CupoCard.tsx`
- `src/components/layout/Header.tsx`
- `src/components/ui/Button.tsx`
- `src/pages/RecordDetail.tsx`
- `vite.config.ts` (solo si existe config PWA)

**No tocar** ningún otro archivo.
