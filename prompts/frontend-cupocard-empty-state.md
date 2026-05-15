# Agente: Front end | Rama: `dev`

## Contexto

En `src/components/ui/CupoCard.tsx` la card muestra tres líneas de información:
- `displayCode`: número de cupo o cpe_id
- `line2`: grano · destinatario · kg
- `line3`: localidad · fecha_carga

Cuando un registro tiene pocos datos (por ejemplo una carga recién iniciada), `line2` queda vacía y la card se ve incompleta visualmente.

## Qué implementar

Dos cambios pequeños:

**1. Fallback en displayCode**
Si `cupo` y `cpe_id` son ambos nulos/vacíos, mostrar el texto `"Sin número asignado"` en gris claro en lugar de no mostrar nada.

**2. Fallback en line2**
Si `line2` está vacío, mostrar una línea de placeholder: `"Sin datos de carga"` en `text-text-muted` con fuente italic, para que la card no quede visualmente flotando.

Mantener el comportamiento actual cuando los datos sí existen.

## Archivo a modificar

- `src/components/ui/CupoCard.tsx` — líneas 63–73 (displayCode y line2)

## Criterios de verificación

- [ ] Una card con datos completos se ve igual que antes
- [ ] Una card sin cupo ni cpe_id muestra "Sin número asignado" en gris
- [ ] Una card sin grano/destinatario/kg muestra "Sin datos de carga" en gris italic
