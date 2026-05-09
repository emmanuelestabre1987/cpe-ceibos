import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import Header from '../components/layout/Header'
import WizardProgress from '../components/layout/WizardProgress'
import Button from '../components/ui/Button'
import { FormField, SelectField } from '../components/forms/FormField'
import VoiceInput from '../components/forms/VoiceInput'
import GPSInput from '../components/forms/GPSInput'
import SectionTitle from '../components/ui/SectionTitle'
import { useToast } from '../components/ui/Toast'
import { createRecord } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { CAMPOS, GRANOS, VARIEDADES, LOCALIDADES, type RecordFormData } from '../types'

const DRAFT_KEY = 'draft_new_record'

const empty: RecordFormData = {
  fecha_carga: new Date().toISOString().slice(0, 10),
  campo: '', localidad: '', grano: '', variedad: '',
  destinatario: '', cuit_destinatario: '', destino: '', cuit_destino: '',
  rte_venta_primaria: '', rte_venta_secundaria: '', rte_venta_secundaria2: '',
  mercado_termino: '', corredor_primario: '', corredor_secundario: '',
  repr_entregador: '', repr_recibidor: '',
  km: null, tarifa: null,
  pagador_flete: '', cupo: '', intermediario_flete: '', cuil_intermediario: '', nro_planta: '', observaciones: '',
  transporte: '', cuit_transporte: '', chofer: '', cuil_chofer: '', chasis: '', acoplado: '',
  kg_bruto_cargados: null, kg_tara_cargados: null, kg_estimados: null, kg_reales: null,
  kg_bruto_descargados: null, kg_tara_descargados: null,
  nro_ruca: '', ingeniero: '', contacto: '', gps: '',
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
      <div className="max-w-mobile mx-auto px-4 pt-32 pb-32 space-y-4">
        {step === 1 && (
          <>
            <SectionTitle>Datos Generales</SectionTitle>
            <FormField label="Fecha de carga" value={str(form.fecha_carga)} onChange={set('fecha_carga')} type="date" required />
            <SelectField label="Campo" value={str(form.campo)} onChange={set('campo')} options={CAMPOS} required />
            <SelectField label="Localidad" value={str(form.localidad)} onChange={set('localidad')} options={LOCALIDADES} required />
            <SelectField label="Grano" value={str(form.grano)} onChange={set('grano')} options={GRANOS} required />
            <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle>Comercial</SectionTitle>
            <VoiceInput label="Destinatario" value={str(form.destinatario)} onChange={set('destinatario')} />
            <FormField label="CUIT Destinatario" value={str(form.cuit_destinatario)} onChange={set('cuit_destinatario')} />
            <VoiceInput label="Destino" value={str(form.destino)} onChange={set('destino')} />
            <FormField label="CUIT Destino" value={str(form.cuit_destino)} onChange={set('cuit_destino')} />
            <VoiceInput label="Rte. Venta Primaria" value={str(form.rte_venta_primaria)} onChange={set('rte_venta_primaria')} />
            <VoiceInput label="Rte. Venta Secundaria" value={str(form.rte_venta_secundaria)} onChange={set('rte_venta_secundaria')} />
            <VoiceInput label="Rte. Venta Secundaria 2" value={str(form.rte_venta_secundaria2)} onChange={set('rte_venta_secundaria2')} />
            <VoiceInput label="Mercado a Término" value={str(form.mercado_termino)} onChange={set('mercado_termino')} />
            <VoiceInput label="Corredor Primario" value={str(form.corredor_primario)} onChange={set('corredor_primario')} />
            <VoiceInput label="Corredor Secundario" value={str(form.corredor_secundario)} onChange={set('corredor_secundario')} />
            <VoiceInput label="Repr. Entregador" value={str(form.repr_entregador)} onChange={set('repr_entregador')} />
            <VoiceInput label="Repr. Recibidor" value={str(form.repr_recibidor)} onChange={set('repr_recibidor')} />
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle>Flete</SectionTitle>
            <FormField label="Km" value={str(form.km)} onChange={set('km')} type="number" />
            <FormField label="Tarifa" value={str(form.tarifa)} onChange={set('tarifa')} type="number" />
            <VoiceInput label="Pagador de Flete" value={str(form.pagador_flete)} onChange={set('pagador_flete')} />
            <VoiceInput label="Cupo" value={str(form.cupo)} onChange={set('cupo')} />
            <VoiceInput label="Intermediario de Flete" value={str(form.intermediario_flete)} onChange={set('intermediario_flete')} />
            <FormField label="CUIL Intermediario" value={str(form.cuil_intermediario)} onChange={set('cuil_intermediario')} />
            <VoiceInput label="Observaciones" value={str(form.observaciones)} onChange={set('observaciones')} multiline rows={4} />
          </>
        )}

        {step === 4 && (
          <>
            <SectionTitle>Transporte</SectionTitle>
            <VoiceInput label="Transporte" value={str(form.transporte)} onChange={set('transporte')} />
            <FormField label="CUIT Transporte" value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} />
            <VoiceInput label="Chofer" value={str(form.chofer)} onChange={set('chofer')} />
            <FormField label="CUIL Chofer" value={str(form.cuil_chofer)} onChange={set('cuil_chofer')} />
            <VoiceInput label="Chasis / Patente" value={str(form.chasis)} onChange={set('chasis')} />
            <VoiceInput label="Acoplado / Patente" value={str(form.acoplado)} onChange={set('acoplado')} />
          </>
        )}

        {step === 5 && (
          <>
            <SectionTitle>Pesaje — Cargados</SectionTitle>
            <FormField label="Kg Bruto" value={str(form.kg_bruto_cargados)} onChange={set('kg_bruto_cargados')} type="number" />
            <FormField label="Kg Tara" value={str(form.kg_tara_cargados)} onChange={set('kg_tara_cargados')} type="number" />
            <FormField label="Kg Estimados" value={str(form.kg_estimados)} onChange={set('kg_estimados')} type="number" />
            <FormField label="Kg Reales" value={str(form.kg_reales)} onChange={set('kg_reales')} type="number" />
            <SectionTitle className="mt-4">Pesaje — Descargados</SectionTitle>
            <FormField label="Kg Bruto" value={str(form.kg_bruto_descargados)} onChange={set('kg_bruto_descargados')} type="number" />
            <FormField label="Kg Tara" value={str(form.kg_tara_descargados)} onChange={set('kg_tara_descargados')} type="number" />
          </>
        )}

        {step === 6 && (
          <>
            <SectionTitle>Cierre</SectionTitle>
            <VoiceInput label="N° RUCA" value={str(form.nro_ruca)} onChange={set('nro_ruca')} />
            <VoiceInput label="Ingeniero" value={str(form.ingeniero)} onChange={set('ingeniero')} />
            <VoiceInput label="Contacto" value={str(form.contacto)} onChange={set('contacto')} />
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
                ['Kg Reales', form.kg_reales],
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

      {ToastComponent}
    </div>
  )
}
