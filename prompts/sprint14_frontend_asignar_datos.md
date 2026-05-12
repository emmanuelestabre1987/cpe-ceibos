# PROMPT — Agente Frontend: Sprint 14 · AsignarDatos alineado con NewRecord

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/AsignarDatos.tsx` — página actual a reemplazar
- `src/pages/NewRecord.tsx` — fuente de verdad de campos y secciones
- `src/types/index.ts` — `CpeRecord`, `RecordFormData`, constantes GRANOS, VARIEDADES, LOCALIDADES, CAMPOS

---

## Contexto

`AsignarDatos` se usa luego de importar cupos por email. El usuario selecciona N cupos y llega a esta pantalla para asignarles datos en forma masiva. Solo se guardan los campos que el usuario completó — los vacíos no se modifican.

**Problema actual:** solo tiene 7 campos. NewRecord fue actualizado a 7 secciones con ~50 campos alineados a la CPE de AFIP. AsignarDatos tiene que tener exactamente los mismos campos y secciones, pero en formato scroll vertical (no wizard).

---

## TAREA — Reescribir `AsignarDatos.tsx`

### Estructura de la página

```
Header "Asignación masiva" + botón volver
↓
Card con lista de cupos seleccionados (código + status, igual que ahora)
↓
Aviso: "Solo se actualizan los campos que completes. Los campos vacíos no se modifican."
↓
[Sección 1] Transporte
[Sección 2] Intervinientes (Sección A)
[Sección 3] Grano / Especie (Sección B)
[Sección 4] Procedencia (Sección C) + Destino (Sección D)
[Sección 5] Contingencias (Sección F)
[Sección 6] Descarga (Sección G)
↓
BottomBar fijo: "Guardar datos en X cupos"
```

### Estado del formulario

Usar un único objeto de estado tipado como `Partial<RecordFormData>`, inicializado vacío. Solo los campos con valor se incluyen en el `changes` al guardar.

```ts
const [form, setForm] = useState<Partial<RecordFormData>>({})
const set = (field: keyof RecordFormData) => (val: string) => {
  setForm(prev => ({ ...prev, [field]: val === '' ? undefined : val }))
}
const setNum = (field: keyof RecordFormData) => (val: string) => {
  setForm(prev => ({ ...prev, [field]: val === '' ? undefined : Number(val) }))
}
const setBool = (field: keyof RecordFormData) => (val: boolean) => {
  setForm(prev => ({ ...prev, [field]: val }))
}
```

### Sección 1 — Transporte

Mismos campos que NewRecord paso 1, sin el campo `cupo` (ya asignado al importar):

```tsx
<SectionTitle>Transporte</SectionTitle>
<VoiceInput label="Empresa Transportista"       value={str(form.transporte)}      onChange={set('transporte')} />
<FormField  label="CUIT Empresa Transportista"  value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} />
<VoiceInput label="Chofer"                      value={str(form.chofer)}          onChange={set('chofer')} />
<FormField  label="CUIL Chofer"                 value={str(form.cuil_chofer)}     onChange={set('cuil_chofer')} />
<VoiceInput label="Chasis / Patente"            value={str(form.chasis)}          onChange={set('chasis')} />
<VoiceInput label="Acoplado / Patente"          value={str(form.acoplado)}        onChange={set('acoplado')} />
<FormField  label="Fecha Partida"               value={str(form.fecha_partida)}   onChange={set('fecha_partida')} type="datetime-local" />
<FormField  label="Kms. a recorrer"             value={str(form.km)}              onChange={setNum('km')} type="number" />
<FormField  label="Tarifa"                      value={str(form.tarifa)}          onChange={setNum('tarifa')} type="number" />
<FormField  label="N° RUCA"                     value={str(form.nro_ruca)}        onChange={set('nro_ruca')} />
```

### Sección 2 — Intervinientes (Sección A)

Mismos campos que NewRecord paso 2:

```tsx
<SectionTitle>Intervinientes (Sección A)</SectionTitle>
<VoiceInput label="Titular Carta de Porte"               value={str(form.titular_nombre)}             onChange={set('titular_nombre')} />
<FormField  label="CUIT Titular"                         value={str(form.titular_cuit)}               onChange={set('titular_cuit')} />
<VoiceInput label="Remitente Comercial Productor"        value={str(form.remitente_comercial_nombre)} onChange={set('remitente_comercial_nombre')} />
<FormField  label="CUIT Remitente Comercial"             value={str(form.remitente_comercial_cuit)}   onChange={set('remitente_comercial_cuit')} />
<VoiceInput label="Rte. Comercial Venta Primaria"        value={str(form.rte_venta_primaria)}         onChange={set('rte_venta_primaria')} />
<FormField  label="CUIT Rte. Comercial Venta Primaria"   value={str(form.cuit_rte_venta_primaria)}    onChange={set('cuit_rte_venta_primaria')} />
<VoiceInput label="Rte. Comercial Venta Secundaria"      value={str(form.rte_venta_secundaria)}       onChange={set('rte_venta_secundaria')} />
<FormField  label="CUIT Rte. Comercial Venta Secundaria" value={str(form.cuit_rte_venta_secundaria)}  onChange={set('cuit_rte_venta_secundaria')} />
<VoiceInput label="Rte. Comercial Venta Secundaria 2"    value={str(form.rte_venta_secundaria2)}      onChange={set('rte_venta_secundaria2')} />
<FormField  label="CUIT Rte. Comercial Venta Secundaria 2" value={str(form.cuit_rte_venta_secundaria2)} onChange={set('cuit_rte_venta_secundaria2')} />
<VoiceInput label="Mercado a Término"                    value={str(form.mercado_termino)}            onChange={set('mercado_termino')} />
<VoiceInput label="Corredor Venta Primaria"              value={str(form.corredor_primario)}          onChange={set('corredor_primario')} />
<FormField  label="CUIT Corredor Venta Primaria"         value={str(form.cuit_corredor_primario)}     onChange={set('cuit_corredor_primario')} />
<VoiceInput label="Corredor Venta Secundaria"            value={str(form.corredor_secundario)}        onChange={set('corredor_secundario')} />
<FormField  label="CUIT Corredor Venta Secundaria"       value={str(form.cuit_corredor_secundario)}   onChange={set('cuit_corredor_secundario')} />
<VoiceInput label="Representante Entregador"             value={str(form.repr_entregador)}            onChange={set('repr_entregador')} />
<FormField  label="CUIT Representante Entregador"        value={str(form.cuit_repr_entregador)}       onChange={set('cuit_repr_entregador')} />
<VoiceInput label="Representante Recibidor"              value={str(form.repr_recibidor)}             onChange={set('repr_recibidor')} />
<FormField  label="CUIT Representante Recibidor"         value={str(form.cuit_repr_recibidor)}        onChange={set('cuit_repr_recibidor')} />
<VoiceInput label="Destinatario"                         value={str(form.destinatario)}               onChange={set('destinatario')} />
<FormField  label="CUIT Destinatario"                    value={str(form.cuit_destinatario)}          onChange={set('cuit_destinatario')} />
<VoiceInput label="Destino"                              value={str(form.destino)}                    onChange={set('destino')} />
<FormField  label="CUIT Destino"                         value={str(form.cuit_destino)}               onChange={set('cuit_destino')} />
<VoiceInput label="Flete Pagador"                        value={str(form.pagador_flete)}              onChange={set('pagador_flete')} />
<FormField  label="CUIT Flete Pagador"                   value={str(form.cuit_pagador_flete)}         onChange={set('cuit_pagador_flete')} />
<VoiceInput label="Intermediario de Flete"               value={str(form.intermediario_flete)}        onChange={set('intermediario_flete')} />
<FormField  label="CUIT Intermediario de Flete"          value={str(form.cuit_intermediario)}         onChange={set('cuit_intermediario')} />
```

### Sección 3 — Grano / Especie (Sección B)

```tsx
<SectionTitle>Grano / Especie (Sección B)</SectionTitle>
<SelectField label="Grano"    value={str(form.grano)}    onChange={set('grano')}    options={GRANOS} />
<SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
<SelectField
  label="Declaración de Calidad"
  value={str(form.declaracion_calidad)}
  onChange={set('declaracion_calidad')}
  options={['conforme', 'condicional']}
/>
<FormField label="Campaña"      value={str(form.campania)}          onChange={set('campania')} />
<FormField label="Peso Bruto"   value={str(form.kg_bruto_cargados)} onChange={setNum('kg_bruto_cargados')} type="number" />
<FormField label="Peso Tara"    value={str(form.kg_tara_cargados)}  onChange={setNum('kg_tara_cargados')}  type="number" />
<FormField label="Kg Estimados" value={str(form.kg_estimados)}      onChange={setNum('kg_estimados')}      type="number" />
<VoiceInput label="Observaciones" value={str(form.observaciones)}   onChange={set('observaciones')} multiline rows={4} />
```

### Sección 4 — Procedencia + Destino (Secciones C y D)

```tsx
<SectionTitle>Procedencia — Origen (Sección C)</SectionTitle>
<FormField label="Fecha de carga"   value={str(form.fecha_carga)}       onChange={set('fecha_carga')} type="date" />
<SelectField label="Localidad"      value={str(form.localidad)}         onChange={set('localidad')}   options={LOCALIDADES} />
<FormField label="Provincia Origen" value={str(form.provincia_origen)}  onChange={set('provincia_origen')} />
<FormField label="Descripción"      value={str(form.descripcion_origen)} onChange={set('descripcion_origen')} />
<FormField label="RENSPA"           value={str(form.renspa)}            onChange={set('renspa')} />
<SelectField label="Campo"          value={str(form.campo)}             onChange={set('campo')} options={CAMPOS} />

<SectionTitle className="mt-4">Destino de la Mercadería (Sección D)</SectionTitle>
<FormField label="N° Planta"           value={str(form.nro_planta)}        onChange={set('nro_planta')} />
<FormField label="Dirección"           value={str(form.direccion_destino)} onChange={set('direccion_destino')} />
<FormField label="Localidad (Destino)" value={str(form.localidad_destino)} onChange={set('localidad_destino')} />
<FormField label="Provincia Destino"   value={str(form.provincia_destino)} onChange={set('provincia_destino')} />
```

### Sección 5 — Contingencias (Sección F)

```tsx
<SectionTitle>Contingencias (Sección F)</SectionTitle>
<FormField label="Contingencia"  value={str(form.contingencia)}       onChange={set('contingencia')} />
<FormField label="Otro"          value={str(form.contingencia_otro)}  onChange={set('contingencia_otro')} />
<FormField label="Desactivación" value={str(form.desactivacion)}      onChange={set('desactivacion')} />
<FormField label="Otro"          value={str(form.desactivacion_otro)} onChange={set('desactivacion_otro')} />
```

### Sección 6 — Descarga (Sección G)

```tsx
<SectionTitle>Descarga (Sección G)</SectionTitle>
<FormField label="Fecha Arribo"   value={str(form.fecha_arribo)}   onChange={set('fecha_arribo')}   type="datetime-local" />
<FormField label="Fecha Descarga" value={str(form.fecha_descarga)} onChange={set('fecha_descarga')} type="datetime-local" />
<FormField label="N° Turno"        value={str(form.nro_turno)}        onChange={set('nro_turno')} />
<FormField label="Peso Bruto (kg)" value={str(form.kg_bruto_descargados)} onChange={setNum('kg_bruto_descargados')} type="number" />
<FormField label="Peso Tara (kg)"  value={str(form.kg_tara_descargados)}  onChange={setNum('kg_tara_descargados')}  type="number" />
<FormField label="Localidad (Descarga)" value={str(form.localidad_descarga)} onChange={set('localidad_descarga')} />
<FormField label="Provincia (Descarga)" value={str(form.provincia_descarga)} onChange={set('provincia_descarga')} />
```

### Handler guardar

Solo incluir en `changes` los campos del form que no sean `undefined`:

```ts
const handleGuardar = async () => {
  if (!user?.email) return
  const changes = Object.fromEntries(
    Object.entries(form).filter(([, v]) => v !== undefined)
  ) as Partial<CpeRecord>

  if (Object.keys(changes).length === 0) {
    show('No hay campos para guardar', 'info')
    return
  }
  setSaving(true)
  try {
    await Promise.all(
      records.map(r => updateRecord(r.id, r.cpe_id, changes, r, user.email!))
    )
    show(`Datos actualizados en ${records.length} cupos`, 'success')
    navigate('/')
  } catch (e) {
    show((e as Error).message, 'error')
    setSaving(false)
  }
}
```

### Helper str

```ts
function str(v: string | number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v)
}
```

---

## Criterios de aceptación

- [ ] Todos los campos de NewRecord presentes en AsignarDatos, organizados en las mismas 6 secciones
- [ ] Sin wizard — todo en scroll vertical, una sola pantalla
- [ ] Solo se guardan los campos completados — los vacíos no modifican el cupo
- [ ] La card de cupos seleccionados (código + status) sigue al tope
- [ ] El aviso "Solo se actualizan los campos que completes" permanece
- [ ] BottomBar fijo con "Guardar datos en X cupos"
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
