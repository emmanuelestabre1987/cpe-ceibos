# PROMPT — Frontend Agent: Tab Cupos en Admin + Menú ⋮ en DetalleCupo

Sos el agente Frontend de CPE Campo (Avancargo). Hay dos tareas en este sprint. Trabajás sobre el repo en `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`. Stack: Vite + React + TypeScript + Tailwind CSS + Supabase.

Leé los archivos fuente antes de tocar cualquier cosa:
- `src/pages/Admin.tsx`
- `src/pages/DetalleCupo.tsx`
- `src/lib/storage.ts`
- `src/types/index.ts`
- `src/lib/auth.ts`

---

## TAREA 1 — Tab "Cupos" en Admin.tsx

### Contexto

`src/pages/Admin.tsx` tiene tabs: `'usuarios' | 'logs' | 'stats'`. Hay que agregar un 4.º tab `'cupos'` que permita ver y operar sobre todos los registros CPE.

### Cambios en imports

Agregar a los imports existentes de Admin.tsx:

```ts
import { Package } from 'lucide-react'
import { updateCupoStatus, deleteRecord } from '../lib/storage'
import { CPE_STATUS_ORDER, type CpeStatus } from '../types'
```

`getRecords` ya está importado y ya se llama en el `useEffect` existente. No duplicar.

### Cambios en el tipo del tab y estado

Actualizar el tipo del estado `tab`:

```ts
const [tab, setTab] = useState<'usuarios' | 'logs' | 'stats' | 'cupos'>('usuarios')
```

Agregar estado nuevo en el bloque de estado existente:

```ts
// Cupos tab
const [cupoStatus, setCupoStatus] = useState<CpeStatus | 'TODOS'>('TODOS')
const [cupoGrano,  setCupoGrano]  = useState('')
const [cupoSearch, setCupoSearch] = useState('')
const [deletingId, setDeletingId] = useState<string | null>(null)
```

### Handlers

Agregar junto a los handlers existentes:

```ts
const handleCupoStatusChange = async (cpeId: string, newStatus: CpeStatus) => {
  if (!user?.email) return
  try {
    await updateCupoStatus(cpeId, newStatus, user.email)
    setRecords(await getRecords())
    show('Estado actualizado', 'success')
  } catch (e) {
    show((e as Error).message, 'error')
  }
}

const handleDeleteCupo = async (id: string) => {
  if (!confirm('¿Eliminar este cupo? Esta acción no se puede deshacer.')) return
  if (!user?.email) return
  setDeletingId(id)
  try {
    await deleteRecord(id, user.email)
    setRecords(await getRecords())
    show('Cupo eliminado', 'success')
  } catch (e) {
    show((e as Error).message, 'error')
  } finally {
    setDeletingId(null)
  }
}
```

### Lógica de filtrado

Agregar antes del return:

```ts
const filteredCupos = records.filter(r => {
  if (cupoStatus !== 'TODOS' && r.status !== cupoStatus) return false
  if (cupoGrano && r.grano !== cupoGrano) return false
  if (cupoSearch.trim()) {
    const q = cupoSearch.toLowerCase()
    return (
      r.cpe_id.toLowerCase().includes(q) ||
      (r.cupo ?? '').toLowerCase().includes(q) ||
      (r.destinatario ?? '').toLowerCase().includes(q) ||
      (r.campo ?? '').toLowerCase().includes(q)
    )
  }
  return true
})

const granosUnicos = Array.from(new Set(records.map(r => r.grano).filter(Boolean))) as string[]
```

### Tab switcher

En el array de tabs del mapa existente, agregar el nuevo tab:

```ts
{ id: 'cupos', icon: Package, label: 'Cupos' },
```

El orden queda: Usuarios, Logs, Stats, Cupos.

### JSX del tab Cupos

Colores de status (usalos inline con `style={{ backgroundColor }}`):
- `IMPORTADO` → `#2C9FC0`
- `TRANSPORTE` → `#F59E0B`
- `CARGADO` → `#FF6C02`
- `CERRADO` → `#16A34A`
- `ENVIADO` → `#15803D`

```tsx
{tab === 'cupos' && (
  <div className="space-y-3">
    {/* Filtros */}
    <div className="flex items-center gap-2 bg-white border border-gray-light rounded-xl px-3 h-11">
      <Search className="w-4 h-4 text-text-muted shrink-0" />
      <input
        type="search"
        value={cupoSearch}
        onChange={e => setCupoSearch(e.target.value)}
        placeholder="Buscar por código, destinatario…"
        className="flex-1 bg-transparent font-sans text-sm text-primary placeholder:text-text-muted focus:outline-none"
      />
    </div>

    <div className="flex gap-2">
      <select
        value={cupoStatus}
        onChange={e => setCupoStatus(e.target.value as CpeStatus | 'TODOS')}
        className="flex-1 h-9 px-3 rounded-xl border border-gray-light font-mono text-xs bg-white text-primary"
      >
        <option value="TODOS">Todos los estados</option>
        {CPE_STATUS_ORDER.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={cupoGrano}
        onChange={e => setCupoGrano(e.target.value)}
        className="flex-1 h-9 px-3 rounded-xl border border-gray-light font-mono text-xs bg-white text-primary"
      >
        <option value="">Todos los granos</option>
        {granosUnicos.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
    </div>

    {/* Lista */}
    {filteredCupos.length === 0 && (
      <div className="text-center py-10">
        <p className="font-sans text-text-muted text-sm">Sin resultados</p>
      </div>
    )}

    {filteredCupos.map(r => {
      const STATUS_COLORS: Record<string, string> = {
        IMPORTADO: '#2C9FC0', TRANSPORTE: '#F59E0B',
        CARGADO: '#FF6C02', CERRADO: '#16A34A', ENVIADO: '#15803D',
      }
      const bg = STATUS_COLORS[r.status] ?? '#2C9FC0'
      return (
        <div
          key={r.id}
          className="bg-white border border-gray-light rounded-xl px-4 py-3 space-y-2"
        >
          {/* Fila 1: código + badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold text-primary">
              {r.cupo ?? r.cpe_id}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold text-white shrink-0"
              style={{ backgroundColor: bg }}
            >
              {r.status}
            </span>
          </div>

          {/* Fila 2: destinatario + grano */}
          <p className="font-sans text-xs text-text-muted">
            {r.destinatario ?? '—'} · {r.grano ?? '—'}
          </p>

          {/* Fila 3: select de status + eliminar */}
          <div className="flex items-center gap-2">
            <select
              value={r.status}
              onChange={e => handleCupoStatusChange(r.cpe_id, e.target.value as CpeStatus)}
              className="flex-1 h-8 px-2 rounded-lg border border-gray-light font-mono text-xs bg-white text-primary"
            >
              {CPE_STATUS_ORDER.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {adminOk && (
              <button
                onClick={() => handleDeleteCupo(r.id)}
                disabled={deletingId === r.id}
                className="p-1.5 text-text-muted hover:text-red-600 transition disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )
    })}
  </div>
)}
```

---

## TAREA 2 — Menú ⋮ en DetalleCupo.tsx

### Contexto

`src/pages/DetalleCupo.tsx` tiene un `<Header>` con `rightElement` que muestra solo el badge de status. Hay que agregar un botón ⋮ que abre un menú de acciones sin romper nada de lo que ya existe.

### Cambios en imports

Agregar:

```ts
import { MoreVertical } from 'lucide-react'
import { deleteRecord } from '../lib/storage'
import { isAdmin } from '../lib/auth'
```

### Estado nuevo

Agregar junto al estado existente:

```ts
const [menuOpen,      setMenuOpen]      = useState(false)
const [forceOpen,     setForceOpen]     = useState(false)
const [deleteConfirm, setDeleteConfirm] = useState(false)
const [userIsAdmin,   setUserIsAdmin]   = useState(false)
```

### Cargar isAdmin

En el `useEffect` que ya carga el record (el que depende de `[id]`), agregar dentro del bloque:

```ts
if (user?.email) {
  isAdmin(user.email).then(setUserIsAdmin).catch(() => {})
}
```

### Handlers nuevos

Agregar junto a los handlers de save existentes. No tocar ninguno de los handlers existentes.

```ts
const handleForceStatus = async (newStatus: CpeStatus) => {
  if (!record || !user?.email) return
  setSaving(true)
  try {
    await updateCupoStatus(record.cpe_id, newStatus, user.email)
    await reload()
    setForceOpen(false)
    show(`Estado forzado a ${newStatus}`, 'success')
  } catch (e) {
    show((e as Error).message, 'error')
  } finally {
    setSaving(false)
  }
}

const handleDeleteCupo = async () => {
  if (!record || !user?.email || !id) return
  setSaving(true)
  try {
    await deleteRecord(id, user.email)
    navigate('/', { replace: true })
  } catch (e) {
    show((e as Error).message, 'error')
    setSaving(false)
  }
}
```

### rightElement del Header

Reemplazar el `rightElement` actual (que es solo el span de badge) por:

```tsx
rightElement={
  <div className="flex items-center gap-2">
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold text-white"
      style={{ backgroundColor: statusCfg.bg }}
    >
      {statusCfg.label}
    </span>
    <button
      onClick={() => setMenuOpen(true)}
      className="p-1.5 rounded-lg text-white hover:bg-white/20 transition"
    >
      <MoreVertical className="w-5 h-5" />
    </button>
  </div>
}
```

### JSX de los modales / sheets

Agregar al final del return, **antes** de `{ToastComponent}`:

```tsx
{/* ── Menu bottom sheet ──────────────────────────────────── */}
{menuOpen && (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
    onClick={() => setMenuOpen(false)}
  >
    <div
      className="bg-white rounded-t-2xl w-full max-w-mobile p-4 space-y-2 pb-safe"
      onClick={e => e.stopPropagation()}
    >
      <p className="font-mono text-xs text-text-muted uppercase tracking-widest px-1 pb-1">
        Acciones
      </p>
      <button
        className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-primary hover:bg-gray-50 transition"
        onClick={() => { setMenuOpen(false); setForceOpen(true) }}
      >
        Forzar estado
      </button>
      {userIsAdmin && (
        <button
          className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-red-600 hover:bg-red-50 transition"
          onClick={() => { setMenuOpen(false); setDeleteConfirm(true) }}
        >
          Eliminar cupo
        </button>
      )}
      <button
        className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-text-muted hover:bg-gray-50 transition"
        onClick={() => setMenuOpen(false)}
      >
        Cancelar
      </button>
    </div>
  </div>
)}

{/* ── Forzar estado bottom sheet ─────────────────────────── */}
{forceOpen && (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
    onClick={() => setForceOpen(false)}
  >
    <div
      className="bg-white rounded-t-2xl w-full max-w-mobile p-4 space-y-2 pb-safe"
      onClick={e => e.stopPropagation()}
    >
      <p className="font-mono text-xs text-text-muted uppercase tracking-widest px-1 pb-1">
        Seleccioná el nuevo estado
      </p>
      {(['IMPORTADO', 'TRANSPORTE', 'CARGADO', 'CERRADO', 'ENVIADO'] as CpeStatus[]).map(s => (
        <button
          key={s}
          disabled={s === status || saving}
          className={`w-full text-left px-4 py-3 rounded-xl font-mono text-sm font-medium transition ${
            s === status
              ? 'text-text-muted bg-gray-50 cursor-default'
              : 'text-primary hover:bg-gray-50'
          }`}
          onClick={() => handleForceStatus(s)}
        >
          {s === status ? `✓ ${s} (actual)` : s}
        </button>
      ))}
      <button
        className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-text-muted hover:bg-gray-50 transition"
        onClick={() => setForceOpen(false)}
      >
        Cancelar
      </button>
    </div>
  </div>
)}

{/* ── Confirmar eliminación ───────────────────────────────── */}
{deleteConfirm && (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
    <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
      <h3 className="font-mono font-bold text-red-600 text-lg">¿Eliminar cupo?</h3>
      <p className="font-sans text-sm text-text-muted leading-relaxed">
        Eliminás el cupo{' '}
        <strong className="font-mono text-primary">{displayCode}</strong>.
        Esta acción no se puede deshacer.
      </p>
      <div className="flex gap-3">
        <Button
          variant="ghost"
          fullWidth
          onClick={() => setDeleteConfirm(false)}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          fullWidth
          loading={saving}
          onClick={handleDeleteCupo}
          style={{ backgroundColor: '#DC2626' }}
        >
          Eliminar
        </Button>
      </div>
    </div>
  </div>
)}
```

---

## Criterios de aceptación

**Admin — tab Cupos:**
- [ ] Tab "Cupos" aparece en el switcher con ícono Package
- [ ] Filtros de status, grano y búsqueda libre funcionan (reducen la lista)
- [ ] El select inline de status llama `updateCupoStatus` y refresca la lista
- [ ] El botón eliminar (Trash2) solo aparece cuando `adminOk === true`
- [ ] Confirmar con `confirm()` antes de eliminar; refresca lista tras éxito

**DetalleCupo — menú ⋮:**
- [ ] Botón ⋮ aparece a la derecha del badge en el header
- [ ] Bottom sheet de menú se cierra al tocar el fondo o "Cancelar"
- [ ] "Forzar estado" muestra 5 opciones; el status actual aparece con ✓ y deshabilitado
- [ ] "Eliminar cupo" solo aparece si `userIsAdmin === true`
- [ ] Al confirmar eliminar, navega a `/` con `replace: true`
- [ ] Ningún handler de save existente fue tocado (datos, transporte, pesaje, cierre)

**General:**
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modificó ningún archivo fuera de `Admin.tsx` y `DetalleCupo.tsx`
