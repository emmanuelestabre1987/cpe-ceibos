# PROMPT — Agente UI/UX: Sprint 8 · Rediseño del header y filtros del Panel de Cupos

Sos un experto en UI/UX mobile-first. Tu tarea es rediseñar el sistema de filtros del Panel de Cupos de CPE Campo (Avancargo). Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé estos archivos antes de empezar:
- `src/pages/Home.tsx` — pantalla principal completa
- `src/components/layout/Header.tsx` — componente de header reutilizable
- `tailwind.config.js` — colores y tokens del sistema
- `src/types/index.ts` — tipo `CpeStatus`

---

## Contexto del sistema

**App:** PWA mobile-first para agrónomos en campo. Max-width: 430px. Sin mouse, solo touch.

**Brand Avancargo:**
- `#1E3252` — primary (header, textos importantes)
- `#2C9FC0` — secondary (acciones, highlights)
- `#FF6C02` — accent (naranja, alertas)
- `font-mono` = Martian Mono (códigos, labels)
- `font-sans` = Roboto (textos descriptivos)

**Estado actual del filtro (problema):**
- Chips de período: Hoy / Esta semana / Todos — demasiado genérico para el campo
- Select de Estado y Grano en línea — sin espacio, se cortan
- Sin filtro de rango de fechas personalizable
- El header ocupa demasiado espacio vertical en mobile

**Comportamiento de los cupos:**
- El agrónomo trabaja principalmente con cupos de los próximos días (carga futura)
- Los cupos tienen `fecha_carga` (fecha en que sale el camión)
- Los estados son: `IMPORTADO | TRANSPORTE | CARGADO | CERRADO | ENVIADO | CANCELADO`

---

## LO QUE DEBE HACER

### 1. Filtro de rango de fechas

**Default al abrir la app:** mostrar cupos con `fecha_carga` entre **ayer** y **mañana** (ventana de 3 días).

**UI del selector de fechas:**
- Mostrar como un pill/chip compacto que diga la ventana activa, por ejemplo: `"6 may — 8 may"`
- Al tocar, abrir un bottom sheet con:
  - Dos campos de fecha (Desde / Hasta) con inputs `type="date"`
  - Atajos rápidos como botones: `"Ayer"`, `"Hoy"`, `"Esta semana"`, `"Todo"`
  - Botón "Aplicar" (primary) y "Limpiar" (ghost)
- El pill debe mostrar visualmente si hay un filtro activo (color distinto, por ejemplo fondo secondary)

**Lógica de filtrado:**
- `fecha_carga >= dateFrom && fecha_carga <= dateTo`
- Si ambos están vacíos → mostrar todos
- Default: `dateFrom = ayer`, `dateTo = mañana`

### 2. Filtro de estado

**UI:**
- Un pill/chip que diga "Estado" cuando no hay filtro, o el nombre del estado cuando hay uno activo
- Al tocar, abrir un bottom sheet con las opciones de estado como botones grandes (mínimo 48px de alto), con el color de cada estado:
  - IMPORTADO → `#2C9FC0`
  - TRANSPORTE → `#F59E0B` con texto `#1E3252`
  - CARGADO → `#FF6C02`
  - CERRADO → `#16A34A`
  - ENVIADO → `#15803D`
  - CANCELADO → `#9CA3AF`
- Opción "Todos los estados" al inicio (sin color, solo texto)
- Estado activo con ✓ a la derecha
- Cerrar el sheet al seleccionar

### 3. Layout del header strip

El strip de filtros (área oscura debajo del header) debe rediseñarse para mobile:

**Propuesta de layout:**
```
┌─────────────────────────────────────────────────────┐
│  [📅 6 may — 8 may]          [Estado ▾]             │  ← fila 1: fecha + estado
│  [🔍 Buscar código, destinatario...]                 │  ← fila 2: búsqueda full-width
└─────────────────────────────────────────────────────┘
```

- Fila 1: dos pills en horizontal, cada uno `flex-1`
- Fila 2: barra de búsqueda full-width
- Fondo del strip: `bg-primary` (`#1E3252`)
- Pills: fondo semi-transparente (`bg-white/10` cuando inactivo, `bg-secondary` cuando activo)
- Texto de pills: blanco siempre
- Barra de búsqueda: fondo `bg-white/15`, texto blanco, placeholder blanco/60

**Eliminar:**
- Los chips "Hoy / Esta semana / Todos" — reemplazados por el rango de fechas
- El select de Grano del strip principal — moverlo dentro del bottom sheet de fechas como filtro adicional opcional, o eliminarlo si complica el diseño

### 4. Indicador de filtros activos

Debajo del strip (fuera del fondo primary, sobre el listado), mostrar en una línea:
```
39 cupos  ·  [✕ 6 may — 8 may]  [✕ TRANSPORTE]
```
- Solo mostrar los pills de filtro activo que tengan valor
- Cada pill tiene un ✕ para limpiar ese filtro individualmente
- Si no hay filtros activos, mostrar solo el conteo (`"39 cupos"`)

---

## REGLAS DE IMPLEMENTACIÓN

- **No crear nuevos componentes** — implementar todo dentro de `Home.tsx` con estados locales y JSX inline (el archivo ya es grande, pero es preferible a dispersar lógica)
- **Bottom sheets:** usar `fixed inset-0` con backdrop y el sheet anclado al bottom, igual que los sheets existentes en `DetalleCupo.tsx`
- **No modificar ningún otro archivo** excepto `Home.tsx`
- **Mantener** toda la lógica existente: select mode, cancel confirm modal, FAB, `useRecords`, `buildGroups`, handlers de navegación
- **Mantener** el `ConnectionDot` y el botón de logout en el header principal
- **Mantener** el botón de selección masiva (icono `Layers`) en el header
- Touch targets mínimo 44px de alto para todos los elementos interactivos
- Animaciones: solo `transition-colors` y `active:scale-[0.98]` — nada pesado

---

## LÓGICA DE FECHAS A IMPLEMENTAR

```ts
function todayStr() { return new Date().toISOString().slice(0, 10) }

function offsetDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Default al montar:
const [dateFrom, setDateFrom] = useState(() => offsetDate(-1))  // ayer
const [dateTo,   setDateTo]   = useState(() => offsetDate(+1))  // mañana

// Filtrado:
if (dateFrom && r.fecha_carga && r.fecha_carga < dateFrom) return false
if (dateTo   && r.fecha_carga && r.fecha_carga > dateTo)   return false
```

El label del pill de fecha:
```ts
function formatDatePill(from: string, to: string): string {
  if (!from && !to) return 'Fecha'
  const fmt = (s: string) => {
    const d = new Date(`${s}T12:00:00`)
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }
  if (from === to) return fmt(from)
  return `${from ? fmt(from) : '…'} — ${to ? fmt(to) : '…'}`
}
```

---

## CRITERIOS DE ACEPTACIÓN

- [ ] El panel abre por default mostrando cupos de ayer + hoy + mañana
- [ ] El pill de fecha muestra el rango activo (ej: `"6 may — 8 may"`)
- [ ] Al tocar el pill de fecha se abre un bottom sheet con atajos + campos manuales
- [ ] El pill de estado muestra el estado activo o "Estado" si no hay filtro
- [ ] Al tocar el pill de estado se abre un bottom sheet con los 6 estados + opción "Todos"
- [ ] Hay indicadores de filtro activo debajo del strip con ✕ individual
- [ ] El filtro de grano se eliminó del strip (puede quedar dentro del sheet de fechas o eliminarse)
- [ ] El layout en mobile (430px) es limpio, sin overflow horizontal
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modificó ningún otro archivo
