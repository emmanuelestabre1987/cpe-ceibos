# PROMPT — Agente QA: Sprint 13 · Alineación de campos entre flujos de carga

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

---

## Contexto

La app tiene tres flujos de ingreso de datos:

| Flujo | Archivo principal |
|-------|-------------------|
| **Importar mail** | `src/pages/Home.tsx` + `src/types/index.ts` (`ParsedEmailData`) |
| **Carga individual** | `src/pages/NewRecord.tsx` |
| **Carga masiva** | `src/pages/ImportarCupos.tsx` |

Y un tipo central que define todos los campos del cupo:

| Tipo | Archivo |
|------|---------|
| `CpeRecord` | `src/types/index.ts` |

Los campos CPE requeridos por AFIP (según benchmark del proyecto) están definidos en `CP_REQUIRED` dentro de `src/pages/DetalleCupo.tsx`.

---

## TAREA 1 — Mapear `ParsedEmailData` vs `CpeRecord`

Leer `src/types/index.ts` y producir una tabla comparativa:

| Campo | ParsedEmailData | CpeRecord | Notas |
|-------|:--------------:|:---------:|-------|
| grano | ✓ | ✓ | |
| localidad | ✓ | ✓ | |
| campo | ✓ (opcional) | ✓ | |
| ... | | | |

Listar todos los campos de `CpeRecord` e indicar si `ParsedEmailData` los captura o no.

---

## TAREA 2 — Mapear `ParsedEmailData` vs campos CPE requeridos por AFIP

Leer `CP_REQUIRED` en `src/pages/DetalleCupo.tsx`. Son 5 secciones con sus campos:
- General: `fecha_carga`, `cupo`, `grano`, `localidad`, `renspa`
- Comercial: `destinatario`, `cuit_destinatario`, `destino`, `cuit_destino`
- Flete: `km`, `provincia_origen`, `provincia_destino`
- Transporte: `transporte`, `cuit_transporte`, `chofer`, `cuil_chofer`, `chasis`
- Pesaje: `kg_estimados`

Indicar cuáles de estos campos llegan en `ParsedEmailData` y cuáles no.

---

## TAREA 3 — Mapear `ParsedEmailData` vs `NewRecord.tsx`

Leer `src/pages/NewRecord.tsx` y verificar:
- ¿Todos los campos que trae `ParsedEmailData` tienen su campo equivalente en el formulario individual?
- ¿Hay campos en `NewRecord` que el email nunca va a poder traer (y por lo tanto siempre quedan vacíos al importar)?

---

## TAREA 4 — Reporte de brechas

Producir un reporte con tres secciones:

### A. Campos que el email podría traer pero `ParsedEmailData` no captura
Campos presentes en los mails de Ceibos que hoy se pierden al parsear.

### B. Campos CPE requeridos por AFIP que no llegan por ningún flujo de email
Campos críticos para la CPE que siempre van a requerir carga manual posterior.

### C. Inconsistencias entre flujos
Campos que existen en un flujo pero no en otro, generando registros incompletos o inconsistentes.

---

## Criterios de aceptación

- [ ] Tabla comparativa completa `ParsedEmailData` vs `CpeRecord`
- [ ] Tabla comparativa `ParsedEmailData` vs `CP_REQUIRED` (campos AFIP)
- [ ] Lista de brechas por sección (A, B, C)
- [ ] Sin modificar ningún archivo — solo lectura y reporte
