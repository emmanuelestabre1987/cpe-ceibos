# PROMPT — Sprint 12 · Campos faltantes CPE + botón "Generar CP"

Sos el agente de CPE Campo (Avancargo). Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/types/index.ts` — tipos `RecordFormData` y `CpeRecord`
- `src/pages/NewRecord.tsx` — formulario individual (6 pasos)
- `src/pages/ImportarCupos.tsx` — carga masiva
- `src/pages/DetalleCupo.tsx` — detalle del cupo (donde iría el botón "Generar CP")

---

## Contexto

Benchmark contra la CPE (Carta de Porte Electrónica) de AFIP reveló campos faltantes. Ningún campo es obligatorio en el formulario — la app debe permitir guardar con los datos que el usuario tenga disponibles. La validación ocurre solo al intentar generar la CP.

---

## TAREA 1 — Backend: migración SQL

Crear `supabase/migrations/005_campos_cpe_faltantes.sql`:

```sql
ALTER TABLE cpe_records
  ADD COLUMN IF NOT EXISTS renspa                    TEXT,
  ADD COLUMN IF NOT EXISTS campania                  TEXT,
  ADD COLUMN IF NOT EXISTS nro_turno                 TEXT,
  ADD COLUMN IF NOT EXISTS cuit_corredor_primario    TEXT,
  ADD COLUMN IF NOT EXISTS cuit_corredor_secundario  TEXT,
  ADD COLUMN IF NOT EXISTS cuit_repr_entregador      TEXT,
  ADD COLUMN IF NOT EXISTS cuit_repr_recibidor       TEXT,
  ADD COLUMN IF NOT EXISTS cuit_rte_venta_primaria   TEXT,
  ADD COLUMN IF NOT EXISTS cuit_rte_venta_secundaria TEXT,
  ADD COLUMN IF NOT EXISTS humedad                   NUMERIC,
  ADD COLUMN IF NOT EXISTS proteina                  NUMERIC,
  ADD COLUMN IF NOT EXISTS provincia_origen          TEXT,
  ADD COLUMN IF NOT EXISTS provincia_destino         TEXT;
```

---

## TAREA 2 — Tipos

En `src/types/index.ts`, agregar a `RecordFormData` y `CpeRecord`:

```ts
renspa: string | null
campania: string | null
nro_turno: string | null
cuit_corredor_primario: string | null
cuit_corredor_secundario: string | null
cuit_repr_entregador: string | null
cuit_repr_recibidor: string | null
cuit_rte_venta_primaria: string | null
cuit_rte_venta_secundaria: string | null
humedad: number | null
proteina: number | null
provincia_origen: string | null
provincia_destino: string | null
```

---

## TAREA 3 — Formulario individual `NewRecord.tsx`

Ningún campo lleva `required`. Agregar en el paso correspondiente:

**Paso 1 — General** (después de Variedad):
- `campania` → FormField "Campaña"
- `renspa` → FormField "RENSPA"

**Paso 2 — Comercial** (después de cada nombre):
- `cuit_rte_venta_primaria` → después de Rte. Venta Primaria
- `cuit_rte_venta_secundaria` → después de Rte. Venta Secundaria
- `cuit_corredor_primario` → después de Corredor Primario
- `cuit_corredor_secundario` → después de Corredor Secundario
- `cuit_repr_entregador` → después de Repr. Entregador
- `cuit_repr_recibidor` → después de Repr. Recibidor

**Paso 3 — Flete** (después de Tarifa):
- `nro_turno` → FormField "Nro. de Turno"
- `provincia_origen` → FormField "Provincia Origen"
- `provincia_destino` → FormField "Provincia Destino"

**Paso 5 — Pesaje** (al final):
- `humedad` → FormField "Humedad (%)" type="number"
- `proteina` → FormField "Proteína (%)" type="number"

Actualizar el objeto `empty` con todos los campos nuevos en `null` o `''`.

Actualizar el handler `set()` para incluir `humedad` y `proteina` como numéricos.

---

## TAREA 4 — Carga masiva `ImportarCupos.tsx`

Agregar en `CamposComunes` y en el formulario (sin `humedad`/`proteina` — son por cupo):

**General**: `campania`, `renspa`
**Comercial**: `cuit_rte_venta_primaria`, `cuit_rte_venta_secundaria`, `cuit_corredor_primario`, `cuit_corredor_secundario`, `cuit_repr_entregador`, `cuit_repr_recibidor`
**Flete**: `nro_turno`, `provincia_origen`, `provincia_destino`

Actualizar el mapeo de `records` para incluir los campos nuevos.

---

## TAREA 5 — Botón "Generar CP" en `DetalleCupo.tsx`

### Lógica de validación

Definir un mapa de campos requeridos para la CPE, agrupados por sección:

```ts
const CP_REQUIRED: { section: string; fields: (keyof CpeRecord)[]; labels: Record<string, string> }[] = [
  {
    section: 'General',
    fields: ['fecha_carga', 'cupo', 'grano', 'localidad', 'renspa'],
    labels: { fecha_carga: 'Fecha de carga', cupo: 'Cupo', grano: 'Grano', localidad: 'Localidad', renspa: 'RENSPA' },
  },
  {
    section: 'Comercial',
    fields: ['destinatario', 'cuit_destinatario', 'destino', 'cuit_destino'],
    labels: { destinatario: 'Destinatario', cuit_destinatario: 'CUIT Destinatario', destino: 'Destino', cuit_destino: 'CUIT Destino' },
  },
  {
    section: 'Flete',
    fields: ['km', 'provincia_origen', 'provincia_destino'],
    labels: { km: 'Km', provincia_origen: 'Provincia Origen', provincia_destino: 'Provincia Destino' },
  },
  {
    section: 'Transporte',
    fields: ['transporte', 'cuit_transporte', 'chofer', 'cuil_chofer', 'chasis'],
    labels: { transporte: 'Transportista', cuit_transporte: 'CUIT Transporte', chofer: 'Chofer', cuil_chofer: 'CUIL Chofer', chasis: 'Patente Chasis' },
  },
  {
    section: 'Pesaje',
    fields: ['kg_estimados'],
    labels: { kg_estimados: 'Kg Estimados' },
  },
]
```

### Función de validación

```ts
function validateForCP(record: CpeRecord): { section: string; missing: string[] }[] {
  return CP_REQUIRED
    .map(({ section, fields, labels }) => ({
      section,
      missing: fields
        .filter(f => !record[f] && record[f] !== 0)
        .map(f => labels[f]),
    }))
    .filter(({ missing }) => missing.length > 0)
}
```

### Estado nuevo

```ts
const [cpModalOpen, setCpModalOpen] = useState(false)
const [cpMissing, setCpMissing]     = useState<{ section: string; missing: string[] }[]>([])
```

### Variables de entorno

Agregar en `.env`:
```
VITE_N8N_WEBHOOK_CP_URL=https://tu-instancia-n8n.com/webhook/generar-cp
```

### Estado nuevo (agregar a los existentes)

```ts
const [generando, setGenerando] = useState(false)
```

### Handler

```ts
const handleGenerarCP = async () => {
  const errors = validateForCP(record)
  if (errors.length > 0) {
    setCpMissing(errors)
    setCpModalOpen(true)
    return
  }

  setGenerando(true)
  try {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_CP_URL
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
    show('Solicitud de CP enviada correctamente', 'success')
  } catch {
    show('Error al enviar la solicitud. Intentá de nuevo.', 'error')
  } finally {
    setGenerando(false)
  }
}
```

El webhook recibe el objeto `record` completo (todos los campos del cupo) y n8n se encarga de:
- **Etapa actual**: enviar el correo con los datos del cupo
- **Etapa siguiente**: generar la Carta de Porte electrónica contra AFIP

### Botón

Agregar al final de la última tab (Cierre), debajo de GPS:

```tsx
<button
  onClick={() => void handleGenerarCP()}
  disabled={generando}
  className="w-full h-12 rounded-xl font-sans font-semibold text-white text-sm active:opacity-80 transition mt-4 disabled:opacity-50"
  style={{ backgroundColor: '#1E3252' }}
>
  {generando ? 'Enviando…' : 'Generar CP'}
</button>
```

### Modal de datos faltantes

```tsx
{cpModalOpen && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-safe">
    <div className="w-full max-w-mobile bg-white rounded-2xl p-5 space-y-4 mb-4">
      <p className="font-sans font-semibold text-primary text-base">
        Faltan datos para generar la CP
      </p>
      <div className="space-y-3">
        {cpMissing.map(({ section, missing }) => (
          <div key={section}>
            <p className="font-mono text-xs font-bold text-text-muted uppercase tracking-wide mb-1">
              {section}
            </p>
            <ul className="space-y-0.5">
              {missing.map(label => (
                <li key={label} className="font-sans text-sm text-primary flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button
        onClick={() => setCpModalOpen(false)}
        className="w-full h-11 rounded-xl font-sans text-sm font-medium border border-gray-200 text-primary active:bg-gray-50"
      >
        Entendido
      </button>
    </div>
  </div>
)}
```

---

## Criterios de aceptación

- [ ] `005_campos_cpe_faltantes.sql` creado y listo para ejecutar
- [ ] Tipos actualizados sin romper los existentes
- [ ] Campos nuevos en formulario individual (sin `required`)
- [ ] Campos nuevos en carga masiva
- [ ] Botón "Generar CP" visible en la tab Cierre de `DetalleCupo.tsx`
- [ ] Al presionar con datos incompletos → modal lista los campos faltantes por sección
- [ ] Al presionar con todos los datos → dispara webhook POST a `VITE_N8N_WEBHOOK_CP_URL` con el record completo como JSON
- [ ] Mientras envía → botón muestra "Enviando…" y está deshabilitado
- [ ] Toast de éxito/error según respuesta del webhook
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
