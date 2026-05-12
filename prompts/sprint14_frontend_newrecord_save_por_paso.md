# PROMPT — Agente Frontend: Sprint 14 · NewRecord save por paso + Generar CP en Resumen

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/NewRecord.tsx` — wizard de 7 pasos, actualmente guarda todo en paso 7
- `src/pages/DetalleCupo.tsx` — referencia: ya tiene save por tab con `updateRecord`
- `src/lib/storage.ts` — `createRecord`, `updateRecord`
- `src/types/index.ts` — `RecordFormData`, `CpeRecord`

---

## Contexto

NewRecord y DetalleCupo tienen las mismas 7 secciones. Sin embargo la experiencia es distinta:

| | NewRecord | DetalleCupo |
|--|--|--|
| Guardado | Solo al final (paso 7) | Por sección ✓ |
| Generar CP | No tiene | En tab Descarga ✓ |

El objetivo es que NewRecord también guarde por paso, para que ambas ramas de carga queden consistentes.

---

## TAREA — Guardar por paso en NewRecord

### Lógica de guardado

- **Paso 1 (Transporte)**: al presionar "Guardar y continuar" → llama `createRecord(form, user.email)` → guarda el `id` y `cpe_id` en estado local → navega al paso 2
- **Pasos 2–6**: al presionar "Guardar y continuar" → llama `updateRecord(id, cpe_id, camposDePaso, recordActual, user.email)` → navega al paso siguiente
- **Paso 7 (Resumen)**: muestra resumen de campos completados + botón "Generar CP" (misma lógica que DetalleCupo)
- El botón "Anterior" NO guarda — solo navega hacia atrás
- Si el usuario navega hacia atrás y modifica campos, al presionar "Guardar y continuar" se vuelve a actualizar

### Estado adicional necesario

```ts
const [recordId,  setRecordId]  = useState<string | null>(null)
const [cpeId,     setCpeId]     = useState<string | null>(null)
const [recordSnap, setRecordSnap] = useState<CpeRecord | null>(null)
```

### Handler por paso

Reemplazar el único `handleSave` por un `handleGuardarPaso`:

```ts
const handleGuardarPaso = async () => {
  if (!user?.email) return
  setSaving(true)
  try {
    if (step === 1) {
      // Crear registro
      const record = await createRecord(form, user.email)
      setRecordId(record.id)
      setCpeId(record.cpe_id)
      setRecordSnap(record)
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      setStep(2)
    } else if (recordId && cpeId && recordSnap) {
      // Actualizar con campos del paso actual
      const campos = getCamposDePaso(step)
      const changes = Object.fromEntries(
        campos.map(k => [k, (form as Record<string, unknown>)[k] ?? null])
      ) as Partial<CpeRecord>
      const updated = await updateRecord(recordId, cpeId, changes, recordSnap, user.email)
      setRecordSnap(updated)
      if (step < 6) setStep((s) => (s + 1) as typeof step)
      else setStep(7)
    }
  } catch (e) {
    show((e as Error).message, 'error')
  } finally {
    setSaving(false)
  }
}
```

### Función `getCamposDePaso`

Define qué campos de `RecordFormData` pertenecen a cada paso:

```ts
function getCamposDePaso(step: number): (keyof RecordFormData)[] {
  switch (step) {
    case 1: return ['transporte','cuit_transporte','chofer','cuil_chofer','chasis','acoplado',
                    'fecha_partida','km','tarifa','nro_ruca']
    case 2: return ['titular_nombre','titular_cuit','remitente_comercial_nombre','remitente_comercial_cuit',
                    'rte_venta_primaria','cuit_rte_venta_primaria','rte_venta_secundaria','cuit_rte_venta_secundaria',
                    'rte_venta_secundaria2','cuit_rte_venta_secundaria2','mercado_termino',
                    'corredor_primario','cuit_corredor_primario','corredor_secundario','cuit_corredor_secundario',
                    'repr_entregador','cuit_repr_entregador','repr_recibidor','cuit_repr_recibidor',
                    'destinatario','cuit_destinatario','destino','cuit_destino',
                    'pagador_flete','cuit_pagador_flete','intermediario_flete','cuit_intermediario']
    case 3: return ['grano','variedad','declaracion_calidad','campania',
                    'kg_bruto_cargados','kg_tara_cargados','kg_estimados','observaciones']
    case 4: return ['fecha_carga','es_campo_origen','localidad','provincia_origen','descripcion_origen',
                    'renspa','campo','nro_planta','direccion_destino','localidad_destino',
                    'provincia_destino','es_campo_destino','latitud','longitud','gps']
    case 5: return ['contingencia','contingencia_otro','desactivacion','desactivacion_otro']
    case 6: return ['fecha_arribo','fecha_descarga','nro_turno',
                    'kg_bruto_descargados','kg_tara_descargados','localidad_descarga','provincia_descarga']
    default: return []
  }
}
```

### Botones de navegación — reemplazar el BottomBar actual

```tsx
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
  <div className="max-w-mobile mx-auto flex gap-3">
    {step > 1 && (
      <Button variant="ghost" onClick={() => setStep(s => (s - 1) as typeof step)} className="flex-1">
        <ChevronLeft className="w-4 h-4" /> Anterior
      </Button>
    )}
    {step <= 6 && (
      <Button onClick={handleGuardarPaso} loading={saving} className="flex-1">
        Guardar y continuar <ChevronRight className="w-4 h-4" />
      </Button>
    )}
  </div>
</div>
```

### Paso 7 — Resumen + Generar CP

El paso 7 ya no necesita botón de guardar (todo está guardado). Mostrar resumen de campos completados + botón Generar CP usando la misma lógica que DetalleCupo (`CP_REQUIRED`, `validateForCP`, `handleGenerarCP`).

El registro existe (`recordId` no es null), así que el handler puede leer el `recordSnap` para validar y enviar al webhook.

```tsx
{step === 7 && recordSnap && (
  <>
    <SectionTitle>Resumen</SectionTitle>
    {/* card con campos completados, igual que ahora */}
    <button
      onClick={() => void handleGenerarCP()}
      disabled={generando}
      className="w-full h-12 rounded-xl font-sans font-semibold text-white text-sm active:opacity-80 transition mt-4 disabled:opacity-50"
      style={{ backgroundColor: '#1E3252' }}
    >
      {generando ? 'Enviando…' : 'Generar CP'}
    </button>
  </>
)}
```

---

## Verificar en DetalleCupo

Confirmar que el tab "Descarga" (paso 6) ya tiene el botón "Generar CP" en su BottomBar. Si no lo tiene, agregarlo igual que en la tab Cierre.

---

## Criterios de aceptación

- [ ] Paso 1 crea el registro en DB y avanza al paso 2
- [ ] Pasos 2–6 actualizan el registro con `updateRecord` y avanzan
- [ ] "Anterior" solo navega, no guarda
- [ ] Paso 7 muestra resumen + botón "Generar CP"
- [ ] Botón "Generar CP" valida campos CPE y dispara webhook (mismo que DetalleCupo)
- [ ] Si el registro ya existe (recordId !== null) y el usuario vuelve atrás y guarda, hace `updateRecord` (no crea duplicado)
- [ ] Draft de localStorage se elimina al crear el registro en paso 1
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
