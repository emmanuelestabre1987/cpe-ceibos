# PROMPT — Frontend Agent: F-05 Asignación masiva de transporte

Sos el agente Frontend de CPE Campo (Avancargo). Implementás la feature de asignación masiva de transporte. Trabajás sobre el repo en `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé estos archivos antes de empezar:
- `src/pages/Home.tsx`
- `src/components/ui/CupoCard.tsx`
- `src/lib/storage.ts`
- `src/lib/validarCuit.ts`
- `src/App.tsx`
- `src/types/index.ts`

---

## Descripción del feature

Desde el Panel de Cupos (Home), el usuario puede activar un modo de selección, elegir varios cupos en estado `IMPORTADO`, y aplicarles los datos de transporte a todos a la vez. Esto evita tener que entrar a cada cupo individualmente cuando llega un camión con múltiples cupos del mismo viaje.

---

## TAREA 1 — Modificar CupoCard.tsx

Agregar props opcionales para el modo selección. **No romper la interfaz existente** — todo debe funcionar igual cuando las props no se pasan.

### Props nuevas

```ts
export interface CupoCardProps {
  cupo: CpeRecord
  onClick: () => void
  onActionClick: (tab: TabTarget) => void
  // Nuevas opcionales:
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}
```

### Comportamiento en modo selección (`selectable === true`)

- El click en el cuerpo de la card llama `onToggleSelect()` en lugar de `onClick()`
- El action strip (fila inferior con "Asignar transporte", etc.) **no se renderiza** en modo selección
- En el lado izquierdo del row de código (fila 1), mostrar un checkbox circular:
  - Deseleccionado: círculo con borde `border-2 border-gray-300 w-5 h-5 rounded-full`
  - Seleccionado: círculo relleno con `bg-secondary` y un tick blanco (`CheckCircle` de lucide-react, `w-5 h-5 text-white`)
- El borde de la card cuando está seleccionada: `border-secondary border-2` en lugar de `border-gray-light`

### Implementación

```tsx
export default function CupoCard({ cupo, onClick, onActionClick, selectable, selected, onToggleSelect }: CupoCardProps) {
  // ...código existente...

  const handleCardClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect()
    } else {
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-all ${
        selected ? 'border-secondary border-2' : 'border-gray-light'
      }`}
    >
      <div className="px-4 pt-4 pb-3">
        {/* Row 1: checkbox (si selectable) + code + badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          {selectable && (
            <div className="shrink-0 mt-0.5">
              {selected
                ? <CheckCircle className="w-5 h-5 text-secondary" />
                : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              }
            </div>
          )}
          <p className="font-mono font-bold text-primary text-sm leading-snug flex-1 min-w-0 break-all">
            {displayCode}
          </p>
          <span
            className="shrink-0 inline-block px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold text-white leading-5"
            style={{ backgroundColor: bg }}
          >
            {statusLabel}
          </span>
        </div>
        {/* ...resto igual... */}
      </div>

      {/* Action strip: solo cuando NO está en modo selección */}
      {!selectable && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onActionClick(tab) }}
          className="w-full flex items-center justify-end gap-2 px-4 border-t border-gray-light bg-gray-50 text-secondary font-sans text-sm font-medium hover:bg-blue-50 active:bg-blue-100 transition-colors"
          style={{ minHeight: '48px' }}
        >
          <ActionIcon className="w-4 h-4 shrink-0" />
          <span>{actionLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
        </button>
      )}
    </div>
  )
}
```

Acordate de importar `CheckCircle` de lucide-react.

---

## TAREA 2 — Modificar Home.tsx

Agregar modo de selección múltiple.

### Imports nuevos

```ts
import { Layers } from 'lucide-react'
```

### Estado nuevo

```ts
const [selectMode,   setSelectMode]   = useState(false)
const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
```

### Handlers nuevos

```ts
const toggleSelectMode = () => {
  setSelectMode(v => !v)
  setSelectedIds(new Set())
  setFabOpen(false)
}

const toggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}
```

### Botón "Seleccionar" / "Cancelar selección"

En la fila del contador de cupos (la que tiene `filtered.length cupos` y el botón de refresh), agregar un tercer elemento a la derecha del refresh button:

```tsx
<button
  onClick={toggleSelectMode}
  className={`flex items-center gap-1 px-3 h-7 rounded-full font-mono text-xs font-medium transition-colors ${
    selectMode
      ? 'bg-secondary text-white'
      : 'text-text-muted hover:text-secondary'
  }`}
>
  <Layers className="w-3.5 h-3.5" />
  {selectMode ? 'Cancelar' : 'Seleccionar'}
</button>
```

La fila queda: `[count] ... [refresh] [seleccionar]`

### Modificar el render de las cards

En el map que genera `<CupoCard>`, pasar las nuevas props:

```tsx
<CupoCard
  key={r.id}
  cupo={r}
  onClick={() => handleCardClick(r.id)}
  onActionClick={(tab) => handleActionClick(r.id, tab)}
  selectable={selectMode}
  selected={selectedIds.has(r.id)}
  onToggleSelect={() => toggleSelect(r.id)}
/>
```

En `selectMode`, el handler `handleCardClick` no se llamará (CupoCard llama `onToggleSelect` en su lugar), pero igual lo dejás como prop requerida de `CupoCard`.

### Barra de acción inferior (cuando hay cupos seleccionados)

Renderizar **encima** del FAB, solo cuando `selectMode && selectedIds.size > 0`:

```tsx
{selectMode && selectedIds.size > 0 && (
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-light px-4 py-3 pb-safe">
    <div className="max-w-mobile mx-auto flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm font-bold text-primary">
          {selectedIds.size} {selectedIds.size === 1 ? 'cupo seleccionado' : 'cupos seleccionados'}
        </p>
        <p className="font-sans text-xs text-text-muted">Solo cupos en estado IMPORTADO</p>
      </div>
      <button
        onClick={() => {
          const ids = Array.from(selectedIds).join(',')
          navigate(`/asignar-transporte?ids=${ids}`)
        }}
        className="shrink-0 h-11 px-5 rounded-xl font-sans text-sm font-semibold text-white transition active:scale-95"
        style={{ backgroundColor: '#2C9FC0' }}
      >
        Asignar transporte →
      </button>
    </div>
  </div>
)}
```

**Importante:** cuando `selectMode` está activo, ocultá el FAB (botón + y sub-acciones) para evitar conflicto visual. Podés hacerlo condicionando el render del FAB con `{!selectMode && (...)}`  o simplemente dando menor z-index — lo más simple es no renderizarlo cuando `selectMode === true`.

### Filtrar solo IMPORTADO en selección

Cuando `selectMode === true`, solo los cupos con `status === 'IMPORTADO'` son seleccionables. Los demás se muestran pero con `selectable={false}` para que no tengan checkbox ni cambien de comportamiento:

```tsx
selectable={selectMode && r.status === 'IMPORTADO'}
```

---

## TAREA 3 — Crear AsignarTransporte.tsx

Nuevo archivo: `src/pages/AsignarTransporte.tsx`

Ruta: `/asignar-transporte?ids=uuid1,uuid2,...`

### Flujo

1. Lee `ids` de los query params → array de strings (UUIDs internos de `cpe_records.id`)
2. Fetcha los registros con `Promise.all(ids.map(id => getRecord(id)))`
3. Muestra un resumen de los cupos seleccionados
4. Formulario de transporte (igual al tab Transporte de DetalleCupo)
5. Al confirmar: para cada registro, llama `updateRecord` + `updateCupoStatus`
6. Navega a `/` con toast de éxito

### Imports

```ts
import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Truck } from 'lucide-react'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import SectionTitle from '../components/ui/SectionTitle'
import { FormField } from '../components/forms/FormField'
import VoiceInput from '../components/forms/VoiceInput'
import { useToast } from '../components/ui/Toast'
import { getRecord, updateRecord, updateCupoStatus } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { validarCuit, formatearCuit, normalizarCuit } from '../lib/validarCuit'
import type { CpeRecord } from '../types'
```

### Estado

```ts
const [records,  setRecords]  = useState<CpeRecord[]>([])
const [loading,  setLoading]  = useState(true)
const [saving,   setSaving]   = useState(false)
const [cuitErrors, setCuitErrors] = useState<{ cuit_transporte?: string; cuil_chofer?: string }>({})

// Form
const [transporte,      setTransporte]      = useState('')
const [cuit_transporte, setCuitTransporte]  = useState('')
const [chofer,          setChofer]          = useState('')
const [cuil_chofer,     setCuilChofer]      = useState('')
const [chasis,          setChasis]          = useState('')
const [acoplado,        setAcoplado]        = useState('')
```

### Fetch inicial

```ts
const [searchParams] = useSearchParams()
const navigate = useNavigate()
const { user } = useAuth()
const { show, ToastComponent } = useToast()

useEffect(() => {
  const raw = searchParams.get('ids') ?? ''
  const ids = raw.split(',').filter(Boolean)
  if (ids.length === 0) { navigate('/'); return }

  setLoading(true)
  Promise.all(ids.map(id => getRecord(id)))
    .then(results => {
      const valid = results.filter((r): r is CpeRecord => r !== null && r.status === 'IMPORTADO')
      if (valid.length === 0) { navigate('/'); return }
      setRecords(valid)
    })
    .catch(() => show('Error al cargar cupos', 'error'))
    .finally(() => setLoading(false))
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

### Validadores CUIT/CUIL

Mismo patrón que DetalleCupo:

```ts
const validateCuitTransporte = () => {
  if (!cuit_transporte) { setCuitErrors(p => ({ ...p, cuit_transporte: undefined })); return }
  setCuitErrors(p => ({ ...p, cuit_transporte: validarCuit(cuit_transporte) ? undefined : 'CUIT inválido' }))
}
const validateCuilChofer = () => {
  if (!cuil_chofer) { setCuitErrors(p => ({ ...p, cuil_chofer: undefined })); return }
  setCuitErrors(p => ({ ...p, cuil_chofer: validarCuit(cuil_chofer) ? undefined : 'CUIL inválido' }))
}
const hasErrors = !!(cuitErrors.cuit_transporte || cuitErrors.cuil_chofer)
```

### Handler de guardar

```ts
const handleGuardar = async () => {
  if (!user?.email || hasErrors) return
  setSaving(true)

  const cuit = cuit_transporte ? formatearCuit(normalizarCuit(cuit_transporte)) : null
  const cuil = cuil_chofer     ? formatearCuit(normalizarCuit(cuil_chofer))     : null

  const changes = {
    transporte:      transporte      || null,
    cuit_transporte: cuit,
    chofer:          chofer          || null,
    cuil_chofer:     cuil,
    chasis:          chasis          || null,
    acoplado:        acoplado        || null,
  }

  try {
    await Promise.all(
      records.map(async (r) => {
        await updateRecord(r.id, r.cpe_id, changes, r, user.email!)
        await updateCupoStatus(r.cpe_id, 'TRANSPORTE', user.email!)
      })
    )
    show(`Transporte asignado a ${records.length} cupos`, 'success')
    navigate('/')
  } catch (e) {
    show((e as Error).message, 'error')
    setSaving(false)
  }
}
```

### Render

```tsx
// Loading
if (loading) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Asignación masiva" showBack />
      <div className="max-w-mobile mx-auto px-4 pt-20 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-14 bg-white rounded-xl border border-gray-light animate-pulse" />)}
      </div>
    </div>
  )
}

return (
  <div className="min-h-screen bg-gray-50 pb-28">
    <Header title="Asignación masiva" showBack />

    <div className="max-w-mobile mx-auto px-4 space-y-4 pt-20">

      {/* Resumen de cupos seleccionados */}
      <SectionTitle>
        {records.length} {records.length === 1 ? 'cupo seleccionado' : 'cupos seleccionados'}
      </SectionTitle>

      <div className="bg-white border border-gray-light rounded-2xl divide-y divide-gray-light">
        {records.map(r => (
          <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold text-primary truncate">
                {r.cupo ?? r.cpe_id}
              </p>
              <p className="font-sans text-xs text-text-muted truncate">
                {[r.grano, r.destinatario].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span
              className="shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-semibold text-white"
              style={{ backgroundColor: '#2C9FC0' }}
            >
              IMPORTADO
            </span>
          </div>
        ))}
      </div>

      {/* Formulario de transporte */}
      <SectionTitle>Datos del transporte</SectionTitle>

      <VoiceInput label="Transporte" value={transporte} onChange={setTransporte} />
      <FormField
        label="CUIT Transporte"
        value={cuit_transporte}
        onChange={setCuitTransporte}
        onBlur={validateCuitTransporte}
        error={cuitErrors.cuit_transporte}
      />
      <VoiceInput label="Chofer" value={chofer} onChange={setChofer} />
      <FormField
        label="CUIL Chofer"
        value={cuil_chofer}
        onChange={setCuilChofer}
        onBlur={validateCuilChofer}
        error={cuitErrors.cuil_chofer}
      />
      <VoiceInput label="Chasis / Patente" value={chasis} onChange={setChasis} />
      <VoiceInput label="Acoplado / Patente" value={acoplado} onChange={setAcoplado} />

    </div>

    {/* Bottom bar */}
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
      <div className="max-w-mobile mx-auto">
        <Button
          fullWidth
          size="lg"
          loading={saving}
          disabled={hasErrors}
          onClick={handleGuardar}
          style={{ backgroundColor: '#2C9FC0' }}
        >
          <Truck className="w-5 h-5" />
          Asignar transporte a {records.length} {records.length === 1 ? 'cupo' : 'cupos'}
        </Button>
      </div>
    </div>

    {ToastComponent}
  </div>
)
```

---

## TAREA 4 — Agregar ruta en App.tsx

Agregar el import y la ruta:

```ts
import AsignarTransporte from './pages/AsignarTransporte'
```

```tsx
<Route
  path="/asignar-transporte"
  element={
    <ProtectedRoute>
      <AsignarTransporte />
    </ProtectedRoute>
  }
/>
```

---

## Criterios de aceptación

**CupoCard:**
- [ ] Sin props `selectable`/`selected`, el comportamiento es idéntico al actual
- [ ] Con `selectable=true`, el click llama `onToggleSelect`, el action strip no se renderiza
- [ ] Con `selected=true`, la card tiene borde azul (`border-secondary`) y muestra checkbox relleno

**Home:**
- [ ] Botón "Seleccionar" aparece junto al contador de cupos
- [ ] Al activarse, las cards en IMPORTADO muestran checkbox; las demás siguen igual
- [ ] El FAB (+ y sub-acciones) no se renderiza en modo selección
- [ ] La barra inferior aparece cuando hay al menos 1 cupo seleccionado
- [ ] "Cancelar" desactiva el modo y limpia la selección
- [ ] El botón "Asignar transporte →" navega a `/asignar-transporte?ids=...`

**AsignarTransporte:**
- [ ] Si `ids` está vacío o todos son inválidos/no-IMPORTADO, redirige a `/`
- [ ] Muestra la lista de cupos seleccionados con código y datos básicos
- [ ] Formulario con los 6 campos de transporte
- [ ] Validación CUIT/CUIL en blur, botón deshabilitado si hay errores
- [ ] Al guardar: actualiza todos los registros + cambia status a TRANSPORTE para cada uno
- [ ] Navega a `/` con toast de éxito

**General:**
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] Archivos modificados: `CupoCard.tsx`, `Home.tsx`, `App.tsx`
- [ ] Archivo nuevo: `src/pages/AsignarTransporte.tsx`
