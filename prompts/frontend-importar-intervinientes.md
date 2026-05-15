# Agente: Front end | Rama: `dev`

## Contexto

La mejora de toggles de roles opcionales en Intervinientes se aplicó en `NewRecord.tsx` y `EditRecord.tsx`, pero falta aplicarla en `src/pages/ImportarCupos.tsx`. Esta página tiene los 8 roles opcionales como `FormField` planos (sin toggles, sin CuitField) a partir de la línea 473.

## Qué implementar

Aplicar exactamente el mismo patrón que existe en `NewRecord.tsx` y `EditRecord.tsx`:

**1. Agregar la constante ROLES_OPCIONALES** (igual que en las otras páginas, fuera del componente):
```ts
const ROLES_OPCIONALES = [
  { id: 'rte_primaria',        label: 'Rte. Venta Primaria'   },
  { id: 'rte_secundaria',      label: 'Rte. Venta Secundaria' },
  { id: 'rte_secundaria2',     label: 'Rte. Venta Sec. 2'     },
  { id: 'mercado',             label: 'Mercado a Término'      },
  { id: 'corredor_primario',   label: 'Corredor Primario'      },
  { id: 'corredor_secundario', label: 'Corredor Secundario'    },
  { id: 'repr_entregador',     label: 'Rep. Entregador'        },
  { id: 'repr_recibidor',      label: 'Rep. Recibidor'         },
] as const
```

**2. Agregar estado** dentro del componente:
```ts
const [rolesActivos, setRolesActivos] = useState(new Set<string>())
```

**3. Agregar funciones** `clearRolFields` y `toggleRol` — idénticas a las de `EditRecord.tsx`.

**4. Reemplazar los campos de Intervinientes** en el render (~líneas 473–522) con los toggles + campos condicionales. Usar `CuitField` en lugar de `FormField` para los CUIT, con `onRazonSocialFound` apuntando al campo nombre correspondiente. Orden: CUIT primero, nombre después.

El resultado debe verse y comportarse igual que en `NewRecord.tsx`.

## Importaciones necesarias

Verificar que `CuitField` esté importado en el archivo. Si no está, agregarlo:
```ts
import CuitField from '../components/forms/CuitField'
```

## Criterios de verificación

- [ ] En `/importar`, la sección Intervinientes muestra solo los toggles por defecto
- [ ] Al activar un toggle aparecen los campos CUIT + nombre con autocomplete
- [ ] Al desactivar se limpian los valores
- [ ] El diseño es consistente con `NewRecord.tsx`
- [ ] No hay regresiones en el flujo de importación ni en el guardado

## Archivo a modificar

- `src/pages/ImportarCupos.tsx` — líneas ~473–522 (sección Intervinientes del render)
