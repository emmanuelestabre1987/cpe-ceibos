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
  rte_venta_secundaria2: '',
  mercado_termino: '', corredor_primario: '', cuit_corredor_primario: null,
  corredor_secundario: '', cuit_corredor_secundario: null,
  repr_entregador: '', cuit_repr_entregador: null,
  repr_recibidor: '', cuit_repr_recibidor: null,
  km: null, tarifa: null,
  pagador_flete: '', cupo: '', intermediario_flete: '', cuil_intermediario: '',
  nro_planta: '', nro_turno: null, provincia_origen: null, provincia_destino: null,
  es_campo_destino: null, direccion_destino: null,
  observaciones: '',
  transporte: '', cuit_transporte: '', chofer: '', cuil_chofer: '', chasis: '', acoplado: '',
  fecha_partida: null,
  kg_bruto_cargados: null, kg_tara_cargados: null, kg_estimados: null,
  kg_bruto_descargados: null, kg_tara_descargados: null,
  nro_ruca: '', gps: '',
}

function str(val: string | number | null | undefined) {
  return val === null || val === undefined ? '' : String(val)
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

  // Debounced persist — only once the user has changed something
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
      if (raw) {
        setForm(JSON.parse(raw) as RecordFormData)
        setIsDirty(true)
      }
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

  const next = () => setStep((s) => Math.min(s + 1, 6) as typeof step)
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
        {step === 1 && (
          <>
            <SectionTitle>Datos Generales</SectionTitle>
            <FormField label="Fecha de carga" value={str(form.fecha_carga)} onChange={set('fecha_carga')} type="date" required />
            <FormField label="Cupo" value={str(form.cupo)} onChange={set('cupo')} required />
            <SelectField label="Campo" value={str(form.campo)} onChange={set('campo')} options={CAMPOS} required />
            <SelectField label="Localidad" value={str(form.localidad)} onChange={set('localidad')} options={LOCALIDADES} required />
            <SelectField label="Grano" value={str(form.grano)} onChange={set('grano')} options={GRANOS} required />
            <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
            <SelectField
              label="Declaración de Calidad"
              value={str(form.declaracion_calidad)}
              onChange={set('declaracion_calidad')}
              options={['conforme', 'condicional']}
            />
            <FormField label="Campaña" value={str(form.campania)} onChange={set('campania')} />
            <FormField label="RENSPA" value={str(form.renspa)} onChange={set('renspa')} />
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
            <FormField label="Descripción" value={str(form.descripcion_origen)} onChange={set('descripcion_origen')} />
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle>Comercial</SectionTitle>
            <VoiceInput label="Titular Carta de Porte" value={str(form.titular_nombre)} onChange={set('titular_nombre')} />
            <FormField label="CUIT Titular" value={str(form.titular_cuit)} onChange={set('titular_cuit')} />
            <VoiceInput label="Remitente Comercial Productor" value={str(form.remitente_comercial_nombre)} onChange={set('remitente_comercial_nombre')} />
            <FormField label="CUIT Remitente Comercial" value={str(form.remitente_comercial_cuit)} onChange={set('remitente_comercial_cuit')} />
            <VoiceInput label="Destinatario" value={str(form.destinatario)} onChange={set('destinatario')} />
            <FormField label="CUIT Destinatario" value={str(form.cuit_destinatario)} onChange={set('cuit_destinatario')} />
            <VoiceInput label="Destino" value={str(form.destino)} onChange={set('destino')} />
            <FormField label="CUIT Destino" value={str(form.cuit_destino)} onChange={set('cuit_destino')} />
            <VoiceInput label="Rte. Comercial Venta Primaria" value={str(form.rte_venta_primaria)} onChange={set('rte_venta_primaria')} />
            <FormField label="CUIT Rte. Comercial Venta Primaria" value={str(form.cuit_rte_venta_primaria)} onChange={set('cuit_rte_venta_primaria')} />
            <VoiceInput label="Rte. Comercial Venta Secundaria" value={str(form.rte_venta_secundaria)} onChange={set('rte_venta_secundaria')} />
            <FormField label="CUIT Rte. Comercial Venta Secundaria" value={str(form.cuit_rte_venta_secundaria)} onChange={set('cuit_rte_venta_secundaria')} />
            <VoiceInput label="Rte. Comercial Venta Secundaria 2" value={str(form.rte_venta_secundaria2)} onChange={set('rte_venta_secundaria2')} />
            <VoiceInput label="Mercado a Término" value={str(form.mercado_termino)} onChange={set('mercado_termino')} />
            <VoiceInput label="Corredor Venta Primaria" value={str(form.corredor_primario)} onChange={set('corredor_primario')} />
            <FormField label="CUIT Corredor Venta Primaria" value={str(form.cuit_corredor_primario)} onChange={set('cuit_corredor_primario')} />
            <VoiceInput label="Corredor Venta Secundaria" value={str(form.corredor_secundario)} onChange={set('corredor_secundario')} />
            <FormField label="CUIT Corredor Venta Secundaria" value={str(form.cuit_corredor_secundario)} onChange={set('cuit_corredor_secundario')} />
            <VoiceInput label="Representante Entregador" value={str(form.repr_entregador)} onChange={set('repr_entregador')} />
            <FormField label="CUIT Representante Entregador" value={str(form.cuit_repr_entregador)} onChange={set('cuit_repr_entregador')} />
            <VoiceInput label="Representante Recibidor" value={str(form.repr_recibidor)} onChange={set('repr_recibidor')} />
            <FormField label="CUIT Representante Recibidor" value={str(form.cuit_repr_recibidor)} onChange={set('cuit_repr_recibidor')} />
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle>Flete</SectionTitle>
            <FormField label="Kms. a recorrer" value={str(form.km)} onChange={set('km')} type="number" />
            <FormField label="Tarifa" value={str(form.tarifa)} onChange={set('tarifa')} type="number" />
            <FormField label="Nro. de Turno" value={str(form.nro_turno)} onChange={set('nro_turno')} />
            <FormField label="Provincia Origen" value={str(form.provincia_origen)} onChange={set('provincia_origen')} />
            <FormField label="Provincia Destino" value={str(form.provincia_destino)} onChange={set('provincia_destino')} />
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
            <FormField label="Dirección" value={str(form.direccion_destino)} onChange={set('direccion_destino')} />
            <VoiceInput label="Flete Pagador" value={str(form.pagador_flete)} onChange={set('pagador_flete')} />
            <VoiceInput label="Intermediario de Flete" value={str(form.intermediario_flete)} onChange={set('intermediario_flete')} />
            <FormField label="CUIL Intermediario" value={str(form.cuil_intermediario)} onChange={set('cuil_intermediario')} />
            <FormField label="Nro. de Planta" value={str(form.nro_planta)} onChange={set('nro_planta')} />
            <VoiceInput label="Observaciones" value={str(form.observaciones)} onChange={set('observaciones')} multiline rows={4} />
          </>
        )}

        {step === 4 && (
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
            <VoiceInput label="Empresa Transportista" value={str(form.transporte)} onChange={set('transporte')} />
            <FormField label="CUIT Empresa Transportista" value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} />
            <VoiceInput label="Chofer" value={str(form.chofer)} onChange={set('chofer')} />
            <FormField label="CUIL Chofer" value={str(form.cuil_chofer)} onChange={set('cuil_chofer')} />
            <VoiceInput label="Chasis / Patente" value={str(form.chasis)} onChange={set('chasis')} />
            <VoiceInput label="Acoplado / Patente" value={str(form.acoplado)} onChange={set('acoplado')} />
            <FormField label="Fecha Partida" value={str(form.fecha_partida)} onChange={set('fecha_partida')} type="datetime-local" />
          </>
        )}

        {step === 5 && (
          <>
            <SectionTitle>Pesaje — Cargados</SectionTitle>
            <FormField label="Kg Bruto" value={str(form.kg_bruto_cargados)} onChange={set('kg_bruto_cargados')} type="number" />
            <FormField label="Kg Tara" value={str(form.kg_tara_cargados)} onChange={set('kg_tara_cargados')} type="number" />
            <FormField label="Kg Estimados" value={str(form.kg_estimados)} onChange={set('kg_estimados')} type="number" />
            <SectionTitle className="mt-4">Pesaje — Descargados</SectionTitle>
            <FormField label="Kg Bruto" value={str(form.kg_bruto_descargados)} onChange={set('kg_bruto_descargados')} type="number" />
            <FormField label="Kg Tara" value={str(form.kg_tara_descargados)} onChange={set('kg_tara_descargados')} type="number" />
          </>
        )}

        {step === 6 && (
          <>
            <SectionTitle>Cierre</SectionTitle>
            <VoiceInput label="N° RUCA" value={str(form.nro_ruca)} onChange={set('nro_ruca')} />
            <GPSInput value={str(form.gps)} onChange={set('gps')} />

            {/* Summary */}
            <div className="bg-white border border-gray-light rounded-2xl p-4 mt-4 space-y-2">
              <h3 className="font-mono font-bold text-primary text-sm mb-3">Resumen</h3>
              {([
                ['Campo', form.campo],
                ['Grano', form.grano],
                ['Variedad', form.variedad],
                ['Destinatario', form.destinatario],
                ['Chofer', form.chofer],
                ['Chasis', form.chasis],
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
          {step < 6 ? (
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
            <Button
              fullWidth
              onClick={handleParseTransporte}
              disabled={!parserText.trim()}
            >
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
