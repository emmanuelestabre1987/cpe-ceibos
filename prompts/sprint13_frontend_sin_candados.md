# PROMPT — Agente Frontend: Sprint 13 · Eliminar candados entre tabs en DetalleCupo

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/DetalleCupo.tsx` — página de detalle del cupo, tabs y lógica de candados

---

## Contexto

El flujo operativo del cliente tiene múltiples stakeholders trabajando sobre el mismo cupo en simultáneo:
- **Comercial / Log Central** carga los datos comerciales
- **Admin Zonal** carga transporte y datos logísticos
- **Agro / Producción** carga pesaje y cierre

Los candados actuales (que bloquean pestañas según el status del cupo) rompen este flujo colaborativo. Se eliminan completamente: todas las tabs deben ser accesibles en cualquier momento, independientemente del status.

---

## TAREA — Eliminar candados en `DetalleCupo.tsx`

### 1. Vaciar `LOCKED_TABS`

Reemplazar el objeto `LOCKED_TABS` para que no bloquee ninguna tab en ningún status:

```ts
const LOCKED_TABS: Record<CupoStatus, Set<TabId>> = {
  IMPORTADO:  new Set(),
  TRANSPORTE: new Set(),
  CARGADO:    new Set(),
  CERRADO:    new Set(),
  ENVIADO:    new Set(),
  CANCELADO:  new Set(),
}
```

### 2. Quitar el toast de "Completá la etapa anterior primero"

En `handleTabSelect`, el guard que mostraba el toast ya no aplica. Simplificar a:

```ts
const handleTabSelect = (tab: TabId) => {
  setActiveTab(tab)
}
```

### 3. Quitar el ícono de candado en `TabBar`

En el componente `TabBar`, quitar la importación de `Lock` y el render del ícono:

```tsx
// Antes:
{label}
{locked && <Lock className="w-3 h-3 opacity-60" />}

// Después:
{label}
```

Quitar también la prop `lockedTabs` de `TabBarProps` y de la llamada al componente si ya no se usa.

### 4. Verificar imports

Si `Lock` de `lucide-react` quedó sin uso, quitarlo del import.

---

## Criterios de aceptación

- [ ] Todas las tabs accesibles desde cualquier status del cupo
- [ ] No aparece ningún candado en la tab bar
- [ ] No aparece el toast "Completá la etapa anterior primero"
- [ ] El flujo de guardado por tab sigue funcionando igual (cada tab guarda sus propios campos)
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
