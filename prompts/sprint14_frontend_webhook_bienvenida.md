# PROMPT — Agente Frontend: Sprint 14 · Webhook bienvenida al agregar usuario

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/Admin.tsx` — función `handleAddEmail`
- `src/lib/storage.ts` — `addAuthorizedEmail`

---

## Contexto

Cuando un admin agrega un email habilitado en el panel Admin, hay que disparar un POST al webhook de n8n para que envíe el correo de bienvenida al nuevo usuario.

## Variable de entorno

Ya debe existir en `.env`:
```
VITE_N8N_WEBHOOK_BIENVENIDA_URL=https://tu-instancia-n8n.com/webhook/bienvenida
```

Si no existe, agregarla con ese placeholder.

---

## TAREA — Modificar `handleAddEmail` en `Admin.tsx`

Después de agregar el email exitosamente, disparar el webhook:

```ts
const handleAddEmail = async () => {
  if (!newEmail.trim() || !user?.email) return
  setAddingEmail(true)
  try {
    await addAuthorizedEmail(newEmail, user.email)
    setEmails(await getAuthorizedEmails())

    // Notificar al nuevo usuario via n8n
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_BIENVENIDA_URL as string | undefined
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          added_by: user.email,
        }),
      }).catch(() => {}) // silencioso — no bloquear el flujo si falla
    }

    setNewEmail('')
    show('Email agregado — se envió notificación al usuario', 'success')
  } catch (e) {
    show((e as Error).message, 'error')
  } finally {
    setAddingEmail(false)
  }
}
```

---

## Criterios de aceptación

- [ ] Al agregar un email, se dispara el POST al webhook con `{ email, added_by }`
- [ ] Si el webhook falla, no interrumpe el flujo — el email se agrega igual
- [ ] El toast confirma que se envió la notificación
- [ ] Si `VITE_N8N_WEBHOOK_BIENVENIDA_URL` no está definida, no rompe (solo no envía)
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo
