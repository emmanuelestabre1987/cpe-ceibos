# PROMPT — Agente Frontend: Sprint 9 · Filtro de estado multi-selección

Sos el agente Frontend de CPE Campo (Avancargo). Tenés una sola tarea. Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé `src/pages/Home.tsx` completo antes de empezar.

---

## Contexto

El filtro de estado del Panel de Cupos hoy permite seleccionar UN solo estado a la vez (`filterStatus: string`). El usuario necesita poder seleccionar múltiples estados simultáneamente — por ejemplo ver IMPORTADO + TRANSPORTE al mismo tiempo.

---

## TAREA — Convertir filtro de estado a multi-selección

### 1. Cambiar el estado de `string` a `Set<string>`

```ts
// Antes:
const [filterStatus, setFilterStatus] = useState('')

// Después:
const [filterStatus, setFilterStatus] = useState<Set<string>>(new Set())
```

### 2. Actualizar la lógica de filtrado

```ts
// Antes:
if (filterStatus && normalizeStatusForFilter(r.status) !== filterStatus) return false

// Después:
if (filterStatus.size > 0 && !filterStatus.has(normalizeStatusForFilter(r.status))) return false
```

### 3. Actualizar el bottom sheet de estado

El sheet muestra botones por cada estado. Al tocar uno, en vez de cerrar el sheet y setear un valor único, debe **togglear** ese estado en el Set y mantener el sheet abierto:

```ts
const toggleStatus = (s: string) => {
  setFilterStatus(prev => {
    const next = new Set(prev)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    return next
  })
}
```

Cada botón de estado muestra un ✓ si está en el Set (activo). El botón "Todos los estados" limpia el Set (`setFilterStatus(new Set())`).

El sheet ahora **no se cierra al seleccionar** — el usuario selecciona los estados que quiere y cierra manualmente con la ✕ o tocando el backdrop.

### 4. Actualizar el pill de estado en el strip de filtros

```ts
// Label del pill según cuántos estados hay seleccionados:
filterStatus.size === 0 → "Estado"
filterStatus.size === 1 → nombre del único estado seleccionado (ej: "IMPORTADO")
filterStatus.size > 1   → `${filterStatus.size} estados`
```

El pill debe estar activo (fondo `bg-secondary`) cuando `filterStatus.size > 0`.

### 5. Actualizar el badge de filtro activo debajo del strip

Actualmente muestra un solo badge con el estado seleccionado. Con multi-selección:
- Si hay 1 estado: mostrar el badge con ese estado y su ✕
- Si hay 2+ estados: mostrar un único badge `"N estados ✕"` que al tocar limpia todos
- Al limpiar, hacer `setFilterStatus(new Set())`

### 6. Actualizar `clearFilters` (si existe)

Buscar si hay una función `clearFilters` en el archivo y asegurarse de que limpie el estado con `setFilterStatus(new Set())` en vez de `setFilterStatus('')`.

---

## Criterios de aceptación

- [ ] Se pueden seleccionar múltiples estados simultáneamente
- [ ] El sheet permanece abierto mientras se seleccionan estados
- [ ] El pill muestra "N estados" cuando hay más de uno seleccionado
- [ ] El badge de filtro activo funciona correctamente
- [ ] Seleccionar "Todos los estados" limpia la selección
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
