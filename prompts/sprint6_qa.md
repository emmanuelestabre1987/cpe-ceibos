# PROMPT — Agente QA: Q-02 al Q-05

Sos el agente QA de CPE Campo (Avancargo). Tenés cuatro tareas. El repo está en `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Antes de empezar, leé estos archivos para entender el sistema:
- `src/pages/ImportarCupos.tsx` — importación masiva desde Excel
- `src/pages/DetalleCupo.tsx` — flujo de tabs por estado
- `src/lib/storage.ts` — funciones de DB
- `src/types/index.ts` — tipos y constantes
- `supabase/migrations/001_schema_completo.sql` — schema completo de la DB

---

## Contexto del sistema

**Flujo de negocio:** Excel con cupos → importación masiva → cupos en estado IMPORTADO → agrónomo asigna transporte, registra pesaje, cierra cupo → destinatario recibe notificación.

**Estados del cupo:** `IMPORTADO → TRANSPORTE → CARGADO → CERRADO → ENVIADO`

**Lock de tabs en DetalleCupo:** cada estado habilita solo los tabs correspondientes:
- IMPORTADO: solo tab Datos habilitado
- TRANSPORTE: Datos + Transporte
- CARGADO: Datos + Transporte + Pesaje
- CERRADO/ENVIADO: todos

**Excepción:** el menú ⋮ en DetalleCupo tiene "Forzar estado" (disponible a todos) y "Eliminar cupo" (solo admins), que bypasean el flujo normal. Esto es intencional.

---

## Q-02 · Idempotencia en importación

### Objetivo

Verificar qué pasa si el mismo lote de cupos se importa dos veces. El comportamiento esperado es que no haya duplicados.

### Pasos de prueba

1. Ejecutar `npm test` para ver qué tests ya existen.
2. Crear `tests/idempotencia.test.ts` con los siguientes casos usando Vitest:

```ts
// Caso 1: el campo `cupo` (código de negocio, ej: "TBBMA260507EE52")
// ¿tiene restricción UNIQUE en la DB?
// Leer 001_schema_completo.sql y verificar si existe UNIQUE en la columna `cupo`

// Caso 2: si no hay UNIQUE en DB, simular qué retorna storage.ts
// al insertar dos veces el mismo código de cupo

// Caso 3: ¿ImportarCupos.tsx verifica si un cupo ya existe antes de insertar?
// Leer el código y buscar si hay algún check de duplicados
```

### Qué documentar

Crear `tests/Q02_idempotencia.md` con:

```markdown
# Q-02 Idempotencia — Resultados

## ¿Hay UNIQUE constraint en `cupo` en la DB?
[Respuesta: SÍ / NO — con evidencia de 001_schema_completo.sql línea X]

## ¿ImportarCupos.tsx verifica duplicados antes de insertar?
[Respuesta: SÍ / NO — con evidencia del código o ausencia de él]

## Resultado del test de importación doble
[Descripción de qué pasaría con el sistema actual]

## Veredicto
- [ ] ✅ PASA — la importación doble no genera duplicados
- [ ] ❌ FALLA — se generarían duplicados

## Recomendación si FALLA
[Opción A: agregar UNIQUE constraint en DB sobre columna `cupo`]
[Opción B: verificar en ImportarCupos.tsx antes de llamar createCuposEnLote()]
[Elegir la opción más adecuada y explicar por qué]

## Agente responsable de la corrección
[Backend si es fix de DB / Frontend si es fix de UI]
```

### Cómo correr el test

```bash
npm test
```

Si el framework de tests no está configurado, usar `npx vitest run tests/`.

---

## Q-03 · Transiciones de estado

### Objetivo

Verificar que el sistema bloquea las transiciones inválidas **a nivel de UI** (no hace falta testear DB constraints — la validación es en cliente).

### Casos a verificar

Leer `DetalleCupo.tsx` y encontrar el mapa `LOCKED_TABS`. Verificar manualmente o por lectura de código cada caso:

| # | Transición | Mecanismo de bloqueo | Resultado esperado |
|---|---|---|---|
| 1 | IMPORTADO → tab Transporte | LOCKED_TABS | Tab bloqueado con 🔒 |
| 2 | IMPORTADO → tab Pesaje | LOCKED_TABS | Tab bloqueado con 🔒 |
| 3 | IMPORTADO → tab Cierre | LOCKED_TABS | Tab bloqueado con 🔒 |
| 4 | TRANSPORTE → tab Pesaje | LOCKED_TABS | Tab bloqueado con 🔒 |
| 5 | CARGADO → tab Cierre | LOCKED_TABS | Tab bloqueado con 🔒 |
| 6 | CERRADO → todos los tabs | Ningún lock | Todos accesibles |
| 7 | Forzar estado via menú ⋮ | Sin bloqueo (intencional) | Cualquier estado posible |
| 8 | Tab Cierre con status CERRADO | cierreReadOnly | Campos read-only |

Para cada caso marcá ✅ si el código lo implementa correctamente, ❌ si hay un bug.

### Crear `tests/Q03_transiciones_estado.md`

```markdown
# Q-03 Transiciones de estado — Resultados

## Tabla de verificación

| # | Transición | Resultado | Evidencia (archivo:línea) |
|---|---|---|---|
| 1 | ... | ✅/❌ | DetalleCupo.tsx:L45 |
...

## Bugs encontrados
[Si hay bugs, describirlos con: pantalla afectada, pasos para reproducir, agente responsable]

## Casos especiales verificados
- Menú ⋮ → Forzar estado: ¿el bottom sheet muestra el estado actual con ✓?
- Tab Cierre en CERRADO: ¿los campos son read-only correctamente?

## Veredicto
- [ ] ✅ Todos los casos pasan
- [ ] ❌ N casos fallan (ver bugs arriba)
```

---

## Q-04 · Comportamiento con mala señal

### Objetivo

Documentar el comportamiento actual del sistema en modo offline. Esta es una auditoría de código — no hace falta ejecutar la app.

### Análisis a realizar

Leer el código de estos archivos y responder cada pregunta:

**1. ¿Hay service worker configurado?**
Buscar en `public/` o `vite.config.ts` si hay PWA plugin (`vite-plugin-pwa`). Si está, ¿qué rutas cachea?

**2. ¿El Panel de Cupos (Home.tsx) funciona offline?**
Leer `src/hooks/useRecords.ts` (o similar). ¿Los registros se cachean en localStorage o solo se cargan desde Supabase?

**3. ¿DetalleCupo.tsx guarda datos offline?**
Buscar si hay algún `localStorage` o `IndexedDB` en el archivo. ¿Qué pasa si el usuario llena el Tab Transporte sin conexión y toca "Guardar"?

**4. ¿NewRecord.tsx tiene borrador en localStorage?**
Buscar `draft_new_record` en el código. ¿Está implementado?

**5. ¿Hay indicador visual de offline?**
Buscar `useOnlineStatus` y `ConnectionDot` en el código. ¿La barra naranja de "Sin conexión" está implementada en App.tsx?

### Crear `tests/Q04_offline_behavior.md`

```markdown
# Q-04 Comportamiento offline — Resultados

## Service Worker
[¿Configurado? ¿Qué rutas cachea?]

## Panel de Cupos sin conexión
[¿Los cupos del día anterior son visibles offline?]
[Veredicto: ✅ funciona / ⚠️ parcial / ❌ no funciona]

## DetalleCupo sin conexión
[¿Qué pasa al intentar guardar Tab Transporte sin internet?]
[Veredicto: ✅ muestra error claro / ⚠️ falla silenciosamente / ❌ crash]

## Borrador en NewRecord
[¿Está implementado draft_new_record en localStorage?]
[Veredicto: ✅ implementado / ❌ no implementado]

## Indicador visual offline
[¿La barra naranja y ConnectionDot están implementados?]
[Veredicto: ✅ / ❌]

## Issues detectados (P1 = crítico, P2 = importante, P3 = menor)

| ID | Prioridad | Descripción | Agente |
|---|---|---|---|
| OFF-1 | P? | ... | Frontend |

## Recomendaciones
[Las 2-3 mejoras más importantes para el caso de uso de campo]
```

---

## Q-05 · Auditoría de brand y accesibilidad

### Objetivo

Verificar por lectura de código que la UI cumple con los estándares de brand de Avancargo y accesibilidad básica.

### Checklist

Leer los componentes y páginas relevantes y verificar cada punto:

**Brand Avancargo:**
```
Colores primarios:
  #1E3252 = primary (header, botón principal)
  #2C9FC0 = secondary (acciones, links)
  #FF6C02 = accent (naranja, alertas, CARGADO)

Tipografía:
  font-mono = Martian Mono (IDs de cupos, labels de campos, badges de status)
  font-sans = Roboto (textos descriptivos, body)
```

| # | Criterio | Archivo a revisar | ✅/❌ |
|---|---|---|---|
| 1 | Header usa `bg-primary` (`#1E3252`) en todas las pantallas | Header.tsx | |
| 2 | IDs de cupos usan `font-mono` | CupoCard.tsx, DetalleCupo.tsx | |
| 3 | Labels de campos usan `font-mono` | FormField.tsx, DetalleCupo.tsx | |
| 4 | Badges de status usan los colores correctos | CupoCard.tsx, DetalleCupo.tsx | |
| 5 | Botones de acción tienen mínimo `h-11` (44px) o `h-12` (48px) | Button.tsx, BottomBar | |
| 6 | Action strip de CupoCard tiene `minHeight: 48px` | CupoCard.tsx | |
| 7 | No hay emojis hardcodeados en la UI (solo íconos Lucide) | todos los .tsx | |
| 8 | Placeholders de inputs son descriptivos | FormField.tsx, Home.tsx | |
| 9 | Botones tienen `aria-label` o texto visible | FAB en Home.tsx | |
| 10 | El indicador de conexión está presente en Home | Home.tsx (ConnectionDot) | |

**Contraste WCAG AA** (verificar por los valores de color, no hace falta herramienta):
- Texto blanco sobre `#1E3252` → ratio ~10:1 ✅
- Texto blanco sobre `#2C9FC0` → ratio ~3.5:1 ⚠️ (borderline AA)
- Texto blanco sobre `#FF6C02` → ratio ~3.2:1 ⚠️ (borderline AA)
- Texto blanco sobre `#F59E0B` (amarillo, TRANSPORTE) → ratio ~1.9:1 ❌ (falla AA)

El amarillo `#F59E0B` con texto blanco **falla contraste**. Documentar y sugerir alternativa (texto oscuro o cambiar a `#D97706`).

### Crear `tests/Q05_brand_accesibilidad.md`

```markdown
# Q-05 Auditoría de brand y accesibilidad — Resultados

## Checklist de brand

| # | Criterio | Resultado | Archivo:Línea |
|---|---|---|---|
| 1 | Header color | ✅/❌ | Header.tsx:X |
...

## Problemas de contraste detectados

| Badge/Color | Texto | Ratio | WCAG AA | Recomendación |
|---|---|---|---|---|
| TRANSPORTE (#F59E0B) | blanco | ~1.9:1 | ❌ FALLA | Cambiar a texto #1E3252 o badge #D97706 |

## Issues de accesibilidad

| ID | Prioridad | Descripción | Archivo | Agente |
|---|---|---|---|---|
| A11Y-1 | P? | ... | ... | Frontend |

## Puntos positivos
[Lo que está bien implementado]

## Veredicto general
- [ ] ✅ Sin issues críticos
- [ ] ⚠️ Issues menores (P3)
- [ ] ❌ Issues que requieren fix (P1/P2)
```

---

## Entregables esperados

Al terminar, el repo debe tener:

```
tests/
  Q02_idempotencia.md          ← análisis + veredicto
  Q03_transiciones_estado.md   ← tabla de verificación
  Q04_offline_behavior.md      ← auditoría offline
  Q05_brand_accesibilidad.md   ← checklist + issues
  idempotencia.test.ts         ← test Vitest para Q-02 (si aplica)
```

**Importante:** el agente QA NO modifica código de la app — solo audita, documenta y reporta. Si encontrás un bug, describilo con precisión (archivo, línea, comportamiento actual vs esperado, agente responsable) pero no lo corrijas.

## Prioridad de los issues

Si encontrás bugs, clasificarlos así:
- **P1 (crítico):** el flujo de negocio principal no puede completarse
- **P2 (importante):** funcionalidad degradada, tiene workaround
- **P3 (menor):** cosmético, accesibilidad opcional, UX mejorable
