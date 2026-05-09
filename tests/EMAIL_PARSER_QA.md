# QA Report — emailParser.ts

**Fecha:** 2026-05-07  
**Archivo testeado:** `src/lib/emailParser.ts`  
**Suite:** `tests/emailParser.test.ts`  
**Runner:** Vitest 4.1.5

---

## Resultado global

```
Test Files  1 passed (1)
     Tests  23 passed (23)
  Duration  1.24s
```

**Todos los casos del brief pasan. No se requieren correcciones en el parser.**

---

## Resultados por caso

| # | Caso | Tests | Resultado | Notas |
|---|------|-------|-----------|-------|
| 1 | Email completo del brief | 7 | ✅ PASS | Todos los campos, 3 cupos, fechas convertidas, CUITs normalizados, errores vacíos |
| 2 | Solo 1 cupo | 2 | ✅ PASS | Array de 1 elemento, código `XYZ99` correcto |
| 3 | Sin campo CARREGA | 3 | ✅ PASS | `ok: true`, `kgEstimados: 0`, `errores` contiene `'kgEstimados'` |
| 4 | CUIT con guiones `33-50673744-9` | 1 | ✅ PASS | Normaliza a `"33506737449"` |
| 5 | CUIT sin guiones `33506737449` | 1 | ✅ PASS | Devuelve idéntico |
| 6 | Texto inválido `"hola mundo"` | 2 | ✅ PASS | `ok: false`; también validado con string vacío |
| 7 | Sin tabla de cupos | 2 | ✅ PASS | `ok: false`, `errores` contiene `'cupos'` |
| 8 | Case-insensitive (prefijos en minúscula) | 4 | ✅ PASS | Extrae `grano`, `localidad` y `rteVentaPrimaria` correctamente |
| — | Extras (espacios en CUIT, no-errors en email completo) | 2 | ✅ PASS | Cobertura adicional |

---

## Detalle de comportamientos verificados

### Extracción de campos (Caso 1)

```
Producto: Soja            → grano: "Soja"
Zona Destino: Rosario     → localidad: "Rosario"
Vendedor: Agromax SA      → rteVentaPrimaria: "Agromax SA"
Destinatario: ... CUIT 30-71234567-8 → destinatario: "Aceitera General SA"
                                        cuitDestinatario: "30712345678"
Destino: ... CUIT 30-71234568-9      → destino: "Puerto Rosario SA"
                                        cuitDestino: "30712345689"
CARREGA 24000             → kgEstimados: 24000
Nro. de Planta 5          → nroPlanta: "5"
```

### Conversión de fechas

`DD.MM.YYYY` → `YYYY-MM-DD`:
- `15.06.2025` → `2025-06-15` ✅
- `16.06.2025` → `2025-06-16` ✅
- `17.06.2025` → `2025-06-17` ✅

### Lógica de errores parciales (Caso 3)

Cuando falta CARREGA:
- El parser **no falla** (`ok: true`) — correcto, los cupos siguen siendo válidos
- Informa el campo faltante en `errores[]` — correcto para que la UI lo señale al operador
- `kgEstimados` queda en `0` — valor seguro, sin crash

### Normalización de CUIT

| Input | Output |
|-------|--------|
| `"33-50673744-9"` | `"33506737449"` |
| `"33506737449"` | `"33506737449"` |
| `"33 506 737 449"` | `"33506737449"` |

El método `normalizarCuit` elimina cualquier no-dígito con `/\D/g`, lo que cubre guiones, espacios y puntos.

### Caso límite: `Destino:` vs `Zona Destino:`

El parser resuelve correctamente la ambigüedad: busca con `/^\s*Destino:/i` (ancla al inicio de la línea) para no matchear accidentalmente `Zona Destino:`. **Comportamiento correcto.**

---

## Correcciones requeridas en el parser

**Ninguna.** El parser maneja todos los casos del brief sin modificaciones.

---

## Cobertura adicional incluida

Los tests cubren también:
- String vacío (`""`) → `ok: false`
- CUIT con espacios (`"33 506 737 449"`) → normaliza igual que con guiones
- Verificación explícita de `errores.length === 0` cuando el email está completo (evita falsos positivos)
- Headers en minúscula (`nuevo cupo | fecha`) → la tabla se sigue parseando correctamente

---

## Archivos generados

| Archivo | Descripción |
|---------|-------------|
| `tests/emailParser.test.ts` | Suite completa (23 tests) |
| `tests/EMAIL_PARSER_QA.md` | Este reporte |
| `vitest.config.ts` | Configuración del runner |
| `package.json` | Scripts `test` y `test:watch` agregados |

```bash
npm test          # corre una vez (CI)
npm run test:watch  # modo watch para desarrollo
```
