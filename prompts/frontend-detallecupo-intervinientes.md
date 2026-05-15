# Agente: Front end | Rama: `dev`

## Contexto

La mejora de toggles de roles opcionales en Intervinientes se aplicó en `NewRecord.tsx`, `EditRecord.tsx` e `ImportarCupos.tsx`, pero falta aplicarla en `src/pages/DetalleCupo.tsx`. Esta es la página que se abre al tocar un cupo (`/cupo/:id`) y tiene su propia sección de Intervinientes con los 8 roles opcionales mostrados siempre, sin toggles.

Los campos están en las líneas 1064–1078 y usan `setI` como setter (en lugar de `set`).

## Qué implementar

Aplicar exactamente el mismo patrón de toggles que existe en `NewRecord.tsx`:

**1. Agregar la constante ROLES_OPCIONALES** fuera del componente (igual que en las otras páginas).

**2. Agregar estado** dentro del componente:
```ts
const [rolesActivos, setRolesActivos] = useState(new Set<string>())
```

**3. Inicializar los toggles** cuando se carga el registro. En `DetalleCupo.tsx` el registro se carga en un `useEffect` que llama `setIntervinientesF`. Justo después de esa llamada, inicializar `rolesActivos` con los roles que ya tienen datos (igual que en `EditRecord.tsx` líneas 55–64), usando el objeto `record` disponible en ese contexto.

**4. Agregar función `clearRolFieldsI`** (usa `setI` en lugar de `set`):
```ts
const clearRolFieldsI = (id: string) => {
  switch (id) {
    case 'rte_primaria':        setI('cuit_rte_venta_primaria')('');   setI('rte_venta_primaria')('');   break
    case 'rte_secundaria':      setI('cuit_rte_venta_secundaria')('');  setI('rte_venta_secundaria')(''); break
    case 'rte_secundaria2':     setI('cuit_rte_venta_secundaria2')(''); setI('rte_venta_secundaria2')(''); break
    case 'mercado':             setI('mercado_termino')('');            break
    case 'corredor_primario':   setI('cuit_corredor_primario')('');     setI('corredor_primario')('');    break
    case 'corredor_secundario': setI('cuit_corredor_secundario')('');   setI('corredor_secundario')('');  break
    case 'repr_entregador':     setI('cuit_repr_entregador')('');       setI('repr_entregador')('');      break
    case 'repr_recibidor':      setI('cuit_repr_recibidor')('');        setI('repr_recibidor')('');       break
  }
}
```

**5. Agregar función `toggleRol`**:
```ts
const toggleRol = (id: string) => {
  const wasActive = rolesActivos.has(id)
  setRolesActivos(prev => {
    const next = new Set(prev)
    if (wasActive) next.delete(id)
    else next.add(id)
    return next
  })
  if (wasActive) clearRolFieldsI(id)
}
```

**6. Reemplazar las líneas 1064–1078** con el bloque de toggles + campos condicionales. Mantener `CuitField` y `VoiceInput` tal como están, solo envolverlos en la lógica condicional `rolesActivos.has(...)`.

El bloque de toggles debe verse igual que en `NewRecord.tsx` (pills con `border-secondary bg-secondary text-white` cuando activo).

## Criterios de verificación

- [ ] Al abrir un cupo, los toggles de roles que ya tienen datos aparecen activos con sus campos visibles
- [ ] Los roles sin datos aparecen como toggles inactivos sin campos
- [ ] Al activar un toggle aparecen los campos correspondientes
- [ ] Al desactivar se limpian los valores
- [ ] El guardado de Intervinientes sigue funcionando correctamente

## Archivo a modificar

- `src/pages/DetalleCupo.tsx` — agregar estado/funciones cerca de línea 429, reemplazar render líneas 1064–1078
