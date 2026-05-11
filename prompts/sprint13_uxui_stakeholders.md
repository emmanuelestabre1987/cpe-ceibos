# PROMPT — Agente UX/UI: Sprint 13 · Contexto de stakeholder por tab en DetalleCupo

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/DetalleCupo.tsx` — tabs: datos, transporte, pesaje, cierre, historial

---

## Contexto

Múltiples stakeholders cargan datos del mismo cupo. Cada tab corresponde a un rol distinto:

| Tab | Stakeholder responsable |
|-----|------------------------|
| Datos | Comercial / Log Central (Casa Central) |
| Transporte | Admin Zonal |
| Pesaje | Agro / Producción |
| Cierre | Admin Zonal / Ingeniero |

Para reducir errores y orientar al usuario, agregar una línea de contexto debajo del título de cada sección que indique quién debería completar esa tab.

---

## TAREA — Agregar chip de "responsable" en cada tab

Debajo del primer `<SectionTitle>` de cada tab, agregar un chip discreto con el responsable:

```tsx
// Componente reutilizable — definir dentro del archivo
function ResponsableChip({ label }: { label: string }) {
  return (
    <p className="font-sans text-xs text-text-muted -mt-2 mb-1">
      Carga: <span className="font-medium text-secondary">{label}</span>
    </p>
  )
}
```

Usar así en cada tab:

**Tab Datos:**
```tsx
<SectionTitle>Datos del cupo</SectionTitle>
<ResponsableChip label="Comercial / Log Central" />
```

**Tab Transporte:**
```tsx
<SectionTitle>Transporte</SectionTitle>
<ResponsableChip label="Admin Zonal" />
```

**Tab Pesaje:**
```tsx
<SectionTitle>Cargados</SectionTitle>
<ResponsableChip label="Agro / Producción" />
```

**Tab Cierre:**
```tsx
<SectionTitle>Cierre de cupo</SectionTitle>
<ResponsableChip label="Admin Zonal / Ingeniero" />
```

---

## Criterios de aceptación

- [ ] Chip visible debajo del título en cada tab editable
- [ ] Texto discreto, no intrusivo — font-sans text-xs text-text-muted
- [ ] El nombre del responsable en color secondary (#2C9FC0)
- [ ] No modifica ninguna lógica existente
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
