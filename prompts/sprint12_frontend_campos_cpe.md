# PROMPT — Agente Frontend: Sprint 12 · Campos faltantes CPE + botón Generar CP

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

**Prerequisito**: el agente Backend del Sprint 12 ya corrió. Los tipos nuevos ya existen en `src/types/index.ts`.

Leé antes de empezar:
- `src/types/index.ts` — campos nuevos en `CpeRecord` y `RecordFormData`
- `src/pages/NewRecord.tsx` — formulario individual (6 pasos)
- `src/pages/ImportarCupos.tsx` — carga masiva
- `src/pages/DetalleCupo.tsx` — detalle del cupo (tabs: datos, transporte, pesaje, cierre, historial)

---

## TAREA 1 — `NewRecord.tsx`: agregar campos nuevos

Ningún campo lleva `required`. Todos son opcionales.

Actualizar el objeto `empty` agregando los campos con `null` o `''`:
```ts
renspa: '', campania: '', nro_turno: '',
cuit_corredor_primario: '', cuit_corredor_secundario: '',
cuit_repr_entregador: '', cuit_repr_recibidor: '',
cuit_rte_venta_primaria: '', cuit_rte_venta_secundaria: '',
humedad: null, proteina: null,
provincia_origen: '', provincia_destino: '',
```

Actualizar el handler `set()` para incluir `humedad` y `proteina` como numéricos.

Agregar campos en cada paso:

**Paso 1 — General** (después de Variedad):
- `campania` → FormField "Campaña"
- `renspa` → FormField "RENSPA"

**Paso 2 — Comercial** (cada CUIT inmediatamente después del nombre correspondiente):
- `cuit_rte_venta_primaria` después de Rte. Venta Primaria
- `cuit_rte_venta_secundaria` después de Rte. Venta Secundaria
- `cuit_corredor_primario` después de Corredor Primario
- `cuit_corredor_secundario` después de Corredor Secundario
- `cuit_repr_entregador` después de Repr. Entregador
- `cuit_repr_recibidor` después de Repr. Recibidor

**Paso 3 — Flete** (después de Tarifa):
- `nro_turno` → FormField "Nro. de Turno"
- `provincia_origen` → FormField "Provincia Origen"
- `provincia_destino` → FormField "Provincia Destino"

**Paso 5 — Pesaje** (al final):
- `humedad` → FormField "Humedad (%)" type="number"
- `proteina` → FormField "Proteína (%)" type="number"

---

## TAREA 2 — `ImportarCupos.tsx`: agregar campos nuevos

Expandir la interfaz `CamposComunes` y `CAMPOS_VACIOS` con los campos nuevos (sin `humedad` ni `proteina` — son por cupo, no por lote).

Agregar en el formulario de preview:

**Sección General** (después de Variedad):
- `campania` → FormField "Campaña"
- `renspa` → FormField "RENSPA"

**Sección Comercial** (cada CUIT después de su nombre):
- `cuit_rte_venta_primaria`, `cuit_rte_venta_secundaria`
- `cuit_corredor_primario`, `cuit_corredor_secundario`
- `cuit_repr_entregador`, `cuit_repr_recibidor`

**Sección Flete** (después de Tarifa):
- `nro_turno`, `provincia_origen`, `provincia_destino`

Actualizar el mapeo de `records` para incluir todos los campos nuevos con `|| null`.

---

## TAREA 3 — `DetalleCupo.tsx`: botón "Generar CP"

### Variable de entorno
Agregar en `.env`:
```
VITE_N8N_WEBHOOK_CP_URL=https://tu-instancia-n8n.com/webhook/generar-cp
```

### Estado nuevo
```ts
const [cpModalOpen, setCpModalOpen] = useState(false)
const [cpMissing,   setCpMissing]   = useState<{ section: string; missing: string[] }[]>([])
const [generando,   setGenerando]   = useState(false)
```

### Validación CPE

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

function validateForCP(record: CpeRecord): { section: string; missing: string[] }[] {
  return CP_REQUIRED
    .map(({ section, fields, labels }) => ({
      section,
      missing: fields.filter(f => !record[f] && record[f] !== 0).map(f => labels[f]),
    }))
    .filter(({ missing }) => missing.length > 0)
}
```

### Handler

```ts
const handleGenerarCP = async () => {
  if (!record) return
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

### Botón "Generar CP"

Agregar al final de la tab Cierre, debajo del GPSInput (tanto en la versión editable como en la de solo lectura):

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

Agregar antes del `{ToastComponent}`:

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

- [ ] Campos nuevos en paso correcto de `NewRecord.tsx`, sin `required`
- [ ] Campos nuevos en sección correcta de `ImportarCupos.tsx`
- [ ] Botón "Generar CP" visible en tab Cierre de `DetalleCupo.tsx`
- [ ] Con datos incompletos → modal lista campos faltantes por sección
- [ ] Con datos completos → dispara POST al webhook y muestra toast
- [ ] Mientras envía → botón dice "Enviando…" y está deshabilitado
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
