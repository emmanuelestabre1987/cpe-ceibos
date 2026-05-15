# Agente: Front end | Rama: `dev`

## Contexto

En la implementación anterior se agregaron toggles de roles opcionales en la sección Intervinientes de `NewRecord.tsx` y `EditRecord.tsx`. El problema es que en `EditRecord.tsx`, cuando se carga un registro existente que ya tiene roles completados, los toggles arrancan todos desactivados y los campos no se muestran aunque tengan datos.

Lo mismo aplica cuando se importan cupos — los registros importados también pasan por `EditRecord.tsx` y deben mostrar correctamente los roles que ya tienen datos.

## Qué implementar

En `EditRecord.tsx`, al cargar el registro (en el `useEffect` que llama a `getRecord`), detectar qué roles opcionales ya tienen valores y activar automáticamente los toggles correspondientes.

La lógica es: si el campo CUIT o nombre de un rol tiene valor, el toggle de ese rol debe aparecer activo.

El mapeo es el siguiente:

```
'rte_primaria'        → cuit_rte_venta_primaria    | rte_venta_primaria
'rte_secundaria'      → cuit_rte_venta_secundaria   | rte_venta_secundaria
'rte_secundaria2'     → cuit_rte_venta_secundaria2  | rte_venta_secundaria2
'mercado'             → mercado_termino
'corredor_primario'   → cuit_corredor_primario       | corredor_primario
'corredor_secundario' → cuit_corredor_secundario     | corredor_secundario
'repr_entregador'     → cuit_repr_entregador         | repr_entregador
'repr_recibidor'      → cuit_repr_recibidor          | repr_recibidor
```

Después del `setForm(rest)`, agregar un `setRolesActivos` que inicialice el Set con los IDs de los roles que tienen al menos un campo con valor.

## Criterios de verificación

- [ ] Al editar un registro que ya tiene Corredor Primario cargado, el toggle "Corredor Primario" aparece activo y los campos se muestran con sus valores
- [ ] Al editar un registro sin roles opcionales, todos los toggles aparecen desactivados
- [ ] Al desactivar un toggle en edición, los campos se ocultan y los valores se limpian
- [ ] El comportamiento es idéntico para registros creados manualmente y para cupos importados

## Archivo a modificar

- `src/pages/EditRecord.tsx` — dentro del `useEffect` que resuelve `getRecord`, después del `setForm`
