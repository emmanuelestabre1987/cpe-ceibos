# Agente: Front end | Rama: `dev`

## IMPORTANTE

Este fix ya fue solicitado antes y no se implementó correctamente. Verificá línea a línea el archivo antes de marcar como hecho.

## Bugs a corregir

### BUG-1 + BUG-2 — `src/pages/EditRecord.tsx` (líneas ~187–259)

El archivo actualmente tiene:
- Campos CUIT usando `FormField` (sin autocomplete) — debe ser `CuitField` con `onRazonSocialFound`
- Orden incorrecto: nombre antes que CUIT — debe ser CUIT primero, nombre después

Reemplazar toda la sección de Intervinientes (campos fijos + roles opcionales + campos fijos inferiores) para que quede **exactamente igual** al Step 2 de `NewRecord.tsx`.

El resultado exacto debe ser:

```tsx
{/* Siempre visibles — parte superior */}
<CuitField  label="CUIT Titular"                  value={str(form.titular_cuit)}               onChange={set('titular_cuit')}               onRazonSocialFound={set('titular_nombre')} />
<VoiceInput label="Titular Carta de Porte"        value={str(form.titular_nombre)}             onChange={set('titular_nombre')} />
<CuitField  label="CUIT Remitente Comercial"      value={str(form.remitente_comercial_cuit)}   onChange={set('remitente_comercial_cuit')}    onRazonSocialFound={set('remitente_comercial_nombre')} />
<VoiceInput label="Remitente Comercial Productor" value={str(form.remitente_comercial_nombre)} onChange={set('remitente_comercial_nombre')} />

{/* Roles opcionales — toggles */}
<div>
  <p className="font-mono text-xs font-medium text-text-muted uppercase tracking-wide px-0.5 mb-2">
    Roles opcionales
  </p>
  <div className="flex flex-wrap gap-2">
    {ROLES_OPCIONALES.map(({ id, label }) => {
      const active = rolesActivos.has(id)
      return (
        <button
          key={id}
          type="button"
          onClick={() => toggleRol(id)}
          className={`h-8 px-3 rounded-full border font-mono text-xs font-medium transition-colors active:scale-[0.97] ${
            active
              ? 'border-secondary bg-secondary text-white'
              : 'border-gray-light bg-white text-text-muted'
          }`}
        >
          {label}
        </button>
      )
    })}
  </div>
</div>

{/* Campos condicionales por rol */}
{rolesActivos.has('rte_primaria') && (<>
  <CuitField  label="CUIT Rte. Comercial Venta Primaria"      value={str(form.cuit_rte_venta_primaria)}    onChange={set('cuit_rte_venta_primaria')}    onRazonSocialFound={set('rte_venta_primaria')} />
  <VoiceInput label="Rte. Comercial Venta Primaria"           value={str(form.rte_venta_primaria)}         onChange={set('rte_venta_primaria')} />
</>)}
{rolesActivos.has('rte_secundaria') && (<>
  <CuitField  label="CUIT Rte. Comercial Venta Secundaria"    value={str(form.cuit_rte_venta_secundaria)}  onChange={set('cuit_rte_venta_secundaria')}   onRazonSocialFound={set('rte_venta_secundaria')} />
  <VoiceInput label="Rte. Comercial Venta Secundaria"         value={str(form.rte_venta_secundaria)}       onChange={set('rte_venta_secundaria')} />
</>)}
{rolesActivos.has('rte_secundaria2') && (<>
  <CuitField  label="CUIT Rte. Comercial Venta Secundaria 2"  value={str(form.cuit_rte_venta_secundaria2)} onChange={set('cuit_rte_venta_secundaria2')}  onRazonSocialFound={set('rte_venta_secundaria2')} />
  <VoiceInput label="Rte. Comercial Venta Secundaria 2"       value={str(form.rte_venta_secundaria2)}      onChange={set('rte_venta_secundaria2')} />
</>)}
{rolesActivos.has('mercado') && (
  <VoiceInput label="Mercado a Término" value={str(form.mercado_termino)} onChange={set('mercado_termino')} />
)}
{rolesActivos.has('corredor_primario') && (<>
  <CuitField  label="CUIT Corredor Venta Primaria"            value={str(form.cuit_corredor_primario)}     onChange={set('cuit_corredor_primario')}     onRazonSocialFound={set('corredor_primario')} />
  <VoiceInput label="Corredor Venta Primaria"                 value={str(form.corredor_primario)}          onChange={set('corredor_primario')} />
</>)}
{rolesActivos.has('corredor_secundario') && (<>
  <CuitField  label="CUIT Corredor Venta Secundaria"          value={str(form.cuit_corredor_secundario)}   onChange={set('cuit_corredor_secundario')}   onRazonSocialFound={set('corredor_secundario')} />
  <VoiceInput label="Corredor Venta Secundaria"               value={str(form.corredor_secundario)}        onChange={set('corredor_secundario')} />
</>)}
{rolesActivos.has('repr_entregador') && (<>
  <CuitField  label="CUIT Representante Entregador"           value={str(form.cuit_repr_entregador)}       onChange={set('cuit_repr_entregador')}       onRazonSocialFound={set('repr_entregador')} />
  <VoiceInput label="Representante Entregador"                value={str(form.repr_entregador)}            onChange={set('repr_entregador')} />
</>)}
{rolesActivos.has('repr_recibidor') && (<>
  <CuitField  label="CUIT Representante Recibidor"            value={str(form.cuit_repr_recibidor)}        onChange={set('cuit_repr_recibidor')}        onRazonSocialFound={set('repr_recibidor')} />
  <VoiceInput label="Representante Recibidor"                 value={str(form.repr_recibidor)}             onChange={set('repr_recibidor')} />
</>)}

{/* Siempre visibles — parte inferior */}
<CuitField  label="CUIT Destinatario"           value={str(form.cuit_destinatario)}   onChange={set('cuit_destinatario')}   onRazonSocialFound={set('destinatario')} />
<VoiceInput label="Destinatario"                value={str(form.destinatario)}        onChange={set('destinatario')} />
<CuitField  label="CUIT Destino"                value={str(form.cuit_destino)}        onChange={set('cuit_destino')}        onRazonSocialFound={set('destino')} />
<VoiceInput label="Destino"                     value={str(form.destino)}             onChange={set('destino')} />
<CuitField  label="CUIT Flete Pagador"          value={str(form.cuit_pagador_flete)}  onChange={set('cuit_pagador_flete')}  onRazonSocialFound={set('pagador_flete')} />
<VoiceInput label="Flete Pagador"               value={str(form.pagador_flete)}       onChange={set('pagador_flete')} />
<CuitField  label="CUIT Intermediario de Flete" value={str(form.cuit_intermediario)}  onChange={set('cuit_intermediario')}  onRazonSocialFound={set('intermediario_flete')} />
<VoiceInput label="Intermediario de Flete"      value={str(form.intermediario_flete)} onChange={set('intermediario_flete')} />
```

### WARN-1 — `src/pages/ImportarCupos.tsx` (~línea 220)

En la función `handleFile`, donde se resetea el estado al subir un nuevo archivo, agregar el reset de roles activos:

```ts
// Antes
setCampos(CAMPOS_VACIOS)

// Después
setCampos(CAMPOS_VACIOS)
setRolesActivos(new Set())
```

## Verificación obligatoria antes de marcar como hecho

1. Abrir `EditRecord.tsx` y buscar `FormField` dentro de la sección Intervinientes — no debe aparecer ninguno
2. Verificar que todos los campos CUIT tienen `onRazonSocialFound`
3. Verificar que en todos los pares el `CuitField` aparece antes que el `VoiceInput`
4. En `ImportarCupos.tsx` buscar `handleFile` y confirmar que `setRolesActivos(new Set())` está junto a `setCampos(CAMPOS_VACIOS)`
