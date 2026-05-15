# Agente: Front end | Rama: `dev`

## Contexto

En `src/pages/EditRecord.tsx` la sección Intervinientes tiene dos problemas respecto a `src/pages/NewRecord.tsx`:

1. Los campos CUIT usan `FormField` en lugar de `CuitField` — sin autocomplete de razón social
2. El orden está invertido: en EditRecord aparece primero el nombre y después el CUIT, cuando debería ser al revés (CUIT primero para que el autocomplete dispare el nombre)

## Qué implementar

Reemplazar en `src/pages/EditRecord.tsx` todos los pares nombre/CUIT de la sección Intervinientes para que usen el mismo componente y orden que `NewRecord.tsx`:

- Usar `CuitField` en lugar de `FormField` para todos los campos CUIT
- El orden correcto es siempre: **CuitField (CUIT) primero → VoiceInput (nombre) después**
- Agregar la prop `onRazonSocialFound` en cada `CuitField` apuntando al campo nombre correspondiente

## Referencia — cómo debe quedar (igual que NewRecord.tsx)

```tsx
// Siempre visibles
<CuitField  label="CUIT Titular"                  value={str(form.titular_cuit)}               onChange={set('titular_cuit')}               onRazonSocialFound={set('titular_nombre')} />
<VoiceInput label="Titular Carta de Porte"        value={str(form.titular_nombre)}             onChange={set('titular_nombre')} />
<CuitField  label="CUIT Remitente Comercial"      value={str(form.remitente_comercial_cuit)}   onChange={set('remitente_comercial_cuit')}    onRazonSocialFound={set('remitente_comercial_nombre')} />
<VoiceInput label="Remitente Comercial Productor" value={str(form.remitente_comercial_nombre)} onChange={set('remitente_comercial_nombre')} />

// Roles opcionales (condicionales)
<CuitField  label="CUIT Rte. Comercial Venta Primaria"      value={str(form.cuit_rte_venta_primaria)}    onChange={set('cuit_rte_venta_primaria')}    onRazonSocialFound={set('rte_venta_primaria')} />
<VoiceInput label="Rte. Comercial Venta Primaria"           value={str(form.rte_venta_primaria)}         onChange={set('rte_venta_primaria')} />

<CuitField  label="CUIT Rte. Comercial Venta Secundaria"    value={str(form.cuit_rte_venta_secundaria)}  onChange={set('cuit_rte_venta_secundaria')}   onRazonSocialFound={set('rte_venta_secundaria')} />
<VoiceInput label="Rte. Comercial Venta Secundaria"         value={str(form.rte_venta_secundaria)}       onChange={set('rte_venta_secundaria')} />

<CuitField  label="CUIT Rte. Comercial Venta Secundaria 2"  value={str(form.cuit_rte_venta_secundaria2)} onChange={set('cuit_rte_venta_secundaria2')}  onRazonSocialFound={set('rte_venta_secundaria2')} />
<VoiceInput label="Rte. Comercial Venta Secundaria 2"       value={str(form.rte_venta_secundaria2)}      onChange={set('rte_venta_secundaria2')} />

<VoiceInput label="Mercado a Término" value={str(form.mercado_termino)} onChange={set('mercado_termino')} />

<CuitField  label="CUIT Corredor Venta Primaria"            value={str(form.cuit_corredor_primario)}     onChange={set('cuit_corredor_primario')}     onRazonSocialFound={set('corredor_primario')} />
<VoiceInput label="Corredor Venta Primaria"                 value={str(form.corredor_primario)}          onChange={set('corredor_primario')} />

<CuitField  label="CUIT Corredor Venta Secundaria"          value={str(form.cuit_corredor_secundario)}   onChange={set('cuit_corredor_secundario')}   onRazonSocialFound={set('corredor_secundario')} />
<VoiceInput label="Corredor Venta Secundaria"               value={str(form.corredor_secundario)}        onChange={set('corredor_secundario')} />

<CuitField  label="CUIT Representante Entregador"           value={str(form.cuit_repr_entregador)}       onChange={set('cuit_repr_entregador')}       onRazonSocialFound={set('repr_entregador')} />
<VoiceInput label="Representante Entregador"                value={str(form.repr_entregador)}            onChange={set('repr_entregador')} />

<CuitField  label="CUIT Representante Recibidor"            value={str(form.cuit_repr_recibidor)}        onChange={set('cuit_repr_recibidor')}        onRazonSocialFound={set('repr_recibidor')} />
<VoiceInput label="Representante Recibidor"                 value={str(form.repr_recibidor)}             onChange={set('repr_recibidor')} />

// Siempre visibles — parte inferior
<CuitField  label="CUIT Destinatario"           value={str(form.cuit_destinatario)}  onChange={set('cuit_destinatario')}  onRazonSocialFound={set('destinatario')} />
<VoiceInput label="Destinatario"                value={str(form.destinatario)}       onChange={set('destinatario')} />
<CuitField  label="CUIT Destino"                value={str(form.cuit_destino)}       onChange={set('cuit_destino')}       onRazonSocialFound={set('destino')} />
<VoiceInput label="Destino"                     value={str(form.destino)}            onChange={set('destino')} />
<CuitField  label="CUIT Flete Pagador"          value={str(form.cuit_pagador_flete)} onChange={set('cuit_pagador_flete')} onRazonSocialFound={set('pagador_flete')} />
<VoiceInput label="Flete Pagador"               value={str(form.pagador_flete)}      onChange={set('pagador_flete')} />
<CuitField  label="CUIT Intermediario de Flete" value={str(form.cuit_intermediario)} onChange={set('cuit_intermediario')} onRazonSocialFound={set('intermediario_flete')} />
<VoiceInput label="Intermediario de Flete"      value={str(form.intermediario_flete)} onChange={set('intermediario_flete')} />
```

## Criterios de verificación

- [ ] Al ingresar un CUIT en edición, el nombre se autocompleta igual que en nueva carga
- [ ] El orden CUIT → nombre es consistente en toda la sección
- [ ] Los toggles de roles opcionales siguen funcionando igual
- [ ] No hay regresiones en el guardado

## Archivo a modificar

- `src/pages/EditRecord.tsx` — sección Intervinientes (~líneas 185–260)
