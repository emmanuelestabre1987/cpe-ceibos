# PROMPT — Agente UI/UX: Sprint 8 · Logo Avancargo + Refresh de brand

Sos un experto en UI/UX mobile-first. Tu tarea es integrar el logo de Avancargo y hacer un refresh visual de la app CPE Campo para que sea más consistente con la identidad de marca. Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé estos archivos antes de empezar:
- `src/components/layout/Header.tsx`
- `src/pages/Home.tsx`
- `src/pages/Login.tsx`
- `src/pages/DetalleCupo.tsx`
- `tailwind.config.js`

---

## Contexto de brand

**Colores:**
- `#1E3252` — primary (navy, fondos de header)
- `#2C9FC0` — secondary (celeste, acciones, links)
- `#FF6C02` — accent (naranja, alertas, highlights)

**Logos disponibles en `src/assets/`:**
- `logo-white.png` — versión clara/blanca del logo (bracket naranja sobre fondo oscuro) → usar sobre fondos `#1E3252`
- `logo-color.png` — escudo completo con "A" en azul y naranja → usar sobre fondos blancos o claros

**Tipografía:**
- `font-mono` = Martian Mono (códigos, labels, títulos de header)
- `font-sans` = Roboto (textos descriptivos, body)

---

## TAREA 1 — Logo en el header del Panel de Cupos (Home)

En `Header.tsx`, cuando `showLogout === true` (es decir, es el header principal de Home), reemplazar el texto del título por el logo blanco:

```tsx
// En vez de:
<h1 className="font-mono font-bold text-white text-base truncate">{title}</h1>

// Mostrar logo cuando showLogout es true:
{showLogout
  ? <img src="/src/assets/logo-white.png" alt="Avancargo" className="h-7 w-auto object-contain" />
  : <h1 className="font-mono font-bold text-white text-base truncate">{title}</h1>
}
```

El logo debe tener altura fija `h-7` (28px) y ancho automático. No debe distorsionarse.

---

## TAREA 2 — Logo en la pantalla de Login

En `Login.tsx`, arriba del formulario de login, mostrar el logo escudo completo:

```tsx
<div className="flex flex-col items-center mb-8">
  <img
    src="/src/assets/logo-color.png"
    alt="Avancargo"
    className="h-20 w-auto object-contain mb-4"
  />
  <p className="font-sans text-text-muted text-sm text-center">
    CPE Campo — Gestión de cupos
  </p>
</div>
```

Reemplazar cualquier texto de título o logo placeholder que exista actualmente.

---

## TAREA 3 — Refresh de brand: más protagonismo del naranja y el azul

La app usa bien el azul `#1E3252` en headers pero el naranja `#FF6C02` aparece poco. El celeste `#2C9FC0` se usa para acciones pero podría ser más llamativo. Aplicar estos ajustes:

### 3a. Header: acento naranja inferior

En `Header.tsx`, agregar una línea naranja de 3px en el borde inferior del header como separador de marca:

```tsx
<header
  className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 pt-safe border-b-[3px]"
  style={{ backgroundColor: accentColor, borderBottomColor: '#FF6C02' }}
>
```

### 3b. Home: strip de filtros con degradado

El área de filtros debajo del header (el `div` con `bg-primary`) actualmente es un bloque plano. Reemplazar el fondo por un degradado sutil:

```tsx
// Cambiar bg-primary por:
style={{ background: 'linear-gradient(180deg, #1E3252 0%, #162840 100%)' }}
```

### 3c. FAB: naranja en vez de secondary

El botón flotante de acción (FAB, el `+` circular) actualmente usa color secondary (`#2C9FC0`). Cambiarlo a accent naranja para que tenga más presencia visual:

```tsx
// Buscar el FAB principal en Home.tsx y cambiar su backgroundColor a:
style={{ backgroundColor: '#FF6C02' }}
```

### 3d. Action strip de CupoCard: highlight naranja en hover

En `CupoCard.tsx`, el action strip inferior (el botón de "Asignar transporte", "Ver detalle", etc.) usa `hover:bg-blue-50`. Agregar una línea naranja izquierda cuando está en hover para dar feedback visual de marca:

```tsx
// En el botón del action strip, agregar:
className="... border-l-2 border-l-transparent hover:border-l-accent ..."
// donde accent = #FF6C02
// Si tailwind no tiene border-l-accent, usar style inline en hover con onMouseEnter/Leave
// O simplemente agregar: className="... relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-0.5 after:bg-accent"
```

Alternativa más simple: cambiar el fondo hover del action strip de `hover:bg-blue-50` a `hover:bg-orange-50`.

### 3e. Conteo de cupos: badge naranja

En `Home.tsx`, el texto "39 cupos" que aparece sobre la lista. Envolverlo en un badge con acento naranja:

```tsx
// En vez de texto plano, mostrar:
<div className="flex items-center gap-2">
  <span
    className="font-mono text-xs font-bold px-2 py-0.5 rounded-full text-white"
    style={{ backgroundColor: '#FF6C02' }}
  >
    {filtered.length}
  </span>
  <span className="font-sans text-xs text-text-muted">
    {filtered.length === 1 ? 'cupo' : 'cupos'}
  </span>
</div>
```

---

## TAREA 4 — Pantalla de Login: rediseño con brand

La pantalla de login debe transmitir la identidad de Avancargo. Rediseñarla:

```
┌─────────────────────────────┐
│                             │
│   [fondo navy #1E3252]      │
│                             │
│   [logo-color.png grande]   │
│                             │
│   CPE Campo                 │
│   Gestión de cupos          │
│                             │
├─────────────────────────────┤
│   [fondo blanco, rounded]   │
│                             │
│   Email                     │
│   [________________]        │
│                             │
│   Contraseña                │
│   [________________]        │
│                             │
│   [Ingresar] naranja        │
│                             │
└─────────────────────────────┘
```

- Mitad superior: fondo `#1E3252`, logo centrado, texto en blanco
- Mitad inferior: fondo blanco con `rounded-t-3xl`, formulario
- Botón de login: `backgroundColor: '#FF6C02'`, texto blanco, `h-12`, `rounded-xl`
- El formulario actual debe mantenerse funcional — solo cambiar el layout y estilos

---

## REGLAS

- Importar imágenes con ruta `/src/assets/logo-white.png` y `/src/assets/logo-color.png`
- No crear componentes nuevos — modificar los existentes
- Mantener toda la lógica funcional intacta
- Touch targets mínimo 44px
- `npm run build` debe pasar sin errores TypeScript
- No modificar archivos que no sean: `Header.tsx`, `Home.tsx`, `Login.tsx`, `CupoCard.tsx`

---

## Criterios de aceptación

- [ ] Logo blanco visible en header del Panel de Cupos (Home)
- [ ] Logo color visible en pantalla de Login
- [ ] Línea naranja en borde inferior del header en todas las pantallas
- [ ] FAB naranja en Home
- [ ] Badge naranja con conteo de cupos
- [ ] Login con layout split: mitad navy / mitad blanco, botón naranja
- [ ] `npm run build` sin errores
