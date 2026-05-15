# Agente: Front end | Rama: `dev`

Trabajás en la rama `dev` del proyecto CPE Campo (React + TypeScript + Tailwind). La tarea es mejorar la UX de la sección Intervinientes en el formulario de nueva carga.

## Contexto

En `src/pages/NewRecord.tsx` la sección "Intervinientes (Sección A)" muestra siempre estos 8 roles opcionales (cada uno con un campo CUIT + campo nombre):

- Rte. Comercial Venta Primaria
- Rte. Comercial Venta Secundaria
- Rte. Comercial Venta Secundaria 2
- Mercado a Término
- Corredor Venta Primaria
- Corredor Venta Secundaria
- Representante Entregador
- Representante Recibidor

Esto genera un formulario visualmente abrumador en mobile. El usuario quiere poder seleccionar previamente cuáles roles intervienen en esa operación y que el formulario muestre solo esos.

## Qué implementar

Antes de los campos de Intervinientes, agregar un bloque de toggles (checkboxes tipo pill/chip, estilo mobile-friendly) con la lista de los 8 roles. Por defecto todos desactivados.

Al activar un rol aparecen sus dos campos (CUIT + nombre) debajo, en el mismo orden en que están hoy. Al desactivarlo los campos se ocultan y sus valores se limpian en el estado del formulario.

Los campos que ya existen siempre (Titular, Remitente Comercial Productor, Destinatario, etc.) no se tocan — solo aplica a los 8 roles opcionales listados arriba.

## Criterios de verificación

- Por defecto la sección Intervinientes muestra solo los toggles, sin campos visibles
- Al activar un toggle aparecen los dos campos correspondientes (CUIT y nombre)
- Al desactivar un toggle los campos desaparecen y el valor en el estado queda en `''` / `null`
- El diseño de los toggles es consistente con el resto de la app (usa `accentColor: '#2C9FC0'` y `font-mono text-xs uppercase` como el resto de los labels)
- El comportamiento es idéntico en `src/pages/EditRecord.tsx` — aplicar el mismo patrón allí también

## Archivos a modificar

- `src/pages/NewRecord.tsx` — líneas ~320–340 (sección Intervinientes)
- `src/pages/EditRecord.tsx` — líneas ~133–160 (misma sección)
