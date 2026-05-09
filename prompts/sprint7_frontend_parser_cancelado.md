# PROMPT — Agente Frontend: Sprint 7 · Parser WhatsApp + Estado CANCELADO

Sos el agente Frontend de CPE Campo (Avancargo). Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé estos archivos antes de empezar:
- `src/types/index.ts` — tipos del sistema (CpeStatus, CpeRecord)
- `src/pages/DetalleCupo.tsx` — flujo de tabs, menu ⋮, guardado de datos
- `src/pages/AsignarTransporte.tsx` — asignación masiva de transporte
- `src/components/ui/CupoCard.tsx` — card del panel principal
- `src/pages/Home.tsx` — panel principal con filtros de estado

---

## Contexto del sistema

**Flujo de negocio:** `IMPORTADO → TRANSPORTE → CARGADO → CERRADO → ENVIADO`  
**Nuevo estado terminal:** `CANCELADO` (ya agregado a la DB y al tipo `CpeStatus` por el agente Backend)  
**Stack:** Vite + React + TypeScript + Tailwind CSS + Supabase  
**Brand:** `#1E3252` primary · `#2C9FC0` secondary · `#FF6C02` accent · Martian Mono = `font-mono` · Roboto = `font-sans`  
**Max width:** 430px (`max-w-mobile`)

---

## TAREA 1 — Parser de mensaje WhatsApp (`src/lib/transporteParser.ts`)

Crear el archivo `src/lib/transporteParser.ts`.

### Formato de mensaje

Los transportistas envían datos de transporte por WhatsApp en formato libre. El parser debe aceptar el siguiente template oficial (flexible, sin depender del orden ni del formato exacto):

```
🚛 Datos de transporte
Empresa: [nombre empresa]
CUIT: [XX-XXXXXXXX-X]
Chofer: [nombre completo]
CUIL: [XX-XXXXXXXX-X]
Chasis: [patente]
Acoplado: [patente] (puede estar ausente)
```

El template es flexible: los campos pueden venir en cualquier orden, con o sin emojis, con guiones o sin guiones en CUIT/CUIL, con patentes en formato viejo (`ABC123`) o nuevo (`AB123CD`).

### Implementación

```ts
export interface TransporteParseResult {
  transporte?: string
  cuit_transporte?: string
  chofer?: string
  cuil_chofer?: string
  chasis?: string
  acoplado?: string
  /** Campos que no se pudieron detectar */
  missing: string[]
}

export function parseTransporteMsg(text: string): TransporteParseResult {
  // ...
}
```

**Reglas de extracción:**

1. **Empresa / Transporte:**  
   Buscar línea que empiece con `empresa:`, `transporte:`, `transportista:` (case-insensitive).  
   Capturar todo el texto después de `:` (trim).

2. **CUIT del transporte:**  
   Buscar línea con `cuit:` o `cuit empresa:` o `cuit transporte:`.  
   Si no hay label, buscar el primer número de 11 dígitos en formato `\d{2}[-.]?\d{8}[-.]?\d` que no esté en una línea que mencione "chofer" o "cuil".

3. **Chofer:**  
   Buscar línea con `chofer:` o `conductor:`.

4. **CUIL del chofer:**  
   Buscar línea con `cuil:` o `cuil chofer:`.  
   Si no hay label, buscar el segundo número de 11 dígitos en el texto.

5. **Chasis:**  
   Buscar línea con `chasis:`, `patente:`, `dominio:`.  
   Regex de patente: `/\b([A-Z]{2,3}\s?\d{3,4}\s?[A-Z]{0,3})\b/i`.  
   Tomar la primera patente encontrada en esa línea.

6. **Acoplado:**  
   Buscar línea con `acoplado:`, `semi:`, `remolque:`.  
   Aplicar la misma regex de patente.

7. **`missing`:** lista de campos requeridos (`transporte`, `cuit_transporte`, `chofer`, `cuil_chofer`, `chasis`) que quedaron vacíos.

8. **CUIT/CUIL:** devolver siempre sin guiones ni puntos (solo dígitos, 11 caracteres).  
   El componente de UI se encarga del formateo visual.

**Casos edge:**
- Si el mensaje tiene "CUIT/CUIL" en una sola línea con dos números, asignar el primero a `cuit_transporte` y el segundo a `cuil_chofer`.
- Ignorar líneas que solo tengan emojis o texto de encabezado (ej: `🚛 Datos de transporte`).
- Si una línea tiene `patente chasis: ABC123 / DEF456`, separar por `/` y tomar el primero como chasis y el segundo como acoplado.

---

## TAREA 2 — Botón "Pegar mensaje WA" en DetalleCupo (tab Transporte)

En `DetalleCupo.tsx`, dentro del tab Transporte (donde se cargan los datos de transporte del cupo):

### Agregar botón

Encima del primer campo del formulario de transporte, agregar:

```tsx
<button
  type="button"
  onClick={() => setParserOpen(true)}
  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-secondary text-secondary font-sans text-sm font-medium mb-4 active:bg-blue-50"
>
  <MessageSquare className="w-4 h-4" />
  Pegar mensaje WA
</button>
```

Importar `MessageSquare` de `lucide-react`.

### Modal/sheet del parser

Al hacer click, mostrar un `<textarea>` en un bottom sheet (mismo estilo que los sheets existentes en el componente) con:

- Placeholder: `"Pegá acá el mensaje de WhatsApp con los datos del transportista..."`
- Botón "Extraer datos" (primary)
- Al confirmar, llamar a `parseTransporteMsg(texto)` e inyectar los valores en los campos del formulario de transporte
- Si `result.missing.length > 0`, mostrar un aviso: `"No se detectaron: ${result.missing.join(', ')}. Completá manualmente."`
- Cerrar el sheet después de extraer

Estado nuevo: `parserOpen: boolean` (useState).

### Campos del formulario de transporte en DetalleCupo

Verificar cómo se llaman los campos en el estado del tab Transporte y mapear el resultado del parser a esos campos. Leer el código existente para no asumir nombres.

---

## TAREA 3 — Botón "Pegar mensaje WA" en AsignarTransporte

En `AsignarTransporte.tsx`, aplicar la misma lógica que en la Tarea 2:

- Botón "Pegar mensaje WA" encima del primer campo del formulario
- Bottom sheet con textarea
- Misma lógica de extracción e inyección
- Mismo aviso de campos faltantes

---

## TAREA 4 — Estado CANCELADO en la UI

El tipo `CpeStatus` ya incluye `'CANCELADO'`. Actualizar todos los lugares donde se mapea por status:

### 4a. CupoCard.tsx

Agregar `CANCELADO` a `STATUS_CONFIG` y `ACTION_CONFIG`:

```ts
// STATUS_CONFIG
CANCELADO: { bg: '#9CA3AF', label: 'CANCELADO', text: '#ffffff' },

// ACTION_CONFIG
CANCELADO: { label: 'Ver detalle', Icon: Eye, tab: 'datos' },
```

El gris `#9CA3AF` (Tailwind `gray-400`) comunica visualmente que el cupo está inactivo.

### 4b. DetalleCupo.tsx — menú ⋮ "Cancelar cupo"

En el bottom sheet del menú ⋮ (donde están "Forzar estado" y "Eliminar cupo"), agregar una nueva opción:

```tsx
<button
  onClick={() => { setMenuOpen(false); setCancelConfirm(true) }}
  className="w-full text-left px-4 py-3.5 font-sans text-sm text-orange-600 font-medium border-t border-gray-100"
>
  Cancelar cupo
</button>
```

Mostrar solo si `status !== 'CANCELADO'` (no tiene sentido cancelar un cupo ya cancelado).

**Diálogo de confirmación** (`cancelConfirm`):

```tsx
// Modal similar al de eliminar, pero texto distinto
<p>¿Cancelar este cupo?</p>
<p className="text-xs text-text-muted mt-1">
  El cupo quedará registrado como CANCELADO. Esta acción no se puede deshacer desde la app.
</p>
// Botones: "Volver" (ghost) + "Cancelar cupo" (naranja, no rojo)
```

Al confirmar:
1. Llamar a `updateCupoStatus(cupo.id, 'CANCELADO')`
2. Llamar a `updateRecord(cupo.id, { status: 'CANCELADO' })`
3. Mostrar toast "Cupo cancelado"
4. Navegar a `/` (volver al panel)

**Estado CANCELADO en tabs:** todos los tabs deben estar bloqueados (read-only), igual que `CERRADO`. Verificar el mapa `LOCKED_TABS` en el archivo y agregar `CANCELADO` como estado donde todos los tabs están habilitados pero con `cierreReadOnly = true` (o el mecanismo equivalente que exista en el código).

### 4c. Home.tsx — filtro de chips

En el panel principal hay chips de filtro por estado. Agregar chip `CANCELADO` si no existe, con color gris. El chip debe usar el mismo sistema de filtrado que los otros estados.

Leer cómo están implementados los chips actuales y seguir el mismo patrón.

---

## Orden de ejecución sugerido

1. Crear `src/lib/transporteParser.ts` (sin dependencias)
2. Actualizar `CupoCard.tsx` (CANCELADO en config maps)
3. Actualizar `Home.tsx` (chip CANCELADO)
4. Actualizar `DetalleCupo.tsx` (parser + cancelar cupo)
5. Actualizar `AsignarTransporte.tsx` (parser)

---

## Criterios de aceptación

- [ ] `src/lib/transporteParser.ts` existe y exporta `parseTransporteMsg` y `TransporteParseResult`
- [ ] Parser extrae correctamente empresa, CUIT, chofer, CUIL, chasis, acoplado del template oficial
- [ ] Botón "Pegar mensaje WA" funciona en DetalleCupo tab Transporte e inyecta los campos
- [ ] Botón "Pegar mensaje WA" funciona en AsignarTransporte e inyecta los campos
- [ ] `CupoCard.tsx` muestra cupos CANCELADO con badge gris
- [ ] `DetalleCupo.tsx` tiene opción "Cancelar cupo" en menú ⋮ (oculta si ya es CANCELADO)
- [ ] Al cancelar, el cupo queda en estado CANCELADO y se vuelve al panel
- [ ] Cupos CANCELADO tienen todos los tabs en read-only
- [ ] Home.tsx tiene chip de filtro para CANCELADO
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se crearon archivos de documentación ni tests
