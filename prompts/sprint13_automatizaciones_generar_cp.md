# PROMPT — Agente Automatizaciones: Sprint 13 · Workflow n8n Generar CP

## Contexto

La app CPE Campo dispara un `POST` al webhook de n8n cuando el usuario presiona "Generar CP".
El body contiene el registro completo del cupo en JSON. El workflow tiene que:

1. **Nodo Code** — filtrar solo los campos con valor, agruparlos por sección y calcular kg neto
2. **Nodo Gmail** — enviar un email HTML al equipo solicitando la generación de la Carta de Porte

---

## Estructura del workflow

```
Webhook Trigger → Code → Gmail
```

---

## Nodo 1 — Webhook Trigger

Ya configurado. Los datos del cupo llegan en `$json.body`.

---

## Nodo 2 — Code

Lenguaje: **JavaScript**.

```js
const body = $json.body

// ── Helpers ──────────────────────────────────────────────────
const val = (v) => v !== null && v !== undefined && v !== ''
const fmt = (v) => v !== null && v !== undefined ? String(v) : null
const fmtNum = (v) => v !== null && v !== undefined ? Number(v).toLocaleString('es-AR') : null
const fmtDate = (v) => {
  if (!v) return null
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}
const kgNeto = (bruto, tara) =>
  val(bruto) && val(tara) ? (Number(bruto) - Number(tara)).toLocaleString('es-AR') + ' kg' : null

// ── Secciones con labels ──────────────────────────────────────
const secciones = [
  {
    titulo: 'General',
    campos: [
      { key: 'cpe_id',       label: 'ID CPE',         value: fmt(body.cpe_id) },
      { key: 'cupo',         label: 'Cupo',            value: fmt(body.cupo) },
      { key: 'fecha_carga',  label: 'Fecha de carga',  value: fmtDate(body.fecha_carga) },
      { key: 'status',       label: 'Estado',          value: fmt(body.status) },
      { key: 'renspa',       label: 'RENSPA',          value: fmt(body.renspa) },
      { key: 'campania',     label: 'Campaña',         value: fmt(body.campania) },
      { key: 'grano',        label: 'Grano',           value: fmt(body.grano) },
      { key: 'variedad',     label: 'Variedad',        value: fmt(body.variedad) },
      { key: 'localidad',    label: 'Localidad',       value: fmt(body.localidad) },
      { key: 'campo',        label: 'Campo',           value: fmt(body.campo) },
      { key: 'nro_planta',   label: 'N° Planta',      value: fmt(body.nro_planta) },
    ]
  },
  {
    titulo: 'Comercial',
    campos: [
      { key: 'destinatario',          label: 'Destinatario',           value: fmt(body.destinatario) },
      { key: 'cuit_destinatario',     label: 'CUIT Destinatario',      value: fmt(body.cuit_destinatario) },
      { key: 'destino',               label: 'Destino',                value: fmt(body.destino) },
      { key: 'cuit_destino',          label: 'CUIT Destino',           value: fmt(body.cuit_destino) },
      { key: 'rte_venta_primaria',    label: 'Rte. Venta Primaria',    value: fmt(body.rte_venta_primaria) },
      { key: 'cuit_rte_venta_primaria', label: 'CUIT Rte. V. Primaria', value: fmt(body.cuit_rte_venta_primaria) },
      { key: 'rte_venta_secundaria',  label: 'Rte. Venta Secundaria',  value: fmt(body.rte_venta_secundaria) },
      { key: 'cuit_rte_venta_secundaria', label: 'CUIT Rte. V. Secundaria', value: fmt(body.cuit_rte_venta_secundaria) },
      { key: 'corredor_primario',     label: 'Corredor Primario',      value: fmt(body.corredor_primario) },
      { key: 'cuit_corredor_primario', label: 'CUIT Corredor Primario', value: fmt(body.cuit_corredor_primario) },
      { key: 'corredor_secundario',   label: 'Corredor Secundario',    value: fmt(body.corredor_secundario) },
      { key: 'cuit_corredor_secundario', label: 'CUIT Corredor Secundario', value: fmt(body.cuit_corredor_secundario) },
      { key: 'repr_entregador',       label: 'Repr. Entregador',       value: fmt(body.repr_entregador) },
      { key: 'cuit_repr_entregador',  label: 'CUIT Repr. Entregador',  value: fmt(body.cuit_repr_entregador) },
      { key: 'repr_recibidor',        label: 'Repr. Recibidor',        value: fmt(body.repr_recibidor) },
      { key: 'cuit_repr_recibidor',   label: 'CUIT Repr. Recibidor',   value: fmt(body.cuit_repr_recibidor) },
    ]
  },
  {
    titulo: 'Flete',
    campos: [
      { key: 'provincia_origen',    label: 'Provincia Origen',    value: fmt(body.provincia_origen) },
      { key: 'provincia_destino',   label: 'Provincia Destino',   value: fmt(body.provincia_destino) },
      { key: 'km',                  label: 'Km',                  value: fmtNum(body.km) },
      { key: 'tarifa',              label: 'Tarifa',              value: body.tarifa ? '$ ' + fmtNum(body.tarifa) : null },
      { key: 'pagador_flete',       label: 'Pagador de Flete',    value: fmt(body.pagador_flete) },
      { key: 'intermediario_flete', label: 'Intermediario Flete', value: fmt(body.intermediario_flete) },
      { key: 'cuil_intermediario',  label: 'CUIL Intermediario',  value: fmt(body.cuil_intermediario) },
      { key: 'nro_turno',           label: 'N° de Turno',        value: fmt(body.nro_turno) },
    ]
  },
  {
    titulo: 'Transporte',
    campos: [
      { key: 'transporte',      label: 'Transportista',   value: fmt(body.transporte) },
      { key: 'cuit_transporte', label: 'CUIT Transporte', value: fmt(body.cuit_transporte) },
      { key: 'chofer',          label: 'Chofer',          value: fmt(body.chofer) },
      { key: 'cuil_chofer',     label: 'CUIL Chofer',     value: fmt(body.cuil_chofer) },
      { key: 'chasis',          label: 'Chasis / Patente', value: fmt(body.chasis) },
      { key: 'acoplado',        label: 'Acoplado',        value: fmt(body.acoplado) },
    ]
  },
  {
    titulo: 'Pesaje',
    campos: [
      { key: 'kg_estimados',         label: 'Kg Estimados',          value: body.kg_estimados ? fmtNum(body.kg_estimados) + ' kg' : null },
      { key: 'kg_bruto_cargados',    label: 'Kg Bruto Cargados',     value: body.kg_bruto_cargados ? fmtNum(body.kg_bruto_cargados) + ' kg' : null },
      { key: 'kg_tara_cargados',     label: 'Kg Tara Cargados',      value: body.kg_tara_cargados ? fmtNum(body.kg_tara_cargados) + ' kg' : null },
      { key: '_neto_cargados',       label: 'Kg Neto Cargados',      value: kgNeto(body.kg_bruto_cargados, body.kg_tara_cargados) },
      { key: 'kg_reales',            label: 'Kg Reales',             value: body.kg_reales ? fmtNum(body.kg_reales) + ' kg' : null },
      { key: 'kg_bruto_descargados', label: 'Kg Bruto Descargados',  value: body.kg_bruto_descargados ? fmtNum(body.kg_bruto_descargados) + ' kg' : null },
      { key: 'kg_tara_descargados',  label: 'Kg Tara Descargados',   value: body.kg_tara_descargados ? fmtNum(body.kg_tara_descargados) + ' kg' : null },
      { key: '_neto_descargados',    label: 'Kg Neto Descargados',   value: kgNeto(body.kg_bruto_descargados, body.kg_tara_descargados) },
      { key: 'humedad',              label: 'Humedad (%)',            value: body.humedad !== null ? body.humedad + '%' : null },
      { key: 'proteina',             label: 'Proteína (%)',           value: body.proteina !== null ? body.proteina + '%' : null },
    ]
  },
  {
    titulo: 'Cierre',
    campos: [
      { key: 'nro_ruca',   label: 'N° RUCA',   value: fmt(body.nro_ruca) },
      { key: 'ingeniero',  label: 'Ingeniero',  value: fmt(body.ingeniero) },
      { key: 'contacto',   label: 'Contacto',   value: fmt(body.contacto) },
      { key: 'gps',        label: 'GPS',        value: fmt(body.gps) },
      { key: 'observaciones', label: 'Observaciones', value: fmt(body.observaciones) },
    ]
  },
]

// ── Filtrar solo campos con valor ─────────────────────────────
const seccionesFiltradas = secciones
  .map(s => ({ ...s, campos: s.campos.filter(c => c.value !== null) }))
  .filter(s => s.campos.length > 0)

// ── Generar HTML ──────────────────────────────────────────────
const seccionHTML = (s) => `
  <div style="margin-bottom:28px;">
    <div style="background:#1E3252;padding:8px 16px;border-radius:6px 6px 0 0;">
      <span style="font-family:monospace;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">${s.titulo}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;">
      ${s.campos.map((c, i) => `
        <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'};">
          <td style="padding:10px 16px;font-family:monospace;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;width:45%;border-bottom:1px solid #f3f4f6;">${c.label}</td>
          <td style="padding:10px 16px;font-family:sans-serif;font-size:14px;color:#1E3252;font-weight:500;border-bottom:1px solid #f3f4f6;">${c.value}</td>
        </tr>
      `).join('')}
    </table>
  </div>
`

const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1E3252;padding:28px 32px;">
      <p style="margin:0;font-family:monospace;font-size:10px;color:#2C9FC0;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">Avant Cargo · CPE Campo</p>
      <h1 style="margin:0;font-family:monospace;font-size:22px;color:#ffffff;font-weight:700;">Solicitud de Carta de Porte</h1>
      <p style="margin:8px 0 0;font-family:sans-serif;font-size:13px;color:#94a3b8;">
        Cupo <strong style="color:#2C9FC0;">${body.cupo || body.cpe_id}</strong> · Generado el ${new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
      </p>
    </div>

    <!-- Aviso -->
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 20px;margin:24px 24px 0;">
      <p style="margin:0;font-family:sans-serif;font-size:13px;color:#92400e;">
        Se solicita la generación de la CP con los datos cargados en el sistema. Verificar y proceder.
      </p>
    </div>

    <!-- Secciones -->
    <div style="padding:24px 24px 8px;">
      ${seccionesFiltradas.map(seccionHTML).join('')}
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
      <p style="margin:0;font-family:monospace;font-size:11px;color:#9ca3af;">
        Generado automáticamente por CPE Campo · Avant Cargo
      </p>
      <p style="margin:4px 0 0;font-family:sans-serif;font-size:11px;color:#d1d5db;">
        Este correo no requiere respuesta — las acciones se realizan en el sistema.
      </p>
    </div>

  </div>
</body>
</html>
`

return [{
  json: {
    subject: `Solicitud CP · ${body.cupo || body.cpe_id} · ${body.grano || 'Cupo'} — ${new Date().toLocaleDateString('es-AR')}`,
    html,
    cpe_id: body.cpe_id,
    cupo: body.cupo,
  }
}]
```

---

## Nodo 3 — Gmail

| Campo | Valor |
|-------|-------|
| **To** | `operaciones@ceibos.com.ar` ← reemplazar con el email real del equipo |
| **Subject** | `{{ $json.subject }}` |
| **Message** | `{{ $json.html }}` |
| **Message Type** | HTML |

---

## Criterios de aceptación

- [ ] El nodo Code no rompe si un campo es `null` — lo omite silenciosamente
- [ ] Las secciones sin ningún campo cargado no aparecen en el email
- [ ] Kg Neto Cargados y Kg Neto Descargados se calculan automáticamente si hay bruto y tara
- [ ] El subject incluye cupo, grano y fecha
- [ ] El HTML se ve correctamente en Gmail desktop y mobile
- [ ] El correo llega al placeholder `operaciones@ceibos.com.ar`
