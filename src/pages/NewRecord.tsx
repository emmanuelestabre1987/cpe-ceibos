import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Save, MessageSquare } from 'lucide-react'
import Header from '../components/layout/Header'
import WizardProgress from '../components/layout/WizardProgress'
import Button from '../components/ui/Button'
import { FormField, SelectField } from '../components/forms/FormField'
import VoiceInput from '../components/forms/VoiceInput'
import GPSInput from '../components/forms/GPSInput'
import SectionTitle from '../components/ui/SectionTitle'
import { useToast } from '../components/ui/Toast'
import { createRecord } from '../lib/storage'
import { parseTransporteMsg } from '../lib/transporteParser'
import { useAuth } from '../hooks/useAuth'
import { CAMPOS, GRANOS, VARIEDADES, LOCALIDADES, type RecordFormData } from '../types'

const DRAFT_KEY = 'draft_new_record'

const empty: RecordFormData = {
  fecha_carga: new Date().toISOString().slice(0, 10),
  campo: '', localidad: '', grano: '', variedad: '',
  declaracion_calidad: null,
  es_campo_origen: null,
  descripcion_origen: null,
  renspa: null, campania: null,
  titular_nombre: null, titular_cuit: null,
  remitente_comercial_nombre: null, remitente_comercial_cuit: null,
  destinatario: '', cuit_destinatario: '', destino: '', cuit_destino: '',
  rte_venta_primaria: '', cuit_rte_venta_primaria: null,
  rte_venta_secundaria: '', cuit_rte_venta_secundaria: null,
  rte_venta_secundaria2: '', cuit_rte_venta_secundaria2: null,
  mercado_termino: '', corredor_primario: '', cuit_corredor_primario: null,
  corredor_secundario: '', cuit_corredor_secundario: null,
  repr_entregador: '', cuit_repr_entregador: null,
  repr_recibidor: '', cuit_repr_recibidor: null,
  km: null, tarifa: null,
  pagador_flete: '', cuit_pagador_flete: null,
  cupo: '', intermediario_flete: '', cuit_intermediario: '',
  nro_planta: '', nro_turno: null, provincia_origen: null, provincia_destino: null,
  es_campo_destino: null, direccion_destino: null, localidad_destino: null,
  observaciones: '',
  transporte: '', cuit_transporte: '', chofer: '', cuil_chofer: '', chasis: '', acoplado: '',
  fecha_partida: null,
  kg_bruto_cargados: null, kg_tara_cargados: null, kg_estimados: null,
  kg_bruto_descargados: null, kg_tara_descargados: null,
  contingencia: null, contingencia_otro: null,
  desactivacion: null, desactivacion_otro: null,
  fecha_arribo: null, fecha_descarga: null,
  localidad_descarga: null, provincia_descarga: null,
  nro_ruca: '', gps: '',
  latitud: null, longitud: null,
}

function str(val: string | number | null | undefined) {
  return val === null || val === undefined ? '' : String(val)
}

function KgNetoDisplay({ label, bruto, tara }: { label: string; bruto: string; tara: string }) {
  const neto = bruto && tara ? Number(bruto) - Number(tara) : null
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs font-medium text-secondary uppercase tracking-wide">{label}</span>
      <div className="h-12 px-4 flex items-center rounded-xl bg-gray-100 border border-secondary/30">
        <span className={`font-sans text-base font-semibold ${neto !== null ? 'text-secondary' : 'text-text-muted'}`}>
          {neto !== null ? neto.toLocaleString('es-AR') + ' kg' : '—'}
        </span>
      </div>
    </div>
  )
}

export default function NewRecord() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<RecordFormData>(empty)
  const [saving, setSaving] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [parserOpen, setParserOpen] = useState(false)
  const [parserText, setParserText] = useState('')
  const { show, ToastComponent } = useToast()

  // Detect existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) setHasDraft(true)
    } catch { /* ignore */ }
  }, [])

  // Debounced persist
  useEffect(() => {
    if (!isDirty) return
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch { /* ignore */ }
    }, 800)
    return () => clearTimeout(t)
  }, [form, isDirty])

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) { setForm(JSON.parse(raw) as RecordFormData); setIsDirty(true) }
    } catch { /* ignore */ }
    setHasDraft(false)
  }

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    setHasDraft(false)
  }

  const set = (field: keyof RecordFormData) => (val: string) => {
    setIsDirty(true)
    setForm((prev) => ({
      ...prev,
      [field]: field === 'km' || field === 'tarifa' ||
        field.startsWith('kg_') ? (val === '' ? null : Number(val)) : val,
    }))
  }

  const setBool = (field: keyof RecordFormData) => (val: boolean) => {
    setIsDirty(true)
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  const setGps = (lat: number, lng: number) => {
    setIsDirty(true)
    setForm((prev) => ({
      ...prev,
      latitud: lat,
      longitud: lng,
      gps: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    }))
  }

  const handleParseTransporte = () => {
    const result = parseTransporteMsg(parserText)
    if (result.transporte)      set('transporte')(result.transporte)
    if (result.cuit_transporte) set('cuit_transporte')(result.cuit_transporte)
    if (result.chofer)          set('chofer')(result.chofer)
    if (result.cuil_chofer)     set('cuil_chofer')(result.cuil_chofer)
    if (result.chasis)          set('chasis')(result.chasis)
    if (result.acoplado)        set('acoplado')(result.acoplado)
    setParserOpen(false)
    setParserText('')
    if (result.missing.length > 0) {
      show(`No se detectaron: ${result.missing.join(', ')}. Completá manualmente.`, 'info')
    }
  }

  const TOTAL_STEPS = 7
  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS) as typeof step)
  const prev = () => setStep((s) => Math.max(s - 1, 1) as typeof step)

  const handleSave = async () => {
    if (!user?.email) return
    setSaving(true)
    try {
      const record = await createRecord(form, user.email)
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      navigate(`/registro/${record.id}`, { replace: true })
    } catch (e) {
      show((e as Error).message, 'error')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Nueva carga" showBack />
      <WizardProgress currentStep={step} />

      {/* Step content */}
      <div className="max-w-mobile mx-auto px-4 pt-36 pb-32 space-y-4">

        {/* ── STEP 1: TRANSPORTE ── */}
        {step === 1 && (
          <>
            <SectionTitle>Transporte</SectionTitle>
            <button
              type="button"
              onClick={() => setParserOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-secondary text-secondary font-sans text-sm font-medium mb-4 active:bg-blue-50"
            >
              <MessageSquare className="w-4 h-4" />
              Pegar mensaje WA
            </button>
            <FormField label="Cupo" value={str(form.cupo)} onChange={set('cupo')} required />
            <VoiceInput label="Empresa Transportista" value={str(form.transporte)} onChange={set('transporte')} />
            <FormField label="CUIT Empresa Transportista" value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} />
            <VoiceInput label="Chofer" value={str(form.chofer)} onChange={set('chofer')} />
            <FormField label="CUIL Chofer" value={str(form.cuil_chofer)} onChange={set('cuil_chofer')} />
            <VoiceInput label="Chasis / Patente" value={str(form.chasis)} onChange={set('chasis')} />
            <VoiceInput label="Acoplado / Patente" value={str(form.acoplado)} onChange={set('acoplado')} />
            <FormField label="Fecha Partida" value={str(form.fecha_partida)} onChange={set('fecha_partida')} type="datetime-local" />
            <FormField label="Kms. a recorrer" value={str(form.km)} onChange={set('km')} type="number" />
            <FormField label="Tarifa" value={str(form.tarifa)} onChange={set('tarifa')} type="number" />
            <FormField label="N° RUCA" value={str(form.nro_ruca)} onChange={set('nro_ruca')} />
          </>
        )}

        {/* ── STEP 2: INTERVINIENTES ── */}
        {step === 2 && (
          <>
            <SectionTitle>Intervinientes (Sección A)</SectionTitle>
            <VoiceInput label="Titular Carta de Porte"        value={str(form.titular_nombre)}            onChange={set('titular_nombre')} />
            <FormField  label="CUIT Titular"                  value={str(form.titular_cuit)}              onChange={set('titular_cuit')} />
            <VoiceInput label="Remitente Comercial Productor" value={str(form.remitente_comercial_nombre)} onChange={set('remitente_comercial_nombre')} />
            <FormField  label="CUIT Remitente Comercial"      value={str(form.remitente_comercial_cuit)}  onChange={set('remitente_comercial_cuit')} />
            <VoiceInput label="Rte. Comercial Venta Primaria"    value={str(form.rte_venta_primaria)}    onChange={set('rte_venta_primaria')} />
            <FormField  label="CUIT Rte. Comercial Venta Primaria" value={str(form.cuit_rte_venta_primaria)} onChange={set('cuit_rte_venta_primaria')} />
            <VoiceInput label="Rte. Comercial Venta Secundaria"  value={str(form.rte_venta_secundaria)}  onChange={set('rte_venta_secundaria')} />
            <FormField  label="CUIT Rte. Comercial Venta Secundaria" value={str(form.cuit_rte_venta_secundaria)} onChange={set('cuit_rte_venta_secundaria')} />
            <VoiceInput label="Rte. Comercial Venta Secundaria 2" value={str(form.rte_venta_secundaria2)} onChange={set('rte_venta_secundaria2')} />
            <FormField  label="CUIT Rte. Comercial Venta Secundaria 2" value={str(form.cuit_rte_venta_secundaria2)} onChange={set('cuit_rte_venta_secundaria2')} />
            <VoiceInput label="Mercado a Término" value={str(form.mercado_termino)} onChange={set('mercado_termino')} />
            <VoiceInput label="Corredor Venta Primaria"      value={str(form.corredor_primario)}     onChange={set('corredor_primario')} />
            <FormField  label="CUIT Corredor Venta Primaria" value={str(form.cuit_corredor_primario)} onChange={set('cuit_corredor_primario')} />
            <VoiceInput label="Corredor Venta Secundaria"    value={str(form.corredor_secundario)}   onChange={set('corredor_secundario')} />
            <FormField  label="CUIT Corredor Venta Secundaria" value={str(form.cuit_corredor_secundario)} onChange={set('cuit_corredor_secundario')} />
            <VoiceInput label="Representante Entregador"      value={str(form.repr_entregador)}      onChange={set('repr_entregador')} />
            <FormField  label="CUIT Representante Entregador" value={str(form.cuit_repr_entregador)} onChange={set('cuit_repr_entregador')} />
            <VoiceInput label="Representante Recibidor"       value={str(form.repr_recibidor)}       onChange={set('repr_recibidor')} />
            <FormField  label="CUIT Representante Recibidor"  value={str(form.cuit_repr_recibidor)}  onChange={set('cuit_repr_recibidor')} />
            <VoiceInput label="Destinatario"      value={str(form.destinatario)}      onChange={set('destinatario')} />
            <FormField  label="CUIT Destinatario" value={str(form.cuit_destinatario)} onChange={set('cuit_destinatario')} />
            <VoiceInput label="Destino"      value={str(form.destino)}      onChange={set('destino')} />
            <FormField  label="CUIT Destino" value={str(form.cuit_destino)} onChange={set('cuit_destino')} />
            <VoiceInput label="Flete Pagador"             value={str(form.pagador_flete)}      onChange={set('pagador_flete')} />
            <FormField  label="CUIT Flete Pagador"        value={str(form.cuit_pagador_flete)} onChange={set('cuit_pagador_flete')} />
            <VoiceInput label="Intermediario de Flete"     value={str(form.intermediario_flete)} onChange={set('intermediario_flete')} />
            <FormField  label="CUIT Intermediario de Flete" value={str(form.cuit_intermediario)}  onChange={set('cuit_intermediario')} />
          </>
        )}

        {/* ── STEP 3: GRANO / ESPECIE ── */}
        {step === 3 && (
          <>
            <SectionTitle>Grano / Especie (Sección B)</SectionTitle>
            <SelectField label="Grano"    value={str(form.grano)}    onChange={set('grano')}    options={GRANOS} required />
            <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
            <SelectField
              label="Declaración de Calidad"
              value={str(form.declaracion_calidad)}
              onChange={set('declaracion_calidad')}
              options={['conforme', 'condicional']}
            />
            <FormField label="Campaña" value={str(form.campania)} onChange={set('campania')} />
            <FormField label="Peso Bruto"   value={str(form.kg_bruto_cargados)} onChange={set('kg_bruto_cargados')} type="number" />
            <FormField label="Peso Tara"    value={str(form.kg_tara_cargados)}  onChange={set('kg_tara_cargados')}  type="number" />
            <KgNetoDisplay label="Kg Neto cargados" bruto={str(form.kg_bruto_cargados)} tara={str(form.kg_tara_cargados)} />
            <FormField label="Kg Estimados" value={str(form.kg_estimados)}      onChange={set('kg_estimados')}      type="number" />
            <VoiceInput label="Observaciones" value={str(form.observaciones)} onChange={set('observaciones')} multiline rows={4} />
          </>
        )}

        {/* ── STEP 4: PROCEDENCIA ── */}
        {step === 4 && (
          <>
            <SectionTitle>Procedencia — Origen (Sección C)</SectionTitle>
            <FormField label="Fecha de carga" value={str(form.fecha_carga)} onChange={set('fecha_carga')} type="date" required />
            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="new_es_campo_origen"
                checked={form.es_campo_origen ?? false}
                onChange={e => setBool('es_campo_origen')(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: '#2C9FC0' }}
              />
              <label htmlFor="new_es_campo_origen" className="font-mono text-xs font-medium text-primary uppercase tracking-wide cursor-pointer">
                Es un campo
              </label>
            </div>
            <SelectField label="Localidad"        value={str(form.localidad)}       onChange={set('localidad')}       options={LOCALIDADES} required />
            <FormField   label="Provincia Origen" value={str(form.provincia_origen)} onChange={set('provincia_origen')} />
            <GPSInput latitud={form.latitud ?? null} longitud={form.longitud ?? null} onChangeCoords={setGps} />
            <FormField label="Descripción" value={str(form.descripcion_origen)} onChange={set('descripcion_origen')} />
            <FormField label="RENSPA"      value={str(form.renspa)}             onChange={set('renspa')} />
            <SelectField label="Campo"     value={str(form.campo)}              onChange={set('campo')}  options={CAMPOS} required />

            <SectionTitle className="mt-4">Destino de la Mercadería (Sección D)</SectionTitle>
            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="new_es_campo_destino"
                checked={form.es_campo_destino ?? false}
                onChange={e => setBool('es_campo_destino')(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: '#2C9FC0' }}
              />
              <label htmlFor="new_es_campo_destino" className="font-mono text-xs font-medium text-primary uppercase tracking-wide cursor-pointer">
                Es un campo (Destino)
              </label>
            </div>
            <FormField label="N° Planta"           value={str(form.nro_planta)}        onChange={set('nro_planta')} />
            <FormField label="Dirección"           value={str(form.direccion_destino)} onChange={set('direccion_destino')} />
            <FormField label="Localidad (Destino)" value={str(form.localidad_destino)} onChange={set('localidad_destino')} />
            <FormField label="Provincia Destino"   value={str(form.provincia_destino)} onChange={set('provincia_destino')} />
          </>
        )}

        {/* ── STEP 5: CONTINGENCIAS ── */}
        {step === 5 && (
          <>
            <SectionTitle>Contingencias (Sección F)</SectionTitle>
            <FormField label="Contingencia"  value={str(form.contingencia)}      onChange={set('contingencia')} />
            <FormField label="Otro"          value={str(form.contingencia_otro)} onChange={set('contingencia_otro')} />
            <FormField label="Desactivación" value={str(form.desactivacion)}     onChange={set('desactivacion')} />
            <FormField label="Otro"          value={str(form.desactivacion_otro)} onChange={set('desactivacion_otro')} />
          </>
        )}

        {/* ── STEP 6: DESCARGA ── */}
        {step === 6 && (
          <>
            <SectionTitle>Descarga (Sección G)</SectionTitle>
            <FormField label="Fecha Arribo"   value={str(form.fecha_arribo)}   onChange={set('fecha_arribo')}   type="datetime-local" />
            <FormField label="Fecha Descarga" value={str(form.fecha_descarga)} onChange={set('fecha_descarga')} type="datetime-local" />
            <FormField label="N° Turno"        value={str(form.nro_turno)}        onChange={set('nro_turno')} />
            <FormField label="Peso Bruto (kg)" value={str(form.kg_bruto_descargados)} onChange={set('kg_bruto_descargados')} type="number" />
            <FormField label="Peso Tara (kg)"  value={str(form.kg_tara_descargados)}  onChange={set('kg_tara_descargados')}  type="number" />
            <KgNetoDisplay label="Kg Neto descargados" bruto={str(form.kg_bruto_descargados)} tara={str(form.kg_tara_descargados)} />
            <FormField label="Localidad (Descarga)"  value={str(form.localidad_descarga)}  onChange={set('localidad_descarga')} />
            <FormField label="Provincia (Descarga)"  value={str(form.provincia_descarga)}  onChange={set('provincia_descarga')} />
          </>
        )}

        {/* ── STEP 7: RESUMEN ── */}
        {step === 7 && (
          <>
            <SectionTitle>Resumen</SectionTitle>
            <div className="bg-white border border-gray-light rounded-2xl p-4 space-y-2">
              {([
                ['Cupo', form.cupo],
                ['Campo', form.campo],
                ['Grano', form.grano],
                ['Variedad', form.variedad],
                ['Destinatario', form.destinatario],
                ['Chofer', form.chofer],
                ['Chasis', form.chasis],
                ['Kms. a recorrer', form.km],
              ] as [string, string | number | null][]).filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="font-mono text-text-muted">{label}</span>
                  <span className="font-sans font-medium text-primary">{val}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Draft restore bar */}
      {hasDraft && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
          <div className="max-w-mobile mx-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-lg text-white"
            style={{ backgroundColor: '#FF6C02' }}>
            <span className="font-sans text-sm font-medium">Borrador guardado</span>
            <div className="flex items-center gap-4">
              <button onClick={discardDraft} className="font-sans text-xs text-white/80 underline">
                Descartar
              </button>
              <button onClick={restoreDraft} className="font-sans text-sm font-bold text-white">
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
        <div className="max-w-mobile mx-auto flex gap-3">
          {step > 1 && (
            <Button variant="ghost" onClick={prev} className="flex-1">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={next} className="flex-1">
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} loading={saving} className="flex-1">
              <Save className="w-4 h-4" /> Guardar CPE
            </Button>
          )}
        </div>
      </div>

      {parserOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => { setParserOpen(false); setParserText('') }}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-mobile p-4 space-y-3 pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-mono text-xs text-text-muted uppercase tracking-widest px-1 pb-1">
              Pegar mensaje WhatsApp
            </p>
            <textarea
              value={parserText}
              onChange={e => setParserText(e.target.value)}
              placeholder="Pegá acá el mensaje de WhatsApp con los datos del transportista..."
              className="w-full h-36 px-4 py-3 rounded-xl border border-gray-light font-sans text-sm resize-none focus:outline-none focus:border-secondary"
            />
            <Button fullWidth onClick={handleParseTransporte} disabled={!parserText.trim()}>
              Extraer datos
            </Button>
            <button
              className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-text-muted hover:bg-gray-50 transition"
              onClick={() => { setParserOpen(false); setParserText('') }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
