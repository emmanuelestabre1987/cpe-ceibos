# PROMPT — Agente Automatizaciones: Sprint 14 · Workflow n8n Bienvenida de Usuario

## Contexto

Cuando un admin habilita un nuevo email en CPE Campo, la app dispara un POST a un webhook de n8n.
El workflow tiene que enviar un email de bienvenida al nuevo usuario con instrucciones para ingresar.

---

## Estructura del workflow

```
Webhook Trigger → Gmail
```

---

## Nodo 1 — Webhook Trigger

La app envía un POST con este body:

```json
{
  "email": "nuevo@usuario.com",
  "added_by": "admin@avancargo.com"
}
```

Guardar la URL del webhook — se va a cargar en el `.env` de la app como `VITE_N8N_WEBHOOK_BIENVENIDA_URL`.

---

## Nodo 2 — Gmail

| Campo | Valor |
|-------|-------|
| **To** | `{{ $json.body.email }}` |
| **Subject** | `Tu acceso a CPE Campo está listo — Avancargo` |
| **Message Type** | HTML |
| **Message** | Ver HTML abajo (archivo: `prompts/email_bienvenida_n8n.html`) |

### HTML del correo de bienvenida

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a CPE Campo — Avancargo</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- HEADER -->
          <tr>
            <td style="background:#1E3252;padding:32px 40px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img
                      src="https://cpecampo.avancargo.com/logo-white.png"
                      alt="Avancargo"
                      width="120"
                      style="display:block;max-width:120px;"
                    />
                  </td>
                </tr>
              </table>
              <h1 style="margin:18px 0 4px;font-family:monospace;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                CPE Campo
              </h1>
              <p style="margin:0 0 28px;font-family:'Helvetica Neue',sans-serif;font-size:12px;color:#94a3b8;letter-spacing:0.5px;">
                Gestión de Cartas de Porte Electrónicas
              </p>
            </td>
          </tr>

          <!-- Barra naranja -->
          <tr>
            <td style="background:#FF6C02;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px 28px;">

              <p style="margin:0 0 6px;font-family:'Helvetica Neue',sans-serif;font-size:16px;color:#1E3252;font-weight:700;">
                ¡Bienvenido/a a CPE Campo!
              </p>
              <p style="margin:0 0 28px;font-family:'Helvetica Neue',sans-serif;font-size:14px;color:#6b7280;line-height:1.7;">
                El equipo de Avancargo habilitó tu acceso a la plataforma de gestión de Cartas de Porte Electrónicas.
                Ya podés ingresar y empezar a operar.
              </p>

              <!-- Card pasos -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">

                    <p style="margin:0 0 18px;font-family:monospace;font-size:10px;font-weight:700;color:#2C9FC0;letter-spacing:3px;text-transform:uppercase;">
                      Cómo ingresar
                    </p>

                    <!-- Paso 1 -->
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
                      <tr>
                        <td width="32" valign="top">
                          <span style="display:inline-block;width:24px;height:24px;background:#1E3252;border-radius:50%;font-family:monospace;font-size:11px;font-weight:700;color:#ffffff;text-align:center;line-height:24px;">1</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-family:'Helvetica Neue',sans-serif;font-size:13px;color:#374151;line-height:1.5;">
                            Ingresá a
                            <a href="https://cpecampo.avancargo.com" style="color:#2C9FC0;text-decoration:none;font-weight:600;">cpecampo.avancargo.com</a>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Paso 2 -->
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
                      <tr>
                        <td width="32" valign="top">
                          <span style="display:inline-block;width:24px;height:24px;background:#1E3252;border-radius:50%;font-family:monospace;font-size:11px;font-weight:700;color:#ffffff;text-align:center;line-height:24px;">2</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-family:'Helvetica Neue',sans-serif;font-size:13px;color:#374151;line-height:1.5;">
                            Escribí tu email:
                            <span style="display:inline-block;background:#1E3252;color:#ffffff;font-family:monospace;font-size:12px;padding:2px 8px;border-radius:4px;margin-left:2px;">{{ $json.body.email }}</span>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Paso 3 -->
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="32" valign="top">
                          <span style="display:inline-block;width:24px;height:24px;background:#FF6C02;border-radius:50%;font-family:monospace;font-size:11px;font-weight:700;color:#ffffff;text-align:center;line-height:24px;">3</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-family:'Helvetica Neue',sans-serif;font-size:13px;color:#374151;line-height:1.5;">
                            Revisá tu correo — te llegará un <strong style="color:#1E3252;">enlace mágico</strong> para ingresar sin contraseña
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a
                      href="https://cpecampo.avancargo.com"
                      style="display:inline-block;background:#2C9FC0;color:#ffffff;font-family:monospace;font-size:13px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:1px;text-transform:uppercase;"
                    >
                      Ir a CPE Campo →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-family:'Helvetica Neue',sans-serif;font-size:13px;color:#9ca3af;line-height:1.6;text-align:center;">
                Ante cualquier duda, escribile a
                <a href="mailto:{{ $json.body.added_by }}" style="color:#2C9FC0;text-decoration:none;font-weight:600;">{{ $json.body.added_by }}</a>
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-family:monospace;font-size:10px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">
                Avancargo · CPE Campo
              </p>
              <p style="margin:0;font-family:'Helvetica Neue',sans-serif;font-size:11px;color:#d1d5db;">
                Este es un correo automático — no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
```

---

## Criterios de aceptación

- [ ] El webhook recibe `{ email, added_by }` y no rompe si algún campo es null
- [ ] El email llega al nuevo usuario con su email visible en el paso 2
- [ ] El contacto del admin aparece como link clickeable en el cuerpo
- [ ] El botón "Ir a CPE Campo →" lleva a `cpecampo.avancargo.com`
- [ ] La barra naranja (#FF6C02) aparece bajo el header navy (#1E3252)
- [ ] El paso 3 tiene bullet naranja (diferenciador visual)
- [ ] Guardar la URL del webhook para cargarla en `.env` como `VITE_N8N_WEBHOOK_BIENVENIDA_URL`
