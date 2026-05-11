# PROMPT — Agente Frontend: Sprint 11 · Alineación formularios individual y masivo

Sos el agente Frontend de CPE Campo (Avancargo). Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/NewRecord.tsx` — formulario de carga individual (6 pasos)
- `src/pages/ImportarCupos.tsx` — carga masiva por Excel

---

## Contexto

La carga individual y la carga masiva tienen que tener los mismos campos, organizados de la misma manera.

La diferencia entre ambas es:
- **Individual**: el usuario ingresa `cupo` (código de negocio) y `fecha_carga` a mano en la primera pantalla
- **Masivo**: `cupo` y `fecha_carga` vienen del Excel fila por fila. El usuario carga los datos comunes (mismos campos que individual) para aplicar a todos los cupos del lote

---

## TAREA 1 — Mover `cupo` al Paso 1 en `NewRecord.tsx`

### Situación actual
`cupo` está en el paso 3 (Flete), entre `pagador_flete` e `intermediario_flete`.

### Situación deseada
`cupo` debe ir en el **paso 1 (General)**, inmediatamente después de `fecha_carga`:

```tsx
{step === 1 && (
  <>
    <SectionTitle>Datos Generales</SectionTitle>
    <FormField label="Fecha de carga" value={str(form.fecha_carga)} onChange={set('fecha_carga')} type="date" required />
    <FormField label="Cupo" value={str(form.cupo)} onChange={set('cupo')} required />
    <SelectField label="Campo" value={str(form.campo)} onChange={set('campo')} options={CAMPOS} required />
    <SelectField label="Localidad" value={str(form.localidad)} onChange={set('localidad')} options={LOCALIDADES} required />
    <SelectField label="Grano" value={str(form.grano)} onChange={set('grano')} options={GRANOS} required />
    <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
  </>
)}
```

Quitar `cupo` del paso 3 (Flete) donde hoy está como `<VoiceInput label="Cupo" ...>`.

---

## TAREA 2 — Verificar alineación de secciones entre ambos formularios

Confirmar que `ImportarCupos.tsx` (sprint anterior) ya tiene las mismas secciones:
- **General**: Campo, Localidad, Grano, Variedad (cupo + fecha vienen del Excel)
- **Comercial**: Destinatario, CUIT Dest, Destino, CUIT Destino, Rte. Venta Primaria, Secundaria, Secundaria 2, Mercado a Término, Corredor Primario/Secundario, Repr. Entregador/Recibidor
- **Flete**: Km, Tarifa, Pagador de Flete, Intermediario, CUIL Intermediario, Nro. de Planta, Observaciones

Si falta algún campo respecto a lo que hay en `NewRecord.tsx`, agregarlo.

---

## Criterios de aceptación

- [ ] `cupo` aparece en el paso 1 de `NewRecord.tsx`, debajo de `fecha_carga`
- [ ] `cupo` ya no aparece en el paso 3 (Flete) de `NewRecord.tsx`
- [ ] Las secciones de `ImportarCupos.tsx` coinciden campo a campo con los pasos 1-3 de `NewRecord.tsx`
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
