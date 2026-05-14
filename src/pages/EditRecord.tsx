import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save } from 'lucide-react'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import { FormField, SelectField } from '../components/forms/FormField'
import VoiceInput from '../components/forms/VoiceInput'
import GPSInput from '../components/forms/GPSInput'
import SectionTitle from '../components/ui/SectionTitle'
import { useToast } from '../components/ui/Toast'
import { getRecord, updateRecord } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { CAMPOS, GRANOS, VARIEDADES, type CpeRecord, type RecordFormData } from '../types'

function str(val: string | number | null | undefined) {
  return val === null || val === undefined ? '' : String(val)
}

export default function EditRecord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [original, setOriginal] = useState<CpeRecord | null>(null)
  const [form, setForm] = useState<RecordFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { show, ToastComponent } = useToast()

  useEffect(() => {
    if (!id) return
    getRecord(id)
      .then((rec) => {
        setOriginal(rec)
        if (rec) {
          const { id: _id, cpe_id: _cpe, status: _s, created_by: _cb, created_at: _ca, updated_at: _ua, ...rest } = rec
          setForm(rest as RecordFormData)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        setLoadError((err as Error).message ?? 'Error al cargar el registro')
        setLoading(false)
      })
  }, [id])

  const set = (field: keyof RecordFormData) => (val: string) => {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [field]: field === 'km' || field === 'tarifa' || field.startsWith('kg_')
          ? (val === '' ? null : Number(val))
          : val,
      }
    })
  }

  const setBool = (field: keyof RecordFormData) => (val: boolean) => {
    setForm((prev) => {
      if (!prev) return prev
      return { ...prev, [field]: val }
    })
  }

  const setGps = (lat: number, lng: number) => {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        latitud: lat,
        longitud: lng,
        gps: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      }
    })
  }

  const handleSave = async () => {
    if (!user?.email || !original || !form || !id) return
    setSaving(true)
    try {
      await updateRecord(id, original.cpe_id, form as Partial<RecordFormData>, original, user.email)
      navigate(`/registro/${id}`, { replace: true })
    } catch (e) {
      show((e as Error).message, 'error')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Cargando…" showBack accentColor="#FF6C02" />
        <div className="max-w-mobile mx-auto px-4 pt-20 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-light animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (loadError || !form) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Error" showBack accentColor="#FF6C02" />
        <div className="max-w-mobile mx-auto px-4 pt-20 text-center">
          <p className="font-sans text-red-600 text-sm">{loadError ?? 'Registro no encontrado'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={`Editar ${original?.cpe_id ?? ''}`} showBack accentColor="#FF6C02" />

      <div className="max-w-mobile mx-auto px-4 pt-20 pb-32 space-y-4">

        {/* ── TRANSPORTE ── */}
        <SectionTitle>Transporte</SectionTitle>
        <FormField label="Cupo" value={str(form.cupo)} onChange={set('cupo')} />
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

        {/* ── INTERVINIENTES ── */}
        <SectionTitle className="mt-4">Intervinientes (Sección A)</SectionTitle>
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

        {/* ── GRANO / ESPECIE ── */}
        <SectionTitle className="mt-4">Grano / Especie (Sección B)</SectionTitle>
        <SelectField label="Grano"    value={str(form.grano)}    onChange={set('grano')}    options={GRANOS} />
        <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
        <SelectField
          label="Declaración de Calidad"
          value={str(form.declaracion_calidad)}
          onChange={set('declaracion_calidad')}
          options={['conforme', 'condicional']}
        />
        <FormField label="Campaña"      value={str(form.campania)}          onChange={set('campania')} />
        <FormField label="Peso Bruto"   value={str(form.kg_bruto_cargados)} onChange={set('kg_bruto_cargados')} type="number" />
        <FormField label="Peso Tara"    value={str(form.kg_tara_cargados)}  onChange={set('kg_tara_cargados')}  type="number" />
        <VoiceInput label="Observaciones" value={str(form.observaciones)} onChange={set('observaciones')} multiline rows={4} />

        {/* ── PROCEDENCIA (C) ── */}
        <SectionTitle className="mt-4">Procedencia — Origen (Sección C)</SectionTitle>
        <FormField label="Fecha de carga" value={str(form.fecha_carga)} onChange={set('fecha_carga')} type="date" />
        <div className="flex items-center gap-3 px-1">
          <input
            type="checkbox"
            id="edit_es_campo_origen"
            checked={form.es_campo_origen ?? false}
            onChange={e => setBool('es_campo_origen')(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: '#2C9FC0' }}
          />
          <label htmlFor="edit_es_campo_origen" className="font-mono text-xs font-medium text-primary uppercase tracking-wide cursor-pointer">
            Es un campo
          </label>
        </div>
        <FormField   label="Localidad"        value={str(form.localidad)}       onChange={set('localidad')} />
        <FormField   label="Provincia Origen" value={str(form.provincia_origen)} onChange={set('provincia_origen')} />
        <GPSInput latitud={form.latitud ?? null} longitud={form.longitud ?? null} onChangeCoords={setGps} />
        <FormField label="Dirección" value={str(form.descripcion_origen)} onChange={set('descripcion_origen')} />
        <FormField label="RENSPA"      value={str(form.renspa)}             onChange={set('renspa')} />
        <SelectField label="Campo"     value={str(form.campo)}              onChange={set('campo')}  options={CAMPOS} />

        {/* ── DESTINO (D) ── */}
        <SectionTitle className="mt-4">Destino de la Mercadería (Sección D)</SectionTitle>
        <div className="flex items-center gap-3 px-1">
          <input
            type="checkbox"
            id="edit_es_campo_destino"
            checked={form.es_campo_destino ?? false}
            onChange={e => setBool('es_campo_destino')(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: '#2C9FC0' }}
          />
          <label htmlFor="edit_es_campo_destino" className="font-mono text-xs font-medium text-primary uppercase tracking-wide cursor-pointer">
            Es un campo (Destino)
          </label>
        </div>
        <FormField label="N° Planta"           value={str(form.nro_planta)}        onChange={set('nro_planta')} />
        <FormField label="Dirección"           value={str(form.direccion_destino)} onChange={set('direccion_destino')} />
        <FormField label="Localidad (Destino)" value={str(form.localidad_destino)} onChange={set('localidad_destino')} />
        <FormField label="Provincia Destino"   value={str(form.provincia_destino)} onChange={set('provincia_destino')} />

        {/* ── CONTINGENCIAS (F) ── */}
        <SectionTitle className="mt-4">Contingencias (Sección F)</SectionTitle>
        <FormField label="Contingencia"  value={str(form.contingencia)}      onChange={set('contingencia')} />
        <FormField label="Otro"          value={str(form.contingencia_otro)} onChange={set('contingencia_otro')} />
        <FormField label="Desactivación" value={str(form.desactivacion)}     onChange={set('desactivacion')} />
        <FormField label="Otro"          value={str(form.desactivacion_otro)} onChange={set('desactivacion_otro')} />

        {/* ── DESCARGA (G) ── */}
        <SectionTitle className="mt-4">Descarga (Sección G)</SectionTitle>
        <FormField label="Fecha Arribo"   value={str(form.fecha_arribo)}   onChange={set('fecha_arribo')}   type="datetime-local" />
        <FormField label="Fecha Descarga" value={str(form.fecha_descarga)} onChange={set('fecha_descarga')} type="datetime-local" />
        <FormField label="N° Turno"        value={str(form.nro_turno)}        onChange={set('nro_turno')} />
        <FormField label="Peso Bruto (kg)" value={str(form.kg_bruto_descargados)} onChange={set('kg_bruto_descargados')} type="number" />
        <FormField label="Peso Tara (kg)"  value={str(form.kg_tara_descargados)}  onChange={set('kg_tara_descargados')}  type="number" />
        <FormField label="Localidad (Descarga)"  value={str(form.localidad_descarga)}  onChange={set('localidad_descarga')} />
        <FormField label="Provincia (Descarga)"  value={str(form.provincia_descarga)}  onChange={set('provincia_descarga')} />
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
        <div className="max-w-mobile mx-auto">
          <Button fullWidth variant="accent" size="lg" loading={saving} onClick={handleSave}>
            <Save className="w-5 h-5" /> Guardar cambios
          </Button>
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}
