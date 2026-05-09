# PROMPT — Agente Frontend: Sprint 10 · Eliminar cupos CANCELADO en bulk

Sos el agente Frontend de CPE Campo (Avancargo). Tenés una sola tarea. Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé estos archivos antes de empezar:
- `src/pages/Home.tsx` — panel principal, action bar de selección masiva
- `src/lib/storage.ts` — función `deleteRecord` (línea ~318)

---

## Contexto

El usuario puede cancelar cupos masivamente desde el panel. Los cupos en estado CANCELADO deben poder eliminarse definitivamente (para liberar su código de negocio y limpiar la lista).

La función `deleteRecord` ya existe en `storage.ts`. Solo hay que exponerla en la UI de selección masiva, pero **únicamente para cupos en estado CANCELADO**.

---

## TAREA — Botón "Eliminar" en el action bar de selección masiva

### Lógica del botón

En el action bar de selección (el que aparece cuando `selectMode && selectedIds.size > 0`), agregar un botón "Eliminar" que:

- **Solo se muestra** si TODOS los cupos seleccionados están en estado `CANCELADO`
- Al tocar, muestra un modal de confirmación
- Al confirmar, llama a `deleteRecord` para cada cupo seleccionado en paralelo
- Al terminar: muestra toast de éxito, limpia selección, desactiva select mode, llama a `refresh()`

### Verificar que todos los seleccionados son CANCELADO

```ts
const allCancelled = Array.from(selectedIds).every(id =>
  records.find(r => r.id === id)?.status === 'CANCELADO'
)
```

Mostrar el botón solo si `allCancelled === true`.

### Importar deleteRecord

```ts
import { updateCupoStatus, deleteRecord } from '../lib/storage'
```

### Estado nuevo

```ts
const [deleteConfirm,  setDeleteConfirm]  = useState(false)
const [deleting,       setDeleting]       = useState(false)
```

### Handler

```ts
const handleDeleteSelected = async () => {
  if (!user?.email) return
  setDeleting(true)
  try {
    const toDelete = records.filter(r => selectedIds.has(r.id))
    await Promise.all(toDelete.map(r => deleteRecord(r.id, r.cpe_id, user.email!)))
    show(`${toDelete.length} ${toDelete.length === 1 ? 'cupo eliminado' : 'cupos eliminados'}`, 'success')
    setSelectedIds(new Set())
    setSelectMode(false)
    setDeleteConfirm(false)
    refresh()
  } catch {
    show('Error al eliminar los cupos', 'error')
  } finally {
    setDeleting(false)
  }
}
```

### Verificar firma de deleteRecord

Leer `storage.ts` línea ~318 para confirmar los parámetros exactos de `deleteRecord` antes de llamarla.

### Botón en el action bar

Agregar junto a los botones existentes (Cancelar / Asignar datos / Transporte):

```tsx
{allCancelled && (
  <button
    onClick={() => setDeleteConfirm(true)}
    className="flex-1 h-11 rounded-xl font-sans text-xs font-semibold border border-red-400 text-red-600 active:bg-red-50 transition"
  >
    Eliminar
  </button>
)}
```

### Modal de confirmación

Similar al modal de cancelación ya existente, pero con texto en rojo:

```tsx
{deleteConfirm && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-safe">
    <div className="w-full max-w-mobile bg-white rounded-2xl p-5 space-y-3 mb-4">
      <p className="font-sans font-semibold text-primary text-base">
        ¿Eliminar {selectedIds.size} {selectedIds.size === 1 ? 'cupo' : 'cupos'}?
      </p>
      <p className="font-sans text-sm text-text-muted">
        Esta acción es permanente y no se puede deshacer.
      </p>
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => setDeleteConfirm(false)}
          className="flex-1 h-11 rounded-xl font-sans text-sm font-medium border border-gray-200 text-primary active:bg-gray-50"
        >
          Volver
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={deleting}
          className="flex-1 h-11 rounded-xl font-sans text-sm font-semibold text-white bg-red-600 active:opacity-80 disabled:opacity-50"
        >
          {deleting ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Criterios de aceptación

- [ ] El botón "Eliminar" aparece en el action bar solo cuando todos los seleccionados son CANCELADO
- [ ] El modal de confirmación es claro y en rojo
- [ ] Al confirmar, los cupos se eliminan de la DB y desaparecen del panel
- [ ] Toast de confirmación tras eliminar
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
