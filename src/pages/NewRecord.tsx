import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import Header from '../components/layout/Header'
import WizardProgress from '../components/layout/WizardProgress'
import Button from '../components/ui/Button'
import { FormField, SelectField } from '../components/forms/FormField'
import CuitField from '../components/forms/CuitField'
import VoiceInput from '../components/forms/VoiceInput'
import GPSInput from '../components/forms/GPSInput'
import SectionTitle from '../components/ui/SectionTitle'
import { useToast } from '../components/ui/Toast'
import { createRecord, updateRecord } from '../lib/storage'
import { parseTransporteMsg } from '../lib/transporteParser'
import { useAuth } from '../hooks/useAuth'
import { CAMPOS, GRANOS, VARIEDADES, FIELD_LABELS, type CpeRecord, type RecordFormData } from '../types'

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

// ── Roles opcionales en Intervinientes ───────────────────────

const ROLES_OPCIONALES = [
  { id: 'rte_primaria',        label: 'Rte. Venta Primaria'   },
  { id: 'rte_secundaria',      label: 'Rte. Venta Secundaria' },
  { id: 'rte_secundaria2',     label: 'Rte. Venta Sec. 2'     },
  { id: 'mercado',             label: 'Mercado a Término'      },
  { id: 'corredor_primario',   label: 'Corredor Primario'      },
  { id: 'corredor_secundario', label: 'Corredor Secundario'    },
  { id: 'repr_entregador',     label: 'Rep. Entregador'        },
  { id: 'repr_recibidor',      label: 'Rep. Recibidor'         },
] as const

export default function NewRecord() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep]           = useState(1)
  const [form, setForm]           = useState<RecordFormData>(empty)
  const [saving, setSaving]       = useState(false)
  const [hasDraft, setHasDraft]   = useState(false)
  const [isDirty, setIsDirty]     = useState(false)
  const [parserOpen, setParserOpen] = useState(false)
  const [parserText, setParserText] = useState('')
  // Record identity — set once step 1 creates the record
  const [recordId,   setRecordId]   = useState<string | null>(null)
  const [cpeId,      setCpeId]      = useState<string | null>(null)
  const [recordSnap, setRecordSnap] = useState<CpeRecord | null>(null)
  // Generar CP
  const [generando,   setGenerando]   = useState(false)
  const [cpModalOpen, setCpModalOpen] = useState(false)
  const [cpMissing,   setCpMissing]   = useState<{ section: string; missing: string[] }[]>([])
  // Roles opcionales Intervinientes
  const [rolesActivos, setRolesActivos] = useState(new Set<string>())
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

  const clearRolFields = (id: string) => {
    switch (id) {
      case 'rte_primaria':        set('cuit_rte_venta_primaria')('');    set('rte_venta_primaria')('');    break
      case 'rte_secundaria':      set('cuit_rte_venta_secundaria')('');   set('rte_venta_secundaria')('');  break
      case 'rte_secundaria2':     set('cuit_rte_venta_secundaria2')('');  set('rte_venta_secundaria2')(''); break
      case 'mercado':             set('mercado_termino')('');             break
      case 'corredor_primario':   set('cuit_corredor_primario')('');      set('corredor_primario')('');     break
      case 'corredor_secundario': set('cuit_corredor_secundario')('');    set('corredor_secundario')('');   break
      case 'repr_entregador':     set('cuit_repr_entregador')('');        set('repr_entregador')('');       break
      case 'repr_recibidor':      set('cuit_repr_recibidor')('');         set('repr_recibidor')('');        break
    }
  }

  const toggleRol = (id: string) => {
    const wasActive = rolesActivos.has(id)
    setRolesActivos(prev => {
      const next = new Set(prev)
      if (wasActive) next.delete(id)
      else next.add(id)
      return next
    })
    if (wasActive) clearRolFields(id)
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

  function getCamposDePaso(s: number): (keyof RecordFormData)[] {
    switch (s) {
      case 1: return ['transporte','cuit_transporte','chofer','cuil_chofer','chasis','acoplado',
                      'fecha_partida','km','tarifa','nro_ruca']
      case 2: return ['titular_nombre','titular_cuit','remitente_comercial_nombre','remitente_comercial_cuit',
                      'rte_venta_primaria','cuit_rte_venta_primaria','rte_venta_secundaria','cuit_rte_venta_secundaria',
                      'rte_venta_secundaria2','cuit_rte_venta_secundaria2','mercado_termino',
                      'corredor_primario','cuit_corredor_primario','corredor_secundario','cuit_corredor_secundario',
                      'repr_entregador','cuit_repr_entregador','repr_recibidor','cuit_repr_recibidor',
                      'destinatario','cuit_destinatario','destino','cuit_destino',
                      'pagador_flete','cuit_pagador_flete','intermediario_flete','cuit_intermediario']
      case 3: return ['grano','variedad','declaracion_calidad','campania',
                      'kg_bruto_cargados','kg_tara_cargados','kg_estimados','observaciones']
      case 4: return ['fecha_carga','es_campo_origen','localidad','provincia_origen','descripcion_origen',
                      'renspa','campo','nro_planta','direccion_destino','localidad_destino',
                      'provincia_destino','es_campo_destino','latitud','longitud','gps']
      case 5: return ['contingencia','contingencia_otro','desactivacion','desactivacion_otro']
      case 6: return ['fecha_arribo','fecha_descarga','nro_turno',
                      'kg_bruto_descargados','kg_tara_descargados','localidad_descarga','provincia_descarga']
      default: return []
    }
  }

  const handleGuardarPaso = async () => {
    if (!user?.email) return
    setSaving(true)
    try {
      if (step === 1) {
        const record = await createRecord(form, user.email)
        setRecordId(record.id)
        setCpeId(record.cpe_id)
        setRecordSnap(record)
        try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
        setHasDraft(false)
        setStep(2)
      } else if (recordId && cpeId && recordSnap) {
        const campos = getCamposDePaso(step)
        const changes = Object.fromEntries(
          campos.map(k => [k, (form as Record<string, unknown>)[k] ?? null])
        ) as Partial<CpeRecord>
        await updateRecord(recordId, cpeId, changes, recordSnap, user.email)
        setRecordSnap(prev => prev ? { ...prev, ...changes } : prev)
        if (step < 6) setStep(s => (s + 1) as typeof step)
        else setStep(7)
      }
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Generar CP ────────────────────────────────────────────────

  const CP_REQUIRED: { section: string; fields: (keyof CpeRecord)[]; labels: Record<string, string> }[] = [
    {
      section: 'General',
      fields: ['fecha_carga', 'cupo', 'grano', 'localidad', 'renspa'],
      labels: { fecha_carga: 'Fecha de carga', cupo: 'Cupo', grano: 'Grano', localidad: 'Localidad', renspa: 'RENSPA' },
    },
    {
      section: 'Comercial',
      fields: ['destinatario', 'cuit_destinatario', 'destino', 'cuit_destino'],
      labels: { destinatario: 'Destinatario', cuit_destinatario: 'CUIT Destinatario', destino: 'Destino', cuit_destino: 'CUIT Destino' },
    },
    {
      section: 'Flete',
      fields: ['km', 'provincia_origen', 'provincia_destino'],
      labels: { km: FIELD_LABELS.km, provincia_origen: FIELD_LABELS.provincia_origen, provincia_destino: FIELD_LABELS.provincia_destino },
    },
    {
      section: 'Transporte',
      fields: ['transporte', 'cuit_transporte', 'chofer', 'cuil_chofer', 'chasis'],
      labels: { transporte: 'Transportista', cuit_transporte: 'CUIT Transporte', chofer: 'Chofer', cuil_chofer: 'CUIL Chofer', chasis: 'Patente Chasis' },
    },
  ]

  const validateForCP = (rec: CpeRecord) =>
    CP_REQUIRED
      .map(({ section, fields, labels }) => ({
        section,
        missing: fields.filter(f => !rec[f] && rec[f] !== 0).map(f => labels[f]),
      }))
      .filter(({ missing }) => missing.length > 0)

  const dispararWebhook = async (snap: CpeRecord) => {
    const webhookUrl = (import.meta.env.VITE_N8N_WEBHOOK_CP_URL as string | undefined)?.trim()
      || 'https://coder2026.app.n8n.cloud/webhook/ceibos-solicitud-cp'
    if (!webhookUrl) { show('URL del webhook no configurada', 'error'); return }
    setGenerando(true)
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snap),
      })
      show('Solicitud de CP enviada correctamente', 'success')
    } catch {
      show('Error al enviar la solicitud. Intentá de nuevo.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  const handleGenerarCP = () => {
    if (!recordSnap) return
    const errors = validateForCP(recordSnap)
    if (errors.length > 0) {
      setCpMissing(errors)
      setCpModalOpen(true)
      return
    }
    void dispararWebhook(recordSnap)
  }

  const handleGenerarIgual = () => {
    setCpModalOpen(false)
    if (recordSnap) void dispararWebhook(recordSnap)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Nueva carga" showBack />
      <WizardProgress currentStep={step} />

      {/* Step content */}
      <div className="max-w-mobile md:max-w-desktop mx-auto px-4 pt-36 pb-32 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── STEP 1: TRANSPORTE ── */}
        {step === 1 && (
          <>
            <SectionTitle className="md:col-span-2">Transporte</SectionTitle>
            <button
              type="button"
              onClick={() => setParserOpen(true)}
              className="md:col-span-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-secondary text-secondary font-sans text-sm font-medium mb-4 active:bg-blue-50"
            >
              <MessageSquare className="w-4 h-4" />
              Pegar mensaje WA
            </button>
            <FormField label="Cupo" value={str(form.cupo)} onChange={set('cupo')} required className="md:col-span-2" />
            <CuitField label="CUIT Empresa Transportista" value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} onRazonSocialFound={set('transporte')} />
            <VoiceInput label="Empresa Transportista" value={str(form.transporte)} onChange={set('transporte')} />
            <CuitField label="CUIL Chofer" value={str(form.cuil_chofer)} onChange={set('cuil_chofer')} onRazonSocialFound={set('chofer')} />
            <VoiceInput label="Chofer" value={str(form.chofer)} onChange={set('chofer')} />
            <VoiceInput label="Chasis / Patente" value={str(form.chasis)} onChange={set('chasis')} />
            <VoiceInput label="Acoplado / Patente" value={str(form.acoplado)} onChange={set('acoplado')} />
            <FormField label="Fecha Partida" value={str(form.fecha_partida)} onChange={set('fecha_partida')} type="datetime-local" className="md:col-span-2" />
            <FormField label="Kms. a recorrer" value={str(form.km)} onChange={set('km')} type="number" />
            <FormField label="Tarifa" value={str(form.tarifa)} onChange={set('tarifa')} type="number" />
            <FormField label="N° RUCA" value={str(form.nro_ruca)} onChange={set('nro_ruca')} className="md:col-span-2" />
          </>
        )}

        {/* ── STEP 2: INTERVINIENTES ── */}
        {step === 2 && (
          <>
            <SectionTitle className="md:col-span-2">Intervinientes (Sección A)</SectionTitle>

            {/* Siempre visibles */}
            <CuitField  label="CUIT Titular"                  value={str(form.titular_cuit)}               onChange={set('titular_cuit')}               onRazonSocialFound={set('titular_nombre')} />
            <VoiceInput label="Titular Carta de Porte"        value={str(form.titular_nombre)}             onChange={set('titular_nombre')} />
            <CuitField  label="CUIT Remitente Comercial"      value={str(form.remitente_comercial_cuit)}   onChange={set('remitente_comercial_cuit')}    onRazonSocialFound={set('remitente_comercial_nombre')} />
            <VoiceInput label="Remitente Comercial Productor" value={str(form.remitente_comercial_nombre)} onChange={set('remitente_comercial_nombre')} />

            {/* Roles opcionales — toggles */}
            <div className="md:col-span-2">
              <p className="font-mono text-xs font-medium text-text-muted uppercase tracking-wide px-0.5 mb-2">
                Roles opcionales
              </p>
              <div className="flex flex-wrap gap-2">
                {ROLES_OPCIONALES.map(({ id, label }) => {
                  const active = rolesActivos.has(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleRol(id)}
                      className={`h-8 px-3 rounded-full border font-mono text-xs font-medium transition-colors active:scale-[0.97] ${
                        active
                          ? 'border-secondary bg-secondary text-white'
                          : 'border-gray-light bg-white text-text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campos condicionales por rol */}
            {rolesActivos.has('rte_primaria') && (<>
              <CuitField  label="CUIT Rte. Comercial Venta Primaria"   value={str(form.cuit_rte_venta_primaria)}   onChange={set('cuit_rte_venta_primaria')}   onRazonSocialFound={set('rte_venta_primaria')} />
              <VoiceInput label="Rte. Comercial Venta Primaria"        value={str(form.rte_venta_primaria)}        onChange={set('rte_venta_primaria')} />
            </>)}
            {rolesActivos.has('rte_secundaria') && (<>
              <CuitField  label="CUIT Rte. Comercial Venta Secundaria" value={str(form.cuit_rte_venta_secundaria)} onChange={set('cuit_rte_venta_secundaria')}  onRazonSocialFound={set('rte_venta_secundaria')} />
              <VoiceInput label="Rte. Comercial Venta Secundaria"      value={str(form.rte_venta_secundaria)}      onChange={set('rte_venta_secundaria')} />
            </>)}
            {rolesActivos.has('rte_secundaria2') && (<>
              <CuitField  label="CUIT Rte. Comercial Venta Secundaria 2" value={str(form.cuit_rte_venta_secundaria2)} onChange={set('cuit_rte_venta_secundaria2')} onRazonSocialFound={set('rte_venta_secundaria2')} />
              <VoiceInput label="Rte. Comercial Venta Secundaria 2"    value={str(form.rte_venta_secundaria2)}     onChange={set('rte_venta_secundaria2')} />
            </>)}
            {rolesActivos.has('mercado') && (
              <VoiceInput label="Mercado a Término" value={str(form.mercado_termino)} onChange={set('mercado_termino')} />
            )}
            {rolesActivos.has('corredor_primario') && (<>
              <CuitField  label="CUIT Corredor Venta Primaria"         value={str(form.cuit_corredor_primario)}    onChange={set('cuit_corredor_primario')}    onRazonSocialFound={set('corredor_primario')} />
              <VoiceInput label="Corredor Venta Primaria"              value={str(form.corredor_primario)}         onChange={set('corredor_primario')} />
            </>)}
            {rolesActivos.has('corredor_secundario') && (<>
              <CuitField  label="CUIT Corredor Venta Secundaria"       value={str(form.cuit_corredor_secundario)}  onChange={set('cuit_corredor_secundario')}  onRazonSocialFound={set('corredor_secundario')} />
              <VoiceInput label="Corredor Venta Secundaria"            value={str(form.corredor_secundario)}       onChange={set('corredor_secundario')} />
            </>)}
            {rolesActivos.has('repr_entregador') && (<>
              <CuitField  label="CUIT Representante Entregador"        value={str(form.cuit_repr_entregador)}      onChange={set('cuit_repr_entregador')}      onRazonSocialFound={set('repr_entregador')} />
              <VoiceInput label="Representante Entregador"             value={str(form.repr_entregador)}           onChange={set('repr_entregador')} />
            </>)}
            {rolesActivos.has('repr_recibidor') && (<>
              <CuitField  label="CUIT Representante Recibidor"         value={str(form.cuit_repr_recibidor)}       onChange={set('cuit_repr_recibidor')}       onRazonSocialFound={set('repr_recibidor')} />
              <VoiceInput label="Representante Recibidor"              value={str(form.repr_recibidor)}            onChange={set('repr_recibidor')} />
            </>)}

            {/* Siempre visibles */}
            <CuitField  label="CUIT Destinatario"           value={str(form.cuit_destinatario)} onChange={set('cuit_destinatario')} onRazonSocialFound={set('destinatario')} />
            <VoiceInput label="Destinatario"                value={str(form.destinatario)}      onChange={set('destinatario')} />
            <CuitField  label="CUIT Destino"                value={str(form.cuit_destino)}      onChange={set('cuit_destino')}      onRazonSocialFound={set('destino')} />
            <VoiceInput label="Destino"                     value={str(form.destino)}           onChange={set('destino')} />
            <CuitField  label="CUIT Flete Pagador"          value={str(form.cuit_pagador_flete)} onChange={set('cuit_pagador_flete')} onRazonSocialFound={set('pagador_flete')} />
            <VoiceInput label="Flete Pagador"               value={str(form.pagador_flete)}     onChange={set('pagador_flete')} />
            <CuitField  label="CUIT Intermediario de Flete" value={str(form.cuit_intermediario)} onChange={set('cuit_intermediario')} onRazonSocialFound={set('intermediario_flete')} />
            <VoiceInput label="Intermediario de Flete"      value={str(form.intermediario_flete)} onChange={set('intermediario_flete')} />
          </>
        )}

        {/* ── STEP 3: GRANO / ESPECIE ── */}
        {step === 3 && (
          <>
            <SectionTitle className="md:col-span-2">Grano / Especie (Sección B)</SectionTitle>
            <SelectField label="Grano"    value={str(form.grano)}    onChange={set('grano')}    options={GRANOS} required />
            <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
            <SelectField
              label="Declaración de Calidad"
              value={str(form.declaracion_calidad)}
              onChange={set('declaracion_calidad')}
              options={['conforme', 'condicional']}
              className="md:col-span-2"
            />
            <FormField label="Campaña" value={str(form.campania)} onChange={set('campania')} className="md:col-span-2" />
            <FormField label="Peso Bruto"   value={str(form.kg_bruto_cargados)} onChange={set('kg_bruto_cargados')} type="number" />
            <FormField label="Peso Tara"    value={str(form.kg_tara_cargados)}  onChange={set('kg_tara_cargados')}  type="number" />
            <div className="md:col-span-2"><KgNetoDisplay label="Kg Neto cargados" bruto={str(form.kg_bruto_cargados)} tara={str(form.kg_tara_cargados)} /></div>
            <VoiceInput label="Observaciones" value={str(form.observaciones)} onChange={set('observaciones')} multiline rows={4} className="md:col-span-2" />
          </>
        )}

        {/* ── STEP 4: PROCEDENCIA ── */}
        {step === 4 && (
          <>
            <SectionTitle className="md:col-span-2">Procedencia — Origen (Sección C)</SectionTitle>
            <FormField label="Fecha de carga" value={str(form.fecha_carga)} onChange={set('fecha_carga')} type="date" required className="md:col-span-2" />
            <div className="md:col-span-2 flex items-center gap-3 px-1">
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
            <FormField   label="Localidad"        value={str(form.localidad)}       onChange={set('localidad')}       required />
            <FormField   label="Provincia Origen" value={str(form.provincia_origen)} onChange={set('provincia_origen')} />
            <div className="md:col-span-2"><GPSInput latitud={form.latitud ?? null} longitud={form.longitud ?? null} onChangeCoords={setGps} /></div>
            <FormField label="Dirección" value={str(form.descripcion_origen)} onChange={set('descripcion_origen')} className="md:col-span-2" />
            <FormField label="RENSPA"      value={str(form.renspa)}             onChange={set('renspa')} />
            <FormField   label="Campo"     value={str(form.campo)}              onChange={set('campo')}  required />

            <SectionTitle className="mt-4 md:col-span-2">Destino de la Mercadería (Sección D)</SectionTitle>
            <div className="md:col-span-2 flex items-center gap-3 px-1">
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
            <SectionTitle className="md:col-span-2">Contingencias (Sección F)</SectionTitle>
            <FormField label="Contingencia"  value={str(form.contingencia)}      onChange={set('contingencia')} />
            <FormField label="Otro"          value={str(form.contingencia_otro)} onChange={set('contingencia_otro')} />
            <FormField label="Desactivación" value={str(form.desactivacion)}     onChange={set('desactivacion')} />
            <FormField label="Otro"          value={str(form.desactivacion_otro)} onChange={set('desactivacion_otro')} />
          </>
        )}

        {/* ── STEP 6: DESCARGA ── */}
        {step === 6 && (
          <>
            <SectionTitle className="md:col-span-2">Descarga (Sección G)</SectionTitle>
            <FormField label="Fecha Arribo"   value={str(form.fecha_arribo)}   onChange={set('fecha_arribo')}   type="datetime-local" className="md:col-span-2" />
            <FormField label="Fecha Descarga" value={str(form.fecha_descarga)} onChange={set('fecha_descarga')} type="datetime-local" className="md:col-span-2" />
            <FormField label="N° Turno"        value={str(form.nro_turno)}        onChange={set('nro_turno')} />
            <FormField label="Peso Bruto (kg)" value={str(form.kg_bruto_descargados)} onChange={set('kg_bruto_descargados')} type="number" />
            <FormField label="Peso Tara (kg)"  value={str(form.kg_tara_descargados)}  onChange={set('kg_tara_descargados')}  type="number" />
            <div className="md:col-span-2"><KgNetoDisplay label="Kg Neto descargados" bruto={str(form.kg_bruto_descargados)} tara={str(form.kg_tara_descargados)} /></div>
            <FormField label="Localidad (Descarga)"  value={str(form.localidad_descarga)}  onChange={set('localidad_descarga')} />
            <FormField label="Provincia (Descarga)"  value={str(form.provincia_descarga)}  onChange={set('provincia_descarga')} />
          </>
        )}

        {/* ── STEP 7: RESUMEN ── */}
        {step === 7 && (
          <>
            <SectionTitle className="md:col-span-2">Resumen</SectionTitle>
            {cpeId && (
              <div className="md:col-span-2 px-1 pb-1">
                <span className="font-mono text-xs text-text-muted uppercase tracking-wide">CPE </span>
                <span className="font-mono text-sm font-semibold text-secondary">{cpeId}</span>
              </div>
            )}
            <div className="md:col-span-2 bg-white border border-gray-light rounded-2xl p-4 space-y-2">
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
            <button
              onClick={() => void handleGenerarCP()}
              disabled={generando || !recordSnap}
              className="md:col-span-2 w-full h-12 rounded-xl font-sans font-semibold text-white text-sm active:opacity-80 transition mt-2 disabled:opacity-50"
              style={{ backgroundColor: '#1E3252' }}
            >
              {generando ? 'Enviando…' : 'Generar CP'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="md:col-span-2 w-full h-12 rounded-xl font-sans text-sm text-text-muted border border-gray-light active:bg-gray-50 transition"
            >
              Ir al inicio
            </button>
          </>
        )}
      </div>

      {/* Draft restore bar — only before record is created */}
      {hasDraft && !recordId && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
          <div className="max-w-mobile md:max-w-desktop mx-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-lg text-white"
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
        <div className="max-w-mobile md:max-w-desktop mx-auto flex gap-3">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(s => (s - 1) as typeof s)} className="flex-1">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
          )}
          {step <= 6 && (
            <Button onClick={handleGuardarPaso} loading={saving} className="flex-1 whitespace-nowrap text-sm">
              {step === 1 ? 'Crear cupo' : 'Guardar y continuar'} <ChevronRight className="w-4 h-4 inline-block" />
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
            className="bg-white rounded-t-2xl w-full max-w-mobile md:max-w-desktop p-4 space-y-3 pb-safe"
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

      {/* CP missing fields modal */}
      {cpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setCpModalOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-mobile md:max-w-desktop p-5 space-y-4 pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-mono text-xs text-text-muted uppercase tracking-widest">
              Campos faltantes para el CP
            </p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {cpMissing.map(({ section, missing }) => (
                <div key={section}>
                  <p className="font-mono text-xs font-semibold text-primary uppercase tracking-wide mb-1">{section}</p>
                  <ul className="space-y-0.5 pl-2">
                    {missing.map(m => (
                      <li key={m} className="font-sans text-sm text-text-muted">• {m}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setCpModalOpen(false)}
                className="flex-1 h-12 rounded-xl font-sans text-sm font-medium border border-gray-light text-text-muted active:bg-gray-50"
              >
                Seguir completando
              </button>
              <button
                onClick={handleGenerarIgual}
                disabled={generando}
                className="flex-1 h-12 rounded-xl font-sans text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#1E3252' }}
              >
                {generando ? 'Enviando…' : 'Generar igual'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
