# Q-05 Auditoría de brand y accesibilidad — Resultados

**Fecha:** 2026-05-08  
**Archivos revisados:** `Header.tsx`, `Button.tsx`, `CupoCard.tsx`, `DetalleCupo.tsx`, `FormField.tsx`, `Home.tsx`, `ConnectionDot.tsx`

---

## Checklist de brand

| # | Criterio | Resultado | Archivo:Línea |
|---|---|---|---|
| 1 | Header usa `bg-primary` (#1E3252) por defecto | ✅ | `Header.tsx:18` — `accentColor = '#1E3252'` como default. Las sobreescrituras (EditRecord con naranja) son intencionales para el modo edición |
| 2 | IDs de cupos usan `font-mono` | ✅ | `CupoCard.tsx:107` — `font-mono font-bold text-primary`; `Header.tsx:44` — `font-mono font-bold text-white` para el título del detalle |
| 3 | Labels de campos usan `font-mono` | ✅ | `FormField.tsx:38` — `font-mono text-xs font-medium`; `DetalleCupo.tsx:132` — `ReadOnlyField` igual |
| 4 | Badges de status usan los colores correctos en la pantalla principal | ✅ | `CupoCard.tsx:23–29` y `DetalleCupo.tsx:39–45` — inline `style={{ backgroundColor: bg }}` con los 5 colores del diseño |
| 4b | Badges en `RecordDetail.tsx` (pantalla legacy) | ❌ | `RecordDetail.tsx:183` — `variant={status === 'CERRADO' \|\| status === 'ENVIADO' ? 'green' : 'orange'}` mapea IMPORTADO y TRANSPORTE a naranja en lugar de azul/amarillo |
| 5 | Botones de acción `md`/`lg` tienen h-12/h-14 (≥44px) | ✅ | `Button.tsx:33–35` — `md: 'h-12'` (48px), `lg: 'h-14'` (56px) |
| 5b | Botón `sm` tiene h-9 (36px) — por debajo del mínimo de 44px | ❌ | `Button.tsx:33` — `sm: 'h-9 px-3'` = 36px. Usado en Header (UserPlus, logout) y Admin |
| 6 | Action strip de CupoCard tiene `minHeight: 48px` | ✅ | `CupoCard.tsx:142` — `style={{ minHeight: '48px' }}` explícito |
| 7 | Sin emojis hardcodeados (solo íconos Lucide) | ✅ | El único carácter especial es `✓` en `DetalleCupo.tsx:823` (status actual en force-status) — es un símbolo Unicode, no emoji, y tiene propósito funcional claro |
| 8 | Placeholders de inputs son descriptivos | ✅ | `FormField.tsx:47,57` — `placeholder ?? label`; `Home.tsx:290` — `"Buscar código, destinatario, transporte…"` |
| 9 | FAB tiene `aria-label` | ✅ | `Home.tsx:445` — `aria-label={fabOpen ? 'Cerrar menú' : 'Nueva acción'}` |
| 9b | Botón "Volver" del Header sin `aria-label` | ❌ | `Header.tsx:37–41` — `<button onClick={() => navigate(-1)}>` con solo ícono `<ChevronLeft>`, sin texto ni aria-label |
| 9c | Botón logout del Header sin `aria-label` | ❌ | `Header.tsx:53–57` — `<button onClick={handleLogout}>` con solo ícono `<LogOut>`, sin aria-label |
| 10 | `ConnectionDot` presente en Home | ✅ | `Home.tsx:201` — `rightElement={<ConnectionDot />}` en el Header |

---

## Problemas de contraste detectados

| Badge/Elemento | Color fondo | Color texto | Ratio est. | WCAG AA | Recomendación |
|---|---|---|---|---|---|
| TRANSPORTE badge | `#F59E0B` (amber-400) | blanco `#FFFFFF` | ~1.9:1 | ❌ FALLA | Cambiar texto a `#1E3252` (primary oscuro) o usar `#D97706` (amber-600) con blanco |
| IMPORTADO badge | `#2C9FC0` (secondary) | blanco `#FFFFFF` | ~3.5:1 | ⚠️ Borderline AA (texto normal) | Aceptable para texto bold/grande; si se reduce el tamaño puede fallar |
| CARGADO badge | `#FF6C02` (accent) | blanco `#FFFFFF` | ~3.2:1 | ⚠️ Borderline AA | Similar a IMPORTADO |
| Header default | `#1E3252` (primary) | blanco `#FFFFFF` | ~10:1 | ✅ AAA | Sin cambio necesario |
| CERRADO badge | `#16A34A` (green-600) | blanco `#FFFFFF` | ~4.6:1 | ✅ AA | Sin cambio necesario |
| ENVIADO badge | `#15803D` (green-700) | blanco `#FFFFFF` | ~5.9:1 | ✅ AA | Sin cambio necesario |

**El fallo más grave es `#F59E0B` (TRANSPORTE) con texto blanco.** El ratio de ~1.9:1 no alcanza ni el mínimo de 3:1 para texto grande, y está muy lejos del 4.5:1 para texto normal.

---

## Issues de accesibilidad

| ID | Prioridad | Descripción | Archivo | Agente |
|---|---|---|---|---|
| A11Y-1 | P2 | Badge TRANSPORTE (#F59E0B + blanco) falla contraste WCAG AA (~1.9:1) — ilegible en luz solar directa (caso de uso campo) | `CupoCard.tsx:26`, `DetalleCupo.tsx:41` | Frontend |
| A11Y-2 | P3 | Botón "Volver" del Header sin `aria-label` — screen readers dicen solo "botón" | `Header.tsx:37` | Frontend |
| A11Y-3 | P3 | Botón "Logout" del Header sin `aria-label` | `Header.tsx:53` | Frontend |
| A11Y-4 | P3 | `Button` variant `sm` tiene altura 36px (h-9), por debajo del mínimo de 44px para touch targets móviles | `Button.tsx:33` | Frontend |
| A11Y-5 | P3 | Badges de status en `RecordDetail.tsx` (página legacy) no usan los colores correctos por estado | `RecordDetail.tsx:183` | Frontend |

---

## Puntos positivos

- **ConnectionDot y GlobalStatusBanner** correctamente implementados — el operador siempre sabe si tiene conexión
- **FAB con `aria-label` dinámico** — excelente práctica para un botón que cambia de función
- **Labels de todos los campos en `font-mono`** — consistencia visual total en los formularios
- **Action strip de CupoCard con `minHeight: 48px`** — el target táctil más importante de la app está bien dimensionado
- **Placeholders descriptivos** a través de toda la app
- **Colores de status inline con variables del diseño** en las pantallas nuevas (`CupoCard` y `DetalleCupo`) — no dependen de clases Tailwind que podrían no compilarse

---

## Veredicto general

- [x] ❌ **Issues que requieren fix (P2):** contraste del badge TRANSPORTE (A11Y-1) es especialmente relevante para uso en campo con luz solar
- [x] ⚠️ **Issues menores (P3):** aria-labels faltantes en Header, Button sm, badge colors en RecordDetail legacy

---

## Fix sugerido para A11Y-1 (no lo aplico — solo lo reporto)

**Opción 1 — Texto oscuro sobre amarillo:**
```ts
// CupoCard.tsx y DetalleCupo.tsx STATUS_CONFIG
TRANSPORTE: { bg: '#F59E0B', label: 'TRANSPORTE', textColor: '#1E3252' },
```
Ratio #1E3252 sobre #F59E0B ≈ 5.5:1 → ✅ AA

**Opción 2 — Fondo más oscuro:**
```ts
TRANSPORTE: { bg: '#D97706', label: 'TRANSPORTE' },  // amber-600
```
Ratio blanco sobre #D97706 ≈ 3.2:1 → ⚠️ borderline (aceptable para texto bold)

**Opción recomendada:** Opción 1 (texto oscuro sobre amarillo). Es más legible y alinea con el patrón de Material Design para colores de advertencia.
