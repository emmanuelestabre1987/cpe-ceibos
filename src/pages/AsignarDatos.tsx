import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import SectionTitle from '../components/ui/SectionTitle'
import { FormField, SelectField } from '../components/forms/FormField'
import CuitField from '../components/forms/CuitField'
import VoiceInput from '../components/forms/VoiceInput'
import { useToast } from '../components/ui/Toast'
import { getRecord, updateRecord } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { CAMPOS, GRANOS, VARIEDADES, LOCALIDADES } from '../types'
import type { CpeRecord, CpeStatus, RecordFormData } from '../types'

// ── Helpers ───────────────────────────────────────────────────

function str(v: string | number | boolean | null | undefined): string {
  return v === null || v === undefined ? '' : String(v)
}

const STATUS_BG: Record<CpeStatus, string> = {
  IMPORTADO:  '#2C9FC0',
  TRANSPORTE: '#F59E0B',
  CARGADO:    '#FF6C02',
  CERRADO:    '#16A34A',
  ENVIADO:    '#15803D',
  CANCELADO:  '#9CA3AF',
}

// ── Component ─────────────────────────────────────────────────

export default function AsignarDatos() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const { user }       = useAuth()
  const { show, ToastComponent } = useToast()

  const [records, setRecords] = useState<CpeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  // Single partial form — only filled fields are written on save
  const [form, setForm] = useState<Partial<RecordFormData>>({})

  const set = (field: keyof RecordFormData) => (val: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setForm(prev => ({ ...prev, [field]: val === '' ? undefined : val as any }))
  }
  const setNum = (field: keyof RecordFormData) => (val: string) => {
    setForm(prev => ({ ...prev, [field]: val === '' ? undefined : Number(val) }))
  }

  // ── Load records from ?ids= ───────────────────────────────────
  useEffect(() => {
    const raw = searchParams.get('ids') ?? ''
    const ids = raw.split(',').filter(Boolean)
    if (ids.length === 0) { navigate('/'); return }

    setLoading(true)
    Promise.all(ids.map(id => getRecord(id)))
      .then(results => {
        const valid = results.filter((r): r is CpeRecord => r !== null)
        if (valid.length === 0) { navigate('/'); return }
        setRecords(valid)
      })
      .catch(() => show('Error al cargar cupos', 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ─────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!user?.email) return
    const changes = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== undefined)
    ) as Partial<CpeRecord>

    if (Object.keys(changes).length === 0) {
      show('No hay campos para guardar', 'info')
      return
    }
    setSaving(true)
    try {
      await Promise.all(
        records.map(r => updateRecord(r.id, r.cpe_id, changes, r, user.email!))
      )
      show(`Datos actualizados en ${records.length} cupos`, 'success')
      navigate('/')
    } catch (e) {
      show((e as Error).message, 'error')
      setSaving(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Asignación masiva" showBack />
        <div className="max-w-mobile mx-auto px-4 pt-20 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-white rounded-xl border border-gray-light animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header title="Asignación masiva" showBack />

      <div className="max-w-mobile mx-auto px-4 space-y-4 pt-20">

        {/* ── Cupos seleccionados ── */}
        <div className="bg-white border border-gray-light rounded-2xl divide-y divide-gray-light">
          <div className="px-4 py-2.5 bg-gray-50 rounded-t-2xl">
            <p className="font-mono text-xs font-bold text-primary uppercase tracking-wide">
              {records.length} {records.length === 1 ? 'cupo seleccionado' : 'cupos seleccionados'}
            </p>
          </div>
          {records.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <p className="font-mono text-sm font-bold text-primary truncate">
                {r.cupo ?? r.cpe_id}
              </p>
              <span
                className="shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-semibold text-white"
                style={{ backgroundColor: STATUS_BG[r.status] ?? '#9CA3AF' }}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>

        {/* ── Aviso ── */}
        <p className="font-sans text-xs text-text-muted px-1">
          Solo se actualizan los campos que completes. Los campos vacíos no se modifican.
        </p>

        {/* ── Sección 1: Transporte ── */}
        <SectionTitle>Transporte</SectionTitle>
        <CuitField  label="CUIT Empresa Transportista" value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} onRazonSocialFound={set('transporte')} />
        <VoiceInput label="Empresa Transportista"      value={str(form.transporte)}      onChange={set('transporte')} />
        <CuitField  label="CUIL Chofer"                value={str(form.cuil_chofer)}     onChange={set('cuil_chofer')}     onRazonSocialFound={set('chofer')} />
        <VoiceInput label="Chofer"                     value={str(form.chofer)}          onChange={set('chofer')} />
        <VoiceInput label="Chasis / Patente"           value={str(form.chasis)}          onChange={set('chasis')} />
        <VoiceInput label="Acoplado / Patente"         value={str(form.acoplado)}        onChange={set('acoplado')} />
        <FormField  label="Fecha Partida"              value={str(form.fecha_partida)}   onChange={set('fecha_partida')} type="datetime-local" />
        <FormField  label="Kms. a recorrer"            value={str(form.km)}              onChange={setNum('km')} type="number" />
        <FormField  label="Tarifa"                     value={str(form.tarifa)}          onChange={setNum('tarifa')} type="number" />
        <FormField  label="N° RUCA"                    value={str(form.nro_ruca)}        onChange={set('nro_ruca')} />

        {/* ── Sección 2: Intervinientes ── */}
        <SectionTitle className="mt-2">Intervinientes (Sección A)</SectionTitle>
        <CuitField  label="CUIT Titular"                          value={str(form.titular_cuit)}                 onChange={set('titular_cuit')}                 onRazonSocialFound={set('titular_nombre')} />
        <VoiceInput label="Titular Carta de Porte"                value={str(form.titular_nombre)}               onChange={set('titular_nombre')} />
        <CuitField  label="CUIT Remitente Comercial"              value={str(form.remitente_comercial_cuit)}     onChange={set('remitente_comercial_cuit')}     onRazonSocialFound={set('remitente_comercial_nombre')} />
        <VoiceInput label="Remitente Comercial Productor"         value={str(form.remitente_comercial_nombre)}   onChange={set('remitente_comercial_nombre')} />
        <CuitField  label="CUIT Rte. Comercial Venta Primaria"    value={str(form.cuit_rte_venta_primaria)}      onChange={set('cuit_rte_venta_primaria')}      onRazonSocialFound={set('rte_venta_primaria')} />
        <VoiceInput label="Rte. Comercial Venta Primaria"         value={str(form.rte_venta_primaria)}           onChange={set('rte_venta_primaria')} />
        <CuitField  label="CUIT Rte. Comercial Venta Secundaria"  value={str(form.cuit_rte_venta_secundaria)}    onChange={set('cuit_rte_venta_secundaria')}    onRazonSocialFound={set('rte_venta_secundaria')} />
        <VoiceInput label="Rte. Comercial Venta Secundaria"       value={str(form.rte_venta_secundaria)}         onChange={set('rte_venta_secundaria')} />
        <CuitField  label="CUIT Rte. Comercial Venta Secundaria 2" value={str(form.cuit_rte_venta_secundaria2)}  onChange={set('cuit_rte_venta_secundaria2')}  onRazonSocialFound={set('rte_venta_secundaria2')} />
        <VoiceInput label="Rte. Comercial Venta Secundaria 2"     value={str(form.rte_venta_secundaria2)}        onChange={set('rte_venta_secundaria2')} />
        <VoiceInput label="Mercado a Término"                     value={str(form.mercado_termino)}              onChange={set('mercado_termino')} />
        <CuitField  label="CUIT Corredor Venta Primaria"          value={str(form.cuit_corredor_primario)}       onChange={set('cuit_corredor_primario')}       onRazonSocialFound={set('corredor_primario')} />
        <VoiceInput label="Corredor Venta Primaria"               value={str(form.corredor_primario)}            onChange={set('corredor_primario')} />
        <CuitField  label="CUIT Corredor Venta Secundaria"        value={str(form.cuit_corredor_secundario)}     onChange={set('cuit_corredor_secundario')}     onRazonSocialFound={set('corredor_secundario')} />
        <VoiceInput label="Corredor Venta Secundaria"             value={str(form.corredor_secundario)}          onChange={set('corredor_secundario')} />
        <CuitField  label="CUIT Representante Entregador"         value={str(form.cuit_repr_entregador)}         onChange={set('cuit_repr_entregador')}         onRazonSocialFound={set('repr_entregador')} />
        <VoiceInput label="Representante Entregador"              value={str(form.repr_entregador)}              onChange={set('repr_entregador')} />
        <CuitField  label="CUIT Representante Recibidor"          value={str(form.cuit_repr_recibidor)}          onChange={set('cuit_repr_recibidor')}          onRazonSocialFound={set('repr_recibidor')} />
        <VoiceInput label="Representante Recibidor"               value={str(form.repr_recibidor)}               onChange={set('repr_recibidor')} />
        <CuitField  label="CUIT Destinatario"                     value={str(form.cuit_destinatario)}            onChange={set('cuit_destinatario')}            onRazonSocialFound={set('destinatario')} />
        <VoiceInput label="Destinatario"                          value={str(form.destinatario)}                 onChange={set('destinatario')} />
        <CuitField  label="CUIT Destino"                          value={str(form.cuit_destino)}                 onChange={set('cuit_destino')}                 onRazonSocialFound={set('destino')} />
        <VoiceInput label="Destino"                               value={str(form.destino)}                      onChange={set('destino')} />
        <CuitField  label="CUIT Flete Pagador"                    value={str(form.cuit_pagador_flete)}           onChange={set('cuit_pagador_flete')}           onRazonSocialFound={set('pagador_flete')} />
        <VoiceInput label="Flete Pagador"                         value={str(form.pagador_flete)}                onChange={set('pagador_flete')} />
        <CuitField  label="CUIT Intermediario de Flete"           value={str(form.cuit_intermediario)}           onChange={set('cuit_intermediario')}           onRazonSocialFound={set('intermediario_flete')} />
        <VoiceInput label="Intermediario de Flete"                value={str(form.intermediario_flete)}          onChange={set('intermediario_flete')} />

        {/* ── Sección 3: Grano / Especie ── */}
        <SectionTitle className="mt-2">Grano / Especie (Sección B)</SectionTitle>
        <SelectField label="Grano"    value={str(form.grano)}    onChange={set('grano')}    options={GRANOS} />
        <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
        <SelectField
          label="Declaración de Calidad"
          value={str(form.declaracion_calidad)}
          onChange={set('declaracion_calidad')}
          options={['conforme', 'condicional']}
        />
        <FormField label="Campaña"      value={str(form.campania)}          onChange={set('campania')} />
        <FormField label="Peso Bruto"   value={str(form.kg_bruto_cargados)} onChange={setNum('kg_bruto_cargados')} type="number" />
        <FormField label="Peso Tara"    value={str(form.kg_tara_cargados)}  onChange={setNum('kg_tara_cargados')}  type="number" />
        <FormField label="Kg Estimados" value={str(form.kg_estimados)}      onChange={setNum('kg_estimados')}      type="number" />
        <VoiceInput label="Observaciones" value={str(form.observaciones)}   onChange={set('observaciones')} multiline rows={4} />

        {/* ── Sección 4: Procedencia + Destino ── */}
        <SectionTitle className="mt-2">Procedencia — Origen (Sección C)</SectionTitle>
        <FormField  label="Fecha de carga"   value={str(form.fecha_carga)}        onChange={set('fecha_carga')} type="date" />
        <SelectField label="Localidad"       value={str(form.localidad)}          onChange={set('localidad')}   options={LOCALIDADES} />
        <FormField  label="Provincia Origen" value={str(form.provincia_origen)}   onChange={set('provincia_origen')} />
        <FormField  label="Descripción"      value={str(form.descripcion_origen)} onChange={set('descripcion_origen')} />
        <FormField  label="RENSPA"           value={str(form.renspa)}             onChange={set('renspa')} />
        <SelectField label="Campo"           value={str(form.campo)}              onChange={set('campo')} options={CAMPOS} />

        <SectionTitle className="mt-4">Destino de la Mercadería (Sección D)</SectionTitle>
        <FormField label="N° Planta"           value={str(form.nro_planta)}        onChange={set('nro_planta')} />
        <FormField label="Dirección"           value={str(form.direccion_destino)} onChange={set('direccion_destino')} />
        <FormField label="Localidad (Destino)" value={str(form.localidad_destino)} onChange={set('localidad_destino')} />
        <FormField label="Provincia Destino"   value={str(form.provincia_destino)} onChange={set('provincia_destino')} />

        {/* ── Sección 5: Contingencias ── */}
        <SectionTitle className="mt-2">Contingencias (Sección F)</SectionTitle>
        <FormField label="Contingencia"  value={str(form.contingencia)}       onChange={set('contingencia')} />
        <FormField label="Otro"          value={str(form.contingencia_otro)}  onChange={set('contingencia_otro')} />
        <FormField label="Desactivación" value={str(form.desactivacion)}      onChange={set('desactivacion')} />
        <FormField label="Otro"          value={str(form.desactivacion_otro)} onChange={set('desactivacion_otro')} />

        {/* ── Sección 6: Descarga ── */}
        <SectionTitle className="mt-2">Descarga (Sección G)</SectionTitle>
        <FormField label="Fecha Arribo"         value={str(form.fecha_arribo)}         onChange={set('fecha_arribo')}         type="datetime-local" />
        <FormField label="Fecha Descarga"       value={str(form.fecha_descarga)}       onChange={set('fecha_descarga')}       type="datetime-local" />
        <FormField label="N° Turno"             value={str(form.nro_turno)}            onChange={set('nro_turno')} />
        <FormField label="Peso Bruto (kg)"      value={str(form.kg_bruto_descargados)} onChange={setNum('kg_bruto_descargados')} type="number" />
        <FormField label="Peso Tara (kg)"       value={str(form.kg_tara_descargados)}  onChange={setNum('kg_tara_descargados')}  type="number" />
        <FormField label="Localidad (Descarga)" value={str(form.localidad_descarga)}   onChange={set('localidad_descarga')} />
        <FormField label="Provincia (Descarga)" value={str(form.provincia_descarga)}   onChange={set('provincia_descarga')} />

      </div>

      {/* ── Bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-light px-4 py-3 pb-safe">
        <div className="max-w-mobile mx-auto">
          <Button fullWidth loading={saving} onClick={() => void handleGuardar()}>
            Guardar datos en {records.length} {records.length === 1 ? 'cupo' : 'cupos'}
          </Button>
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}
