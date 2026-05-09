# TASKS — CPE Campo (Avancargo)

**Última actualización:** 2026-05-07  
**Product Manager:** Claude (coordinador de equipo)  
**Equipo:** Backend · Frontend · QA · Automatizaciones  
**Stack:** Vite + React + TypeScript + Tailwind + Supabase + n8n

---

## Diagnóstico del estado actual

### Lo que existe y funciona
- Autenticación por magic link con whitelist de emails
- Wizard de 6 pasos para carga manual de CPE
- CRUD completo + auditoría de cambios campo por campo
- Panel de admin (usuarios, logs, stats básicos)
- Configuración PWA (service worker registrado)
- TypeScript strict, sin imports rotos, sin errores de compilación

### Lo que falta para el proceso de negocio real

La app debe soportar **dos puntos de entrada equivalentes** al mismo flujo:

**Entrada A — Email comercial (el caso más común)**
El área comercial envía un email con los cupos aprobados.
El agrónomo lo pega en la app → se crean los cupos automáticamente
con todos los datos del email ya completados.

**Entrada B — Carga manual (cuando no hay email o el dato llega de otra forma)**
El agrónomo crea un cupo desde cero ingresando los datos a mano.
Misma pantalla de tabs, mismos estados, mismo flujo.

Ambas entradas crean un `CpeRecord` con `status = 'IMPORTADO'`
y a partir de ahí el flujo es **idéntico** en los dos casos:
IMPORTADO → TRANSPORTE → CARGADO → CERRADO → ENVIADO.

El nuevo backlog resuelve esto en este orden:

1. Base de datos preparada para el nuevo modelo (Backend primero)
2. Parser del email + importación en lote (Backend + Frontend)
3. Panel de gestión de cupos con estados (Frontend)
4. Edición progresiva por etapas — unifica ambas entradas en DetalleCupo (Frontend)
5. Automatizaciones sobre eventos de negocio (Automatizaciones)
6. Validaciones, robustez y tests (QA en paralelo con cada feature)

---

## Criterio de éxito del producto

La app está lista cuando un agrónomo puede hacer cualquiera de estos dos flujos:

**Flujo A — con email comercial:**
1. Recibir el email del área comercial en su celular
2. Copiar el texto, abrir la app, pegarlo y confirmar
3. Ver todos los cupos del día generados automáticamente
4. Asignar transporte, registrar pesajes y cerrar cupos
5. El destinatario recibe el resumen por WhatsApp automáticamente

**Flujo B — sin email, carga manual:**
1. Abrir la app, tocar "Nuevo cupo"
2. Completar los datos básicos a mano (grano, destino, fechas)
3. Continuar el mismo flujo de tabs: transporte → pesaje → cierre

**En ambos casos:** sin perder datos con mala señal en campo.

---

## Dependencias entre agentes (orden de ejecución)

```
SPRINT 0 ──► Backend (schema + tipos + funciones base)
                │
SPRINT 1 ──► Backend (parser server-side) + Frontend (parser client + ImportarCupos)
                │
SPRINT 2 ──► Frontend (Panel de Cupos + CupoCard + DetalleCupo con tabs)
                │
SPRINT 3 ──► Frontend (features secundarios) + Automatizaciones (n8n + webhooks)
                │
SPRINT 4 ──► QA (tests de todo el flujo completo)
```

Los sprints 0 y 1 son bloqueantes. No arrancar Frontend hasta que Backend
entregue los tipos actualizados y las funciones de storage.

---

---

# SPRINT 0 — Infraestructura de base de datos

> **Agente: BACKEND**
> Sin esto, nadie puede avanzar. Máxima prioridad.

---

### B-01 · Migración SQL completa

**Descripción:**
Crear el archivo `supabase/migrations/001_schema_completo.sql` con:

- DDL de las 4 tablas existentes: `authorized_emails`, `id_counter`, `cpe_records`, `audit_log`
- Nuevos campos en `cpe_records`:
  ```sql
  nro_planta     text,
  status         text NOT NULL DEFAULT 'IMPORTADO'
                 CHECK (status IN ('IMPORTADO','TRANSPORTE','CARGADO','CERRADO','ENVIADO')),
  imported_at    timestamptz,
  batch_id       uuid REFERENCES import_batches(id)
  ```
- Nueva tabla `import_batches`:
  ```sql
  CREATE TABLE import_batches (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_email_text text NOT NULL,
    parsed_data   jsonb,
    created_by    text NOT NULL,
    created_at    timestamptz DEFAULT now(),
    total_cupos   int,
    grano         text,
    destinatario  text,
    destino       text
  );
  ```
- Todas las RLS policies para ambas tablas (authenticated users only)
- Índices: `cpe_records(status)`, `cpe_records(batch_id)`, `cpe_records(fecha_carga)`
- INSERT inicial de `id_counter` con valor 0
- Seed del primer usuario admin en `authorized_emails`

**Agente:** Backend  
**Done cuando:**  
El script `.sql` corre sin errores en una instancia Supabase vacía, la app conecta, el login funciona y se puede crear un registro. Un developer nuevo puede levantar el entorno completo en menos de 15 minutos.

---

### B-02 · Actualizar `src/types/index.ts`

**Descripción:**
Extender las interfaces TypeScript para reflejar el nuevo modelo:

```typescript
// Agregar a CpeRecord:
nro_planta?: string
status: 'IMPORTADO' | 'TRANSPORTE' | 'CARGADO' | 'CERRADO' | 'ENVIADO'
imported_at?: string
batch_id?: string

// Nueva interfaz:
interface ImportBatch {
  id: string
  raw_email_text: string
  parsed_data: ParsedEmailData
  created_by: string
  created_at: string
  total_cupos: number
  grano: string
  destinatario: string
  destino: string
}

interface ParsedEmailData {
  grano: string
  localidad: string
  destinatario: string
  cuit_destinatario: string
  destino: string
  cuit_destino: string
  rte_venta_primaria: string
  nro_planta: string
  kg_estimados: number
  cupos: Array<{ codigo: string; fecha: string }>
}
```

Agregar también los nuevos labels al objeto `FIELD_LABELS` para los campos nuevos.

**Agente:** Backend  
**Done cuando:**  
`npm run build` pasa sin errores de tipo. Todas las interfaces están exportadas correctamente.

---

### B-03 · Actualizar `src/lib/storage.ts` con nuevas funciones

**Descripción:**
Agregar las siguientes funciones al módulo de storage:

1. `createImportBatch(batch: Omit<ImportBatch, 'id' | 'created_at'>): Promise<ImportBatch>`  
   Inserta un lote en `import_batches` y retorna el registro creado.

2. `createCuposEnLote(batchId: string, cupos: Omit<CpeRecord, 'id' | 'cpe_id' | 'created_at' | 'updated_at'>[]): Promise<CpeRecord[]>`  
   Inserta múltiples cupos en una sola operación. Genera CPE IDs secuenciales para cada uno.
   Si cualquier inserción falla, debe revertir todas (transacción atómica vía Supabase RPC o inserción secuencial con rollback manual).

3. `updateCupoStatus(cpeId: string, newStatus: CpeRecord['status'], userEmail: string): Promise<void>`  
   Actualiza el status de un cupo y registra el cambio en `audit_log`.

4. `getCuposByBatch(batchId: string): Promise<CpeRecord[]>`  
   Retorna todos los cupos de un lote, ordenados por fecha de cupo.

5. `getImportBatches(): Promise<ImportBatch[]>`  
   Lista todos los lotes importados, ordenados por `created_at DESC`.

**Agente:** Backend  
**Done cuando:**  
Cada función tiene su tipo de retorno correcto. La creación en lote de 10 cupos resulta en 10 registros en Supabase o 0 (nunca parcial). Verificable con Supabase Table Editor.

---

---

# SPRINT 1 — Importación desde email

> **Agentes: BACKEND + FRONTEND (en paralelo, una vez terminado Sprint 0)**
> Esta es la feature de mayor impacto. Desbloquea todo el flujo de negocio.

---

### B-04 · Crear `src/lib/emailParser.ts`

**Descripción:**
Módulo TypeScript puro (sin dependencias externas) con la función:

```typescript
export function parsearEmailCupos(rawText: string): ParsedEmailData | null
```

El parser debe extraer del formato de email comercial:

| Campo a extraer | Patrón en el email |
|---|---|
| `grano` | línea que empieza con `"Producto:"` |
| `localidad` | línea que empieza con `"Zona Destino:"` |
| `rte_venta_primaria` | línea que empieza con `"Vendedor:"` |
| `destinatario` | parte del nombre en `"Destinatario: NOMBRE CUIT XX-XXXXXXXX-X"` |
| `cuit_destinatario` | CUIT en la línea de Destinatario (formato `XX-XXXXXXXX-X` o `XXXXXXXXXXX`) |
| `destino` | parte del nombre en `"Destino: NOMBRE - CUIT XX-XXXXXXXX-X"` |
| `cuit_destino` | CUIT en la línea de Destino |
| `kg_estimados` | número después de `"CARREGA "` |
| `nro_planta` | número después de `"Nro. de Planta "` |
| `cupos[]` | cada fila de la tabla: código alfanumérico + fecha `DD.MM.YYYY` |

**Reglas de robustez:**
- Si falta un campo no crítico (ej: `nro_planta`), retornar igualmente con ese campo vacío.
- Si no se puede extraer ningún cupo de la tabla, retornar `null` (email inválido).
- Normalizar CUITs: quitar guiones, dejar solo 11 dígitos numéricos para guardar en DB.
- Convertir fechas `DD.MM.YYYY` → `YYYY-MM-DD` (formato ISO para Supabase).
- Trimear todos los strings extraídos.
- El parser no debe lanzar excepciones, debe retornar `null` en caso de error.

**Agente:** Backend (la lógica de parsing la define Backend, Frontend la integra)  
**Done cuando:**  
El parser extrae correctamente todos los campos del email de ejemplo del brief. QA valida con 5 variaciones del email.

---

### F-01 · Crear `src/pages/ImportarCupos.tsx`

**Descripción:**
Nueva pantalla accesible desde el Panel de Cupos (ruta `/importar`).

**Layout (mobile-first, max-width 430px):**

```
[Header: "Importar Cupos" + botón back]

[Paso 1 — visible por defecto]
  Label: "Pegá el email de cupos"
  Textarea grande (mínimo 200px height, font-size 14px)
  Placeholder: "Copiá y pegá el texto completo del email comercial..."
  Botón primario grande: "Parsear email" [Lucide: FileText]

[Paso 2 — visible después de parsear exitosamente]
  SectionTitle: "Datos comunes a todos los cupos"
  Campos editables (FormField/SelectField):
    - Grano (select), Localidad (text), Destinatario (text),
      CUIT Destinatario (text), Destino (text), CUIT Destino (text),
      Vendedor (text), Kg Estimados (number), Nro. de Planta (text)
  
  SectionTitle: "Cupos a importar (N cupos)"
  Tabla/lista con cada cupo:
    | Código          | Fecha      | [X eliminar] |
    | TBBMA260507EE52 | 07/05/2026 |              |
    | TBBMA260507EE70 | 07/05/2026 |              |
  
  Si el parser encontró error en un campo: mostrar Badge naranja 
  con el campo que no pudo extraer, no bloquear el flujo.
  
  Botón secundario: "← Editar texto"
  Botón primario grande: "Confirmar e importar (N cupos)"

[Estado de carga]
  Spinner + "Creando N cupos..."

[Estado de éxito]
  Toast verde + redirección automática al Panel de Cupos
```

**Brand Avancargo:**
- Header fondo `#1E3252`, texto blanco
- Botón primario `#1E3252`
- Botón de parsear: `#2C9FC0`
- Badge de error: `#FF6C02`
- IDs de cupos en `font-family: Martian Mono`
- Textarea con borde redondeado 12px

**Agente:** Frontend  
**Dependencias:** B-02 (tipos), B-03 (storage), B-04 (parser)  
**Done cuando:**  
Pegando el email del brief completo, la pantalla muestra los 3 cupos de ejemplo con todos los campos pre-llenados. Al confirmar, los registros aparecen en Supabase con `status = 'IMPORTADO'` y `batch_id` vinculado.

---

---

# SPRINT 2 — Panel de Gestión de Cupos

> **Agente: FRONTEND**
> Reemplaza el Home actual. Core de la experiencia diaria del agrónomo.

---

### F-02 · Rediseñar `src/pages/Home.tsx` como Panel de Cupos

**Descripción:**
Reemplazar la lista simple actual por un panel de gestión operacional.

**Layout:**

```
[Header: "Panel de Cupos" + badge conexión + icono logout]

[Barra de filtros — horizontal scroll en mobile]
  [Hoy] [Esta semana] | [Todos los estados ▾] | [Todos los granos ▾]

[Búsqueda]
  Input con placeholder "Buscar código, destinatario..."

[Lista de cupos — ordenada por fecha ASC, agrupada por fecha]
  "Miércoles 7 de mayo"
    [CupoCard] × N
  "Jueves 8 de mayo"
    [CupoCard] × N

[FAB — esquina inferior derecha]
  + Importar email  [icono: Mail]
  + Carga manual    [icono: PenLine]  ← abre el wizard existente
```

**Filtros:**
- Por fecha: Hoy / Esta semana / Fecha específica (date picker nativo)
- Por estado: multiselect chip (IMPORTADO, TRANSPORTE, CARGADO, CERRADO, ENVIADO)
- Por grano: select (los mismos del tipo GRANOS)
- Búsqueda libre: filtra por código de cupo, destinatario, transporte

**Estado vacío:**
Si no hay cupos para los filtros activos → ilustración simple + "No hay cupos para estos filtros" + botón "Importar email".

**Brand Avancargo:**
- Header `#1E3252`
- Chips de filtro activos: fondo `#2C9FC0`, texto blanco
- FAB: `#1E3252` con sombra
- Agrupadores de fecha: texto `#1E3252`, `font-family: Martian Mono`

**Agente:** Frontend  
**Done cuando:**  
Con 10 cupos en distintos estados, los filtros funcionan combinados. La búsqueda filtra en tiempo real sin llamadas extra a Supabase (filtrar sobre los registros ya cargados). El FAB tiene las dos opciones.

---

### F-03 · Crear `src/components/ui/CupoCard.tsx`

**Descripción:**
Componente de tarjeta para el Panel de Cupos.

**Layout de la card:**

```
┌─────────────────────────────────────────┐
│ TBBMA260507EE52          [IMPORTADO 🔵] │  ← Martian Mono para el código
│ Maíz · COFCO · 3.900 kg                │
│ La Esperanza · 07/05/2026               │
│                                         │
│                    [Asignar transporte →]│  ← botón contextual
└─────────────────────────────────────────┘
```

**Badge de estado (colores Avancargo):**

| Estado | Color fondo | Color texto |
|---|---|---|
| IMPORTADO | `#2C9FC0` (celeste) | blanco |
| TRANSPORTE | `#F59E0B` (amarillo) | blanco |
| CARGADO | `#FF6C02` (naranja) | blanco |
| CERRADO | `#16A34A` (verde) | blanco |
| ENVIADO | `#15803D` (verde oscuro) | blanco |

**Botón contextual según estado:**

| Estado | Texto del botón | Ícono Lucide |
|---|---|---|
| IMPORTADO | "Asignar transporte" | `Truck` |
| TRANSPORTE | "Registrar pesaje" | `Scale` |
| CARGADO | "Cerrar cupo" | `CheckCircle` |
| CERRADO / ENVIADO | "Ver detalle" | `Eye` |

El botón lleva al tab correcto de `DetalleCupo.tsx` directamente.

**Props:**
```typescript
interface CupoCardProps {
  cupo: CpeRecord
  onClick: () => void
  onActionClick: (tab: 'transporte' | 'pesaje' | 'cierre' | 'datos') => void
}
```

**Agente:** Frontend  
**Done cuando:**  
Cada estado muestra el badge y botón correcto. Tocar la card navega al detalle. Tocar el botón navega al detalle abriendo el tab correspondiente.

---

### F-04 · Crear `src/pages/DetalleCupo.tsx` con tabs por etapa

**Descripción:**
Reemplaza `RecordDetail.tsx` y `EditRecord.tsx` con una pantalla unificada y orientada al flujo de trabajo.

**Ruta:** `/cupo/:id`

**Layout:**

```
[Header: código CPE en Martian Mono + badge estado + botón back]

[Tabs — scroll horizontal si no entran]
  [Datos] [Transporte] [Pesaje] [Cierre] [Historial]

[Contenido del tab activo]

[Botón de acción fijo al fondo — visible solo en tabs con acción]
```

**Tab 1 — DATOS:**
- Campos del email: grano, localidad, destinatario, CUIT destinatario, destino, CUIT destino, vendedor, kg estimados, nro. planta, fecha de cupo
- Todos editables (FormField / SelectField)
- Botón fijo: "Guardar cambios"
- Si algún campo quedó vacío después del parser, marcar con borde naranja y placeholder "Completar"

**Tab 2 — TRANSPORTE:**
- Campos: Transporte (VoiceInput), CUIT Transporte, Chofer (VoiceInput), CUIL Chofer, Chasis (VoiceInput), Acoplado (VoiceInput)
- Validación CUIT/CUIL antes de guardar
- Botón fijo: "Guardar → Transporte Asignado" (fondo `#2C9FC0`)
- Habilitado solo si el cupo está en IMPORTADO o TRANSPORTE

**Tab 3 — PESAJE:**
- Cargados: Kg Bruto, Kg Tara, Kg Estimados (pre-completado del email), Kg Reales
- Descargados: Kg Bruto, Kg Tara
- Auto-cálculo: Kg Neto = Bruto − Tara (mostrar resultado en tiempo real, no editable)
- Botón fijo: "Guardar → Cargado" (fondo `#FF6C02`)
- Habilitado solo si el cupo está en TRANSPORTE o CARGADO

**Tab 4 — CIERRE:**
- N° RUCA (text), Ingeniero (text), Contacto (text)
- GPS: botón "Capturar ubicación" con coordenadas en Martian Mono
- Botón fijo: "Cerrar cupo" (fondo `#1E3252`)
- Al confirmar: modal de confirmación "¿Confirmar cierre del cupo TBBMA...?"
- Habilitado solo si el cupo está en CARGADO o CERRADO

**Tab 5 — HISTORIAL:**
- Audit log cronológico (igual al actual en RecordDetail)
- Solo lectura
- Siempre habilitado

**Regla de tabs bloqueados:**
Los tabs de etapas posteriores a la etapa actual están visibles pero con ícono de candado. Al tocarlos, toast: "Completá la etapa anterior primero."

**Agente:** Frontend  
**Done cuando:**  
El flujo completo IMPORTADO → TRANSPORTE → CARGADO → CERRADO funciona tab por tab. Cada guardado actualiza el badge de estado en el Header y en la card del Panel. El historial refleja todos los cambios.

---

---

# SPRINT 3 — Features secundarios

> **Agentes: FRONTEND + AUTOMATIZACIONES (en paralelo)**

---

### F-05 · Asignación de transporte en lote

**Descripción:**
Desde el Panel de Cupos, seleccionar múltiples cupos y asignar el mismo transporte a todos.

**Flujo UX:**
1. Modo selección: toque largo en una CupoCard activa el modo selección (checkbox aparece en todas las cards)
2. Seleccionar N cupos en estado IMPORTADO o TRANSPORTE
3. Barra inferior: "N cupos seleccionados · [Asignar transporte]"
4. Modal bottom sheet: formulario de transporte (mismo que Tab Transporte de DetalleCupo)
5. Al confirmar: actualiza todos los cupos seleccionados en paralelo
6. Toast: "Transporte asignado a N cupos"

**Restricción:** Solo se puede asignar en lote a cupos del mismo estado. Si hay mezcla, mostrar aviso y pedir confirmar solo los elegibles.

**Agente:** Frontend  
**Done cuando:**  
Seleccionar 3 cupos y asignar un transporte resulta en 3 registros actualizados con el mismo transporte y estado TRANSPORTE. Sin refrescar manualmente la pantalla.

---

### F-06 · Validación de CUIT/CUIL

**Descripción:**
Crear `src/lib/validarCuit.ts` (sin dependencias externas) con:

```typescript
export function validarCuit(cuit: string): boolean
export function formatearCuit(cuit: string): string   // "30-50673744-9"
export function normalizarCuit(cuit: string): string  // "30506737449"
```

**Algoritmo completo de `validarCuit`:**
1. Normalizar: `cuit.replace(/\D/g, '')`
2. Verificar longitud = 11, todos dígitos
3. Prefijos válidos: `['20','23','24','27','30','33','34']` — verificar con los 2 primeros dígitos
4. Coeficientes: `[5,4,3,2,7,6,5,4,3,2]`
5. Suma = `digits[0..9].reduce((acc, d, i) => acc + d * coef[i], 0)`
6. Resto = suma % 11
7. Si resto === 0 → dígito verificador = 0
8. Si resto === 1 → CUIT inválido (retornar `false`)
9. Si resto > 1 → dígito verificador = 11 - resto
10. Comparar con `digits[10]`

**`formatearCuit`:** toma 11 dígitos y retorna `"XX-XXXXXXXX-X"`  
**`normalizarCuit`:** quita todo lo que no sea dígito

**Aplicar en `src/pages/DetalleCupo.tsx` Tab Transporte:**
- Agregar estado de errores: `const [cuitErrors, setCuitErrors] = useState<Record<string,string>>({})`
- En los campos `CUIT Transporte` y `CUIL Chofer`: al perder el foco (`onBlur`) llamar a `validarCuit`
- Si inválido: mostrar mensaje debajo del campo en rojo (`text-red-500 text-xs`)
- El botón "Guardar → Transporte Asignado" queda `disabled` si `Object.keys(cuitErrors).length > 0`
- Al llamar a `updateRecord`: normalizar con `normalizarCuit` antes de pasar el valor

**Agente:** Frontend  
**Done cuando:**  
`validarCuit('30-50673744-9')` retorna `true`. `validarCuit('30-00000000-0')` retorna `false`. Campo inválido muestra error inline. Botón guardar deshabilitado con error presente. Valor guardado en DB sin guiones.

---

### F-07 · Persistencia de borrador en localStorage

**Descripción:**
Aplicar solo en `src/pages/NewRecord.tsx` (el wizard de carga manual).

**Implementación:**
- Key de localStorage: `draft_new_record`
- Guardar el estado completo del formulario + `currentStep` cada vez que cambia un campo, con debounce de 800ms (usar `useRef` para el timer, `clearTimeout` + `setTimeout`)
- Al montar (`useEffect` con `[]`): leer `localStorage.getItem('draft_new_record')`
- Si existe borrador: mostrar una barra fija en la parte inferior (NO el `useToast` existente que es auto-dismiss) con:
  - Texto: "Tenés un borrador guardado"
  - Botón "Restaurar" → parsear el JSON y cargar en el estado del form + step
  - Botón "Descartar" → `localStorage.removeItem('draft_new_record')`, ocultar la barra
- Al guardar exitosamente: `localStorage.removeItem('draft_new_record')`
- La barra de borrador: `fixed bottom-0`, fondo `#1E3252`, texto blanco, z-50, botones en blanco/naranja

**Agente:** Frontend  
**Done cuando:**  
Completar nombre en paso 1 del wizard, cerrar el browser, volver a abrir → aparece la barra "Tenés un borrador guardado". Al tocar "Restaurar" el campo y el paso están como se dejaron.

---

### F-08 · Indicador de estado de conexión

**Descripción:**

**Paso 1 — Crear `src/hooks/useOnlineStatus.ts`:**
```typescript
export function useOnlineStatus(): boolean
// Retorna navigator.onLine y escucha eventos window 'online'/'offline'
```

**Paso 2 — Extraer `ConnectionDot` de `Home.tsx` a `src/components/ui/ConnectionDot.tsx`:**
```typescript
export default function ConnectionDot({ online }: { online: boolean })
// Punto circular: verde (#22c55e) online, rojo (#ef4444) offline
```
Actualizar `Home.tsx` para importarlo desde ahí.

**Paso 3 — Barra de aviso offline global en `src/App.tsx`:**
- Usar `useOnlineStatus()` en `App.tsx`
- Cuando cambia a `false` (offline): mostrar barra fija `fixed top-14 left-0 right-0 z-20` fondo `#FF6C02`, texto blanco, altura 36px, centrada: "Sin conexión — guardá tus datos antes de cerrar la app"
- Cuando vuelve a `true` (online): ocultar la barra naranja y mostrar el `useToast` de "Conexión restaurada" por 3 segundos (el Toast ya existe en el proyecto)
- La barra naranja NO tiene botón de cerrar — desaparece sola cuando vuelve la conexión

**Agente:** Frontend  
**Done cuando:**  
Activar modo avión → aparece barra naranja debajo del header. Desactivar → barra desaparece y aparece toast verde "Conexión restaurada".

---

### A-01 · Webhook de Supabase al importar un lote

**Descripción:**
Configurar en Supabase un Database Webhook que se dispare cuando se inserta una fila en `import_batches`.

Payload que debe enviar al endpoint de n8n:
```json
{
  "event": "BATCH_IMPORTADO",
  "batch_id": "uuid",
  "grano": "Maiz",
  "destinatario": "COFCO",
  "total_cupos": 3,
  "created_by": "email@ejemplo.com",
  "created_at": "2026-05-07T10:00:00Z"
}
```

Documentar en `n8n/webhooks/README.md`:
- Cómo crear el webhook en el dashboard de Supabase (paso a paso con screenshots o descripción)
- URL del endpoint n8n donde apunta
- Cómo verificar que el webhook funciona (test payload desde Supabase)

**Agente:** Automatizaciones  
**Done cuando:**  
Al importar un email desde la app, el webhook llega al endpoint de n8n dentro de los 5 segundos. El payload tiene todos los campos descritos.

---

### A-02 · Flujo n8n: cupo CERRADO → WhatsApp al destinatario

**Descripción:**
Trigger: webhook de Supabase cuando `cpe_records.status` cambia a `'CERRADO'`.

Flujo:
1. Recibir payload con datos del cupo
2. Formatear mensaje:
   ```
   ✅ Cupo cerrado — [CÓDIGO]
   Grano: Maíz · Kg: 3.850
   Transporte: Camiones SA · Chofer: Juan Pérez
   Fecha: 07/05/2026
   ```
3. Enviar por WhatsApp Business API (o Twilio) al número del destinatario
4. Registrar envío en tabla `audit_log` con action `'NOTIFICACION_WA'`

Documentar en `n8n/workflows/cupo_cerrado_whatsapp.md`:
- Nodo por nodo del flujo
- Variables de entorno necesarias (token WA, número origen)
- Cómo probar sin enviar WA real (modo test)

**Agente:** Automatizaciones  
**Done cuando:**  
Cambiar un cupo a CERRADO desde la app dispara el flujo y el mensaje llega al número configurado de prueba. El log en Supabase refleja la notificación.

---

### A-03 · Flujo n8n: resumen diario a las 7am

**Descripción:**
Trigger: cron `0 7 * * *` (7am todos los días).

Flujo:
1. Query a Supabase: cupos del día con status agrupado por estado
2. Formatear resumen:
   ```
   📋 Resumen CPE Campo — 07/05/2026
   Total del día: 8 cupos
   ✅ Cerrados: 3
   🟡 En proceso: 4
   🔵 Importados: 1
   ```
3. Enviar por WhatsApp o email a todos los usuarios `is_admin = true`

Documentar en `n8n/workflows/resumen_diario.md`.

**Agente:** Automatizaciones  
**Done cuando:**  
El flujo corre manualmente y genera el resumen correcto. El cron está configurado en n8n y documentado.

---

### A-04 · Flujo n8n: alerta cupo estancado en TRANSPORTE

**Descripción:**
Trigger: cron cada 30 minutos.

Flujo:
1. Query a Supabase: cupos con `status = 'TRANSPORTE'` donde `updated_at < now() - interval '4 hours'`
2. Por cada cupo estancado: enviar alerta al `created_by` del cupo
3. Mensaje:
   ```
   ⚠️ Cupo sin movimiento
   [CÓDIGO] lleva más de 4 horas en "Transporte Asignado".
   ¿El camión ya llegó? Registrá el pesaje en la app.
   ```

**Agente:** Automatizaciones  
**Done cuando:**  
Documentado en `n8n/workflows/alerta_estancado.md`. Probado con un cupo de test con `updated_at` modificado manualmente.

---

---

# SPRINT 4 — QA

> **Agente: QA**
> Ejecutar después de cada sprint, no solo al final.

---

### Q-01 · Tests del parser de email

**Descripción:**
Crear `tests/emailParser.test.ts` con al menos estos casos:

| Caso | Input | Expected |
|---|---|---|
| Email completo del brief | texto exacto | todos los campos extraídos |
| Email con 1 solo cupo | 1 fila en tabla | array de 1 cupo |
| Email con 15 cupos | 15 filas | array de 15 cupos |
| Sin "CARREGA" en el email | email sin ese campo | `kg_estimados: 0` o null, sin crash |
| CUIT con guiones | `33-50673744-9` | normalizado a `33506737449` |
| CUIT sin guiones | `33506737449` | igual, normalizado |
| Texto completamente inválido | "hola mundo" | retorna `null` |
| Email con campos en mayúsculas distintas | `producto:` vs `Producto:` | extraer igual (case-insensitive) |

**Agente:** QA  
**Done cuando:**  
`npm test` pasa los 8 casos. El parser no lanza excepciones en ningún caso.

---

### Q-02 · Test de idempotencia en importación

**Descripción:**
Verificar que importar el mismo email dos veces no duplica los cupos.

La lógica antiduplicate debe estar en `crearCuposEnLote` o en `ImportarCupos.tsx`. QA define cuál es el comportamiento correcto y lo reporta al Backend/Frontend si falta implementarlo.

Criterio sugerido: usar el código de cupo (`cupo` field) como unique key. Si ya existe, ignorar o mostrar aviso.

**Agente:** QA  
**Done cuando:**  
Importar el mismo email dos veces resulta en los mismos N cupos (sin duplicados). La segunda importación muestra un aviso: "X cupos ya existían y fueron ignorados."

---

### Q-03 · Tests de transición de estados

**Descripción:**
Verificar que los estados solo pueden avanzar en el orden correcto:

| Transición | Resultado esperado |
|---|---|
| IMPORTADO → TRANSPORTE | ✅ permitido |
| TRANSPORTE → CARGADO | ✅ permitido |
| CARGADO → CERRADO | ✅ permitido |
| CERRADO → ENVIADO | ✅ permitido |
| IMPORTADO → CARGADO (saltear estado) | ❌ bloqueado por UI |
| CERRADO → TRANSPORTE (retroceder) | ❌ bloqueado por UI |

Si la UI no bloquea las transiciones inválidas, reportar al Frontend con pantalla donde ocurre.

**Agente:** QA  
**Done cuando:**  
Documento `tests/transiciones_estado.md` con resultado de cada caso. Los casos que fallan tienen issue abierto con pantalla y agente asignado.

---

### Q-04 · Test de comportamiento con mala señal

**Descripción:**
Simular condiciones de campo:

1. Abrir la app con buena señal, cargar Panel de Cupos
2. Activar modo avión
3. Intentar abrir un cupo → ¿muestra datos cargados o pantalla en blanco?
4. Completar Tab Transporte sin conexión → ¿guarda borrador?
5. Desactivar modo avión → ¿los datos se sincronizan?
6. Recargar la app sin conexión → ¿muestra algo útil?

Documentar cada resultado y reportar al Frontend los casos que fallan.

**Agente:** QA  
**Done cuando:**  
Documento `tests/offline_behavior.md` con resultado de cada paso. El caso 4 (borrador guardado) debe pasar. Si el caso 6 falla (pantalla en blanco), crear issue P1 para Frontend.

---

### Q-05 · Auditoría de accesibilidad y brand

**Descripción:**
Verificar en mobile (Chrome DevTools → device emulation o celular real):

- Todos los botones de acción tienen mínimo 48px de altura
- Los badges de estado tienen contraste suficiente (WCAG AA)
- Los IDs de cupos usan `Martian Mono` (inspeccionar en DevTools)
- El Header usa fondo `#1E3252` en todas las pantallas
- El botón de edición/acción usa `#FF6C02` (naranja)
- No hay emojis en la UI (solo íconos Lucide)
- La app es usable con el teléfono bajo luz solar directa

**Agente:** QA  
**Done cuando:**  
Checklist completado. Si algún punto falla, crear issue para Frontend con screenshot y componente afectado.

---

---

## Matriz de responsabilidades actualizada

| Agente | Tareas | Prioridad |
|--------|--------|-----------|
| **Backend** | B-01, B-02, B-03, B-04 | Sprint 0 (urgente) |
| **Frontend** | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08 | Sprint 1-3 |
| **Automatizaciones** | A-01, A-02, A-03, A-04 | Sprint 3 |
| **QA** | Q-01, Q-02, Q-03, Q-04, Q-05 | Sprint 4 (+ spot checks en cada sprint) |

---

## Tabla de estado de tareas

| ID | Tarea | Agente | Sprint | Estado |
|----|-------|--------|--------|--------|
| B-01 | Migración SQL completa | Backend | 0 | ✅ Completado |
| B-02 | Actualizar types/index.ts | Backend | 0 | ✅ Completado |
| B-03 | Actualizar storage.ts | Backend | 0 | ✅ Completado |
| B-04 | emailParser.ts (lógica) | Backend | 1 | ✅ Completado |
| F-01 | ImportarCupos.tsx | Frontend | 1 | ✅ Completado |
| F-02 | Home.tsx → Panel de Cupos | Frontend | 2 | ✅ Completado |
| F-03 | CupoCard.tsx | Frontend | 2 | ✅ Completado |
| F-04 | DetalleCupo.tsx con tabs | Frontend | 2 | ✅ Completado |
| F-05 | Asignación en lote | Frontend | 3 | ⬜ Pendiente |
| F-06 | Validación CUIT/CUIL | Frontend | 3 | ✅ Completado |
| F-07 | Borrador en localStorage | Frontend | 3 | ✅ Completado |
| F-08 | Indicador de conexión | Frontend | 3 | ✅ Completado |
| A-01 | Webhook import_batches | Automatizaciones | 3 | ⬜ Pendiente |
| A-02 | n8n: cupo cerrado → WA | Automatizaciones | 3 | ⬜ Pendiente |
| A-03 | n8n: resumen 7am | Automatizaciones | 3 | ⬜ Pendiente |
| A-04 | n8n: alerta estancado | Automatizaciones | 3 | ⬜ Pendiente |
| Q-01 | Tests parser email | QA | 4 | ✅ Completado |
| Q-02 | Test idempotencia | QA | 4 | ⬜ Pendiente |
| Q-03 | Tests transición estados | QA | 4 | ⬜ Pendiente |
| Q-04 | Test mala señal | QA | 4 | ⬜ Pendiente |
| Q-05 | Auditoría brand/accesibilidad | QA | 4 | ⬜ Pendiente |

> **Cómo actualizar esta tabla:** cambiar ⬜ por 🔄 (en progreso) o ✅ (completado)

---

## Notas de coordinación

### Para el Agente Backend
Empezar por B-01 y B-02 antes de B-03 y B-04. Los tipos deben estar correctos antes de escribir las funciones de storage. El parser (B-04) puede desarrollarse en paralelo con B-03 una vez que B-02 esté listo.

### Para el Agente Frontend  
No arrancar F-01 sin que B-02 y B-04 estén completados. Para F-02, F-03 y F-04 solo necesitás B-02 y B-03.

**Sobre el wizard existente (`NewRecord.tsx`):**
El wizard actual crea registros con el modelo viejo (`status: 'Enviado'`).
Debe adaptarse para que el alta manual también use el nuevo modelo:
- El wizard existente pasa a ser un formulario simplificado de "datos básicos"
  (solo los campos del Tab 1 de DetalleCupo: grano, localidad, destino, etc.)
- Al guardar, crea el cupo con `status = 'IMPORTADO'`
- Redirige a `DetalleCupo` en Tab Transporte para continuar el flujo
- Así ambas entradas (email y manual) convergen en la misma pantalla de tabs

No hace falta reescribir el wizard desde cero: simplificarlo a los campos básicos
y cambiar el destino de guardado es suficiente.

### Para el Agente Automatizaciones
Necesitás que B-01 esté desplegado en Supabase para poder configurar los webhooks. Los flujos n8n pueden diseñarse antes pero no probarse. Coordinar con Backend para el endpoint de prueba.

### Para el Agente QA
Q-01 puede ejecutarse en cuanto B-04 esté listo (es una función pura, fácil de testear aislada). El resto espera a que los features estén implementados. Reportar siempre con: pantalla afectada, pasos para reproducir, agente responsable de la corrección.
