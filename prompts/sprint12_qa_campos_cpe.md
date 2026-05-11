# PROMPT — Agente QA: Sprint 12 · Validación campos CPE + Generar CP

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

**Prerequisito**: agentes Backend y Frontend del Sprint 12 ya corrieron.

---

## TAREA 1 — Build

```
npm run build
```

Debe completar sin errores TypeScript ni warnings críticos.

---

## TAREA 2 — Verificar campos en formulario individual

Leer `src/pages/NewRecord.tsx` y confirmar:

- Paso 1 (General): `campania` y `renspa` presentes después de Variedad
- Paso 2 (Comercial): `cuit_rte_venta_primaria` después de Rte. Venta Primaria, ídem para secundaria, corredores y representantes
- Paso 3 (Flete): `nro_turno`, `provincia_origen`, `provincia_destino` después de Tarifa
- Paso 5 (Pesaje): `humedad` y `proteina` al final
- Ningún campo nuevo tiene `required`
- El objeto `empty` incluye todos los campos nuevos
- El handler `set()` convierte `humedad` y `proteina` a número

---

## TAREA 3 — Verificar campos en carga masiva

Leer `src/pages/ImportarCupos.tsx` y confirmar:

- `CamposComunes` incluye todos los campos nuevos (sin `humedad`/`proteina`)
- `CAMPOS_VACIOS` inicializa todos los nuevos en `''`
- El mapeo de `records` incluye todos los campos nuevos con `|| null`
- Los campos aparecen en la sección correcta del formulario

---

## TAREA 4 — Verificar botón Generar CP

Leer `src/pages/DetalleCupo.tsx` y confirmar:

- Botón "Generar CP" existe en la tab Cierre (tanto editable como solo lectura)
- Estado `cpModalOpen`, `cpMissing`, `generando` declarados
- `CP_REQUIRED` define los 5 secciones con sus campos y labels
- `validateForCP` filtra correctamente los campos vacíos
- El handler llama a `import.meta.env.VITE_N8N_WEBHOOK_CP_URL` con POST + JSON
- El modal lista los campos faltantes por sección con bullets naranjas
- `.env` tiene la variable `VITE_N8N_WEBHOOK_CP_URL` (puede quedar con URL placeholder)

---

## Criterios de aceptación

- [ ] `npm run build` sin errores
- [ ] Todos los campos nuevos presentes en el paso/sección correcto de cada formulario
- [ ] Botón "Generar CP" implementado con validación y webhook
- [ ] Modal de datos faltantes implementado correctamente
- [ ] Reportar cualquier campo faltante o inconsistencia encontrada
