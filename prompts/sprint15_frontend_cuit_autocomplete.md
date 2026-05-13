# PROMPT — Agente Frontend: Sprint 15 · Autocomplete razón social por CUIT

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/NewRecord.tsx`
- `src/pages/AsignarDatos.tsx`
- `src/pages/DetalleCupo.tsx`
- `src/components/ui/FormField.tsx` — componente base de inputs

---

## Contexto

Hay 15 pares CUIT/CUIL → nombre en el formulario CPE. Cuando el usuario carga un CUIT de 11 dígitos,
la app debe consultar la API pública de AFIP/ARCA y autocompletar el campo de razón social
correspondiente de forma automática.

---

## Pares CUIT → nombre (los mismos en los 3 archivos)

| Campo CUIT | Campo nombre |
|---|---|
| `cuit_transporte` | `transporte` |
| `cuil_chofer` | `chofer` |
| `titular_cuit` | `titular_nombre` |
| `remitente_comercial_cuit` | `remitente_comercial_nombre` |
| `cuit_rte_venta_primaria` | `rte_venta_primaria` |
| `cuit_rte_venta_secundaria` | `rte_venta_secundaria` |
| `cuit_rte_venta_secundaria2` | `rte_venta_secundaria2` |
| `cuit_corredor_primario` | `corredor_primario` |
| `cuit_corredor_secundario` | `corredor_secundario` |
| `cuit_repr_entregador` | `repr_entregador` |
| `cuit_repr_recibidor` | `repr_recibidor` |
| `cuit_destinatario` | `destinatario` |
| `cuit_destino` | `destino` |
| `cuit_pagador_flete` | `pagador_flete` |
| `cuit_intermediario` | `intermediario_flete` |

---

## TAREA 1 — Crear `src/lib/afip.ts`

Función que consulta la API pública de AFIP/ARCA y devuelve la razón social:

```ts
/**
 * Consulta el padrón público de AFIP/ARCA y devuelve la denominación.
 * - Personas jurídicas: razonSocial
 * - Personas físicas: apellido + nombre
 * Retorna null si el CUIT no existe, está inactivo o hay error de red.
 */
export async function fetchRazonSocial(cuit: string): Promise<string | null> {
  const clean = cuit.replace(/\D/g, '')
  if (clean.length !== 11) return null

  try {
    const res = await fetch(
      `https://soa.afip.gob.ar/sr-padron/v2/persona/${clean}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const dg = data?.datosGenerales
    if (!dg || dg.estadoClave !== 'ACTIVO') return null

    // Persona jurídica
    if (dg.razonSocial) return dg.razonSocial as string

    // Persona física
    if (dg.nombre) return dg.nombre as string

    return null
  } catch {
    return null
  }
}
```

> **Nota CORS:** La API de AFIP puede rechazar requests desde el browser con error CORS.
> Si ocurre, crear adicionalmente una Supabase Edge Function como proxy:
>
> `supabase/functions/afip-padron/index.ts`
> ```ts
> import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
>
> serve(async (req) => {
>   const url = new URL(req.url)
>   const cuit = url.searchParams.get('cuit')
>   if (!cuit) return new Response('missing cuit', { status: 400 })
>
>   const res = await fetch(`https://soa.afip.gob.ar/sr-padron/v2/persona/${cuit}`)
>   const data = await res.json()
>
>   return new Response(JSON.stringify(data), {
>     headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
>   })
> })
> ```
> Y ajustar `fetchRazonSocial` para llamar a la Edge Function en lugar de AFIP directo.

---

## TAREA 2 — Crear `src/components/ui/CuitField.tsx`

Componente que envuelve `FormField` y dispara el autocomplete al salir del campo:

```tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import FormField from './FormField'
import { fetchRazonSocial } from '../../lib/afip'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  onRazonSocialFound?: (nombre: string) => void
  placeholder?: string
  error?: string
}

export default function CuitField({ label, value, onChange, onRazonSocialFound, placeholder, error }: Props) {
  const [loading, setLoading] = useState(false)

  const handleBlur = async () => {
    const clean = value.replace(/\D/g, '')
    if (clean.length !== 11 || !onRazonSocialFound) return

    setLoading(true)
    const nombre = await fetchRazonSocial(clean)
    setLoading(false)

    if (nombre) onRazonSocialFound(nombre)
  }

  return (
    <div className="relative">
      <FormField
        label={label}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        placeholder={placeholder ?? '00-00000000-0'}
        error={error}
        inputMode="numeric"
      />
      {loading && (
        <div className="absolute right-3 top-9">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        </div>
      )}
    </div>
  )
}
```

> Verificá que `FormField` acepte la prop `onBlur`. Si no la tiene, agregársela:
> ```tsx
> // En FormField.tsx — agregar al <input>:
> onBlur={onBlur}
> // Y al interface Props:
> onBlur?: () => void
> ```

---

## TAREA 3 — Reemplazar FormField por CuitField en los 3 archivos

En **`NewRecord.tsx`**, **`AsignarDatos.tsx`** y **`DetalleCupo.tsx`**:

1. Importar `CuitField` desde `../components/ui/CuitField` (o la ruta relativa correcta)
2. Reemplazar cada `<FormField label="CUIT ..." ...>` con `<CuitField>` usando la prop `onRazonSocialFound`

### Ejemplo de reemplazo (aplicar para los 15 pares):

```tsx
// ANTES:
<FormField label="CUIT Empresa Transportista" value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} />
<FormField label="Transportista" value={str(form.transporte)} onChange={set('transporte')} />

// DESPUÉS:
<CuitField
  label="CUIT Empresa Transportista"
  value={str(form.cuit_transporte)}
  onChange={set('cuit_transporte')}
  onRazonSocialFound={(nombre) => set('transporte')(nombre)}
/>
<FormField label="Transportista" value={str(form.transporte)} onChange={set('transporte')} />
```

### Los 15 reemplazos a hacer:

```
cuit_transporte       → onRazonSocialFound → set('transporte')
cuil_chofer           → onRazonSocialFound → set('chofer')
titular_cuit          → onRazonSocialFound → set('titular_nombre')
remitente_comercial_cuit → onRazonSocialFound → set('remitente_comercial_nombre')
cuit_rte_venta_primaria  → onRazonSocialFound → set('rte_venta_primaria')
cuit_rte_venta_secundaria → onRazonSocialFound → set('rte_venta_secundaria')
cuit_rte_venta_secundaria2 → onRazonSocialFound → set('rte_venta_secundaria2')
cuit_corredor_primario → onRazonSocialFound → set('corredor_primario')
cuit_corredor_secundario → onRazonSocialFound → set('corredor_secundario')
cuit_repr_entregador  → onRazonSocialFound → set('repr_entregador')
cuit_repr_recibidor   → onRazonSocialFound → set('repr_recibidor')
cuit_destinatario     → onRazonSocialFound → set('destinatario')
cuit_destino          → onRazonSocialFound → set('destino')
cuit_pagador_flete    → onRazonSocialFound → set('pagador_flete')
cuit_intermediario    → onRazonSocialFound → set('intermediario_flete')
```

> **Importante en `DetalleCupo.tsx`:** ya existe lógica de validación CUIT con `validateCuitTransporte` y `validateCuilChofer` que se dispara en `onBlur`. Al reemplazar con `CuitField`, asegurate de que esa validación siga funcionando. `CuitField` llama a `handleBlur` internamente — si `FormField` acepta múltiples `onBlur`, combinalos. De lo contrario, mové la validación dentro de `CuitField` o usá un `useEffect` sobre el valor.

---

## Comportamiento esperado

1. Usuario escribe un CUIT de 11 dígitos en cualquier campo CUIT
2. Al salir del campo (blur), aparece un spinner pequeño a la derecha
3. La app consulta AFIP/ARCA silenciosamente
4. Si encuentra la razón social → autocompleta el campo nombre correspondiente
5. Si falla (CORS, CUIT no encontrado, red caída) → no hace nada, el usuario escribe el nombre manualmente
6. El campo nombre sigue siendo editable — el autocomplete es una sugerencia, no un lock

---

## Criterios de aceptación

- [ ] Al escribir un CUIT válido de 11 dígitos y salir del campo, el campo nombre se autocompleta
- [ ] El spinner aparece mientras se consulta la API
- [ ] Si la API falla, no rompe ni muestra error — el campo nombre queda vacío para carga manual
- [ ] El campo nombre sigue siendo editable después del autocomplete
- [ ] Funciona en los 3 archivos: NewRecord, AsignarDatos, DetalleCupo
- [ ] La validación de formato CUIT existente en DetalleCupo sigue funcionando
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo fuera de los listados
