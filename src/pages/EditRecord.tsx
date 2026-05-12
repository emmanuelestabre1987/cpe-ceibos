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
import { CAMPOS, GRANOS, VARIEDADES, LOCALIDADES, type CpeRecord, type RecordFormData } from '../types'

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
      <Header
        title={`Editar ${original?.cpe_id ?? ''}`}
        showBack
        accentColor="#FF6C02"
      />

      <div className="max-w-mobile mx-auto px-4 pt-20 pb-32 space-y-4">
        <SectionTitle>General</SectionTitle>
        <FormField label="Fecha de carga" value={str(form.fecha_carga)} onChange={set('fecha_carga')} type="date" />
        <SelectField label="Campo" value={str(form.campo)} onChange={set('campo')} options={CAMPOS} />
        <SelectField label="Localidad" value={str(form.localidad)} onChange={set('localidad')} options={LOCALIDADES} />
        <SelectField label="Grano" value={str(form.grano)} onChange={set('grano')} options={GRANOS} />
        <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
        <SelectField
          label="Declaración de Calidad"
          value={str(form.declaracion_calidad)}
          onChange={set('declaracion_calidad')}
          options={['conforme', 'condicional']}
        />
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
        <FormField label="Descripción" value={str(form.descripcion_origen)} onChange={set('descripcion_origen')} />

        <SectionTitle className="mt-4">Comercial</SectionTitle>
        <VoiceInput label="Titular Carta de Porte" value={str(form.titular_nombre)} onChange={set('titular_nombre')} />
        <FormField label="CUIT Titular" value={str(form.titular_cuit)} onChange={set('titular_cuit')} />
        <VoiceInput label="Remitente Comercial Productor" value={str(form.remitente_comercial_nombre)} onChange={set('remitente_comercial_nombre')} />
        <FormField label="CUIT Remitente Comercial" value={str(form.remitente_comercial_cuit)} onChange={set('remitente_comercial_cuit')} />
        <VoiceInput label="Destinatario" value={str(form.destinatario)} onChange={set('destinatario')} />
        <FormField label="CUIT Destinatario" value={str(form.cuit_destinatario)} onChange={set('cuit_destinatario')} />
        <VoiceInput label="Destino" value={str(form.destino)} onChange={set('destino')} />
        <FormField label="CUIT Destino" value={str(form.cuit_destino)} onChange={set('cuit_destino')} />
        <VoiceInput label="Rte. Comercial Venta Primaria" value={str(form.rte_venta_primaria)} onChange={set('rte_venta_primaria')} />
        <VoiceInput label="Rte. Comercial Venta Secundaria" value={str(form.rte_venta_secundaria)} onChange={set('rte_venta_secundaria')} />
        <VoiceInput label="Rte. Comercial Venta Secundaria 2" value={str(form.rte_venta_secundaria2)} onChange={set('rte_venta_secundaria2')} />
        <VoiceInput label="Mercado a Término" value={str(form.mercado_termino)} onChange={set('mercado_termino')} />
        <VoiceInput label="Corredor Venta Primaria" value={str(form.corredor_primario)} onChange={set('corredor_primario')} />
        <VoiceInput label="Corredor Venta Secundaria" value={str(form.corredor_secundario)} onChange={set('corredor_secundario')} />
        <VoiceInput label="Representante Entregador" value={str(form.repr_entregador)} onChange={set('repr_entregador')} />
        <VoiceInput label="Representante Recibidor" value={str(form.repr_recibidor)} onChange={set('repr_recibidor')} />

        <SectionTitle className="mt-4">Flete</SectionTitle>
        <FormField label="Kms. a recorrer" value={str(form.km)} onChange={set('km')} type="number" />
        <FormField label="Tarifa" value={str(form.tarifa)} onChange={set('tarifa')} type="number" />
        <VoiceInput label="Flete Pagador" value={str(form.pagador_flete)} onChange={set('pagador_flete')} />
        <VoiceInput label="Cupo" value={str(form.cupo)} onChange={set('cupo')} />
        <VoiceInput label="Intermediario de Flete" value={str(form.intermediario_flete)} onChange={set('intermediario_flete')} />
        <FormField label="CUIL Intermediario" value={str(form.cuil_intermediario)} onChange={set('cuil_intermediario')} />
        <FormField label="Provincia Origen" value={str(form.provincia_origen)} onChange={set('provincia_origen')} />
        <FormField label="Provincia Destino" value={str(form.provincia_destino)} onChange={set('provincia_destino')} />
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
        <FormField label="Dirección" value={str(form.direccion_destino)} onChange={set('direccion_destino')} />
        <VoiceInput label="Observaciones" value={str(form.observaciones)} onChange={set('observaciones')} multiline rows={4} />

        <SectionTitle className="mt-4">Transporte</SectionTitle>
        <VoiceInput label="Empresa Transportista" value={str(form.transporte)} onChange={set('transporte')} />
        <FormField label="CUIT Empresa Transportista" value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} />
        <VoiceInput label="Chofer" value={str(form.chofer)} onChange={set('chofer')} />
        <FormField label="CUIL Chofer" value={str(form.cuil_chofer)} onChange={set('cuil_chofer')} />
        <VoiceInput label="Chasis / Patente" value={str(form.chasis)} onChange={set('chasis')} />
        <VoiceInput label="Acoplado / Patente" value={str(form.acoplado)} onChange={set('acoplado')} />
        <FormField label="Fecha Partida" value={str(form.fecha_partida)} onChange={set('fecha_partida')} type="datetime-local" />

        <SectionTitle className="mt-4">Pesaje — Cargados</SectionTitle>
        <FormField label="Kg Bruto" value={str(form.kg_bruto_cargados)} onChange={set('kg_bruto_cargados')} type="number" />
        <FormField label="Kg Tara" value={str(form.kg_tara_cargados)} onChange={set('kg_tara_cargados')} type="number" />
        <FormField label="Kg Estimados" value={str(form.kg_estimados)} onChange={set('kg_estimados')} type="number" />

        <SectionTitle className="mt-4">Pesaje — Descargados</SectionTitle>
        <FormField label="Kg Bruto" value={str(form.kg_bruto_descargados)} onChange={set('kg_bruto_descargados')} type="number" />
        <FormField label="Kg Tara" value={str(form.kg_tara_descargados)} onChange={set('kg_tara_descargados')} type="number" />

        <SectionTitle className="mt-4">Cierre</SectionTitle>
        <VoiceInput label="N° RUCA" value={str(form.nro_ruca)} onChange={set('nro_ruca')} />
        <GPSInput latitud={form.latitud ?? null} longitud={form.longitud ?? null} onChangeCoords={setGps} />
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
        <div className="max-w-mobile mx-auto">
          <Button
            fullWidth
            variant="accent"
            size="lg"
            loading={saving}
            onClick={handleSave}
          >
            <Save className="w-5 h-5" /> Guardar cambios
          </Button>
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}
