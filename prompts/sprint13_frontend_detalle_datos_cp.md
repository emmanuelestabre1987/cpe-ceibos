# PROMPT — Agente Frontend: Sprint 13 · Campos CP faltantes en DetalleCupo + modal dual

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/DetalleCupo.tsx` — tab Datos, tab Cierre, estado `cpMissing`, modal CP, handler `handleGenerarCP`

---

## Contexto

El botón "Generar CP" valida campos requeridos y muestra un modal si faltan datos. Hay dos problemas:

1. **Campos requeridos para CP que no tienen campo de edición en DetalleCupo**: `renspa`, `km`, `provincia_origen`, `provincia_destino`. El usuario no puede completarlos desde el detalle del cupo.
2. **El modal solo tiene "Entendido"**: el usuario necesita poder cerrar el modal para seguir completando datos, O forzar la generación igual.

---

## TAREA 1 — Agregar campos faltantes al tab Datos

### 1.1 Expandir `DatosForm`

```ts
interface DatosForm {
  // campos existentes...
  renspa: string
  km: string
  provincia_origen: string
  provincia_destino: string
}
```

### 1.2 Expandir `initDatos`

```ts
function initDatos(r: CpeRecord): DatosForm {
  return {
    // campos existentes...
    renspa: str(r.renspa),
    km: str(r.km),
    provincia_origen: str(r.provincia_origen),
    provincia_destino: str(r.provincia_destino),
  }
}
```

### 1.3 Inicializar en useState

```ts
const [datosF, setDatosF] = useState<DatosForm>({
  // campos existentes...
  renspa: '', km: '', provincia_origen: '', provincia_destino: '',
})
```

### 1.4 Incluir en `handleSaveDatos`

```ts
renspa: datosF.renspa || null,
km: numOrNull(datosF.km),
provincia_origen: datosF.provincia_origen || null,
provincia_destino: datosF.provincia_destino || null,
```

### 1.5 Agregar campos en la UI del tab Datos

Debajo de `<FormField label="Kg Estimados" ... />`, agregar una sección separada:

```tsx
<SectionTitle className="mt-2">Flete</SectionTitle>
<FormField label="RENSPA"            value={datosF.renspa}           onChange={setD('renspa')} />
<FormField label="Km"                value={datosF.km}               onChange={setD('km')} type="number" />
<FormField label="Provincia Origen"  value={datosF.provincia_origen}  onChange={setD('provincia_origen')} />
<FormField label="Provincia Destino" value={datosF.provincia_destino} onChange={setD('provincia_destino')} />
```

---

## TAREA 2 — Modal CP con dos acciones

### 2.1 Agregar handler "Generar igual"

```ts
const handleGenerarIgual = async () => {
  setCpModalOpen(false)
  if (!record) return
  setGenerando(true)
  try {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_CP_URL as string | undefined
    if (!webhookUrl) {
      show('URL del webhook no configurada (VITE_N8N_WEBHOOK_CP_URL)', 'error')
      return
    }
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

### 2.2 Reemplazar el modal CP

El modal actual solo tiene "Entendido". Reemplazarlo con dos botones:

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
      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={() => void handleGenerarIgual()}
          className="w-full h-12 rounded-xl font-sans font-semibold text-white text-sm active:opacity-80 transition"
          style={{ backgroundColor: '#1E3252' }}
        >
          Generar CP igual
        </button>
        <button
          onClick={() => setCpModalOpen(false)}
          className="w-full h-11 rounded-xl font-sans text-sm font-medium border border-gray-200 text-primary active:bg-gray-50"
        >
          Seguir completando
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Criterios de aceptación

- [ ] Tab Datos muestra sección "Flete" con RENSPA, Km, Provincia Origen, Provincia Destino
- [ ] Esos campos se guardan al presionar "Guardar cambios"
- [ ] Modal CP tiene dos botones: "Generar CP igual" (dispara webhook) y "Seguir completando" (cierra modal)
- [ ] "Generar CP igual" envía el registro tal cual, con datos faltantes
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
