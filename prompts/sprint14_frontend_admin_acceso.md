# PROMPT — Agente Frontend: Sprint 14 · Acceso al panel Admin desde el Header

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/components/layout/Header.tsx` — header actual
- `src/pages/Home.tsx` — cómo se usa el Header en la home
- `src/lib/auth.ts` — función `isAdmin(email)`
- `src/hooks/useAuth.ts` — hook `useAuth()`

---

## Contexto

El panel Admin existe en `/admin` pero no hay ningún acceso desde la UI.
El usuario logueado como admin no tiene forma de llegar ahí sin tipear la URL a mano.

---

## TAREA — Agregar ícono de engranaje en el Header para admins

### En `Home.tsx`

1. Detectar si el usuario es admin al cargar la home:

```ts
const [userIsAdmin, setUserIsAdmin] = useState(false)

useEffect(() => {
  if (user?.email) {
    isAdmin(user.email).then(setUserIsAdmin).catch(() => {})
  }
}, [user])
```

2. Pasar el ícono al `rightElement` del Header solo si es admin:

```tsx
<Header
  title={...}
  rightElement={
    userIsAdmin ? (
      <button
        onClick={() => navigate('/admin')}
        className="p-1.5 rounded-lg text-white hover:bg-white/20 transition"
        title="Panel Admin"
      >
        <Settings className="w-5 h-5" />
      </button>
    ) : undefined
  }
/>
```

3. Agregar import de `Settings` desde `lucide-react` e `isAdmin` desde `../lib/auth`.

---

## Criterios de aceptación

- [ ] El ícono de engranaje aparece en el header solo si el usuario tiene `is_admin = true`
- [ ] Al presionar navega a `/admin`
- [ ] Usuarios no-admin no ven el ícono
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
