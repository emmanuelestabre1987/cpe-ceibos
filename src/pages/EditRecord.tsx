import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save } from 'lucide-react'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import { FormField, SelectField } from '../components/forms/FormField'
import CuitField from '../components/forms/CuitField'
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

export default function EditRecord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [original, setOriginal] = useState<CpeRecord | null>(null)
  const [form, setForm] = useState<RecordFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Roles opcionales Intervinientes
  const [rolesActivos, setRolesActivos] = useState(new Set<string>())
  const { show, ToastComponent } = useToast()

  useEffect(() => {
    if (!id) return
    getRecord(id)
      .then((rec) => {
        setOriginal(rec)
        if (rec) {
          const { id: _id, cpe_id: _cpe, status: _s, created_by: _cb, created_at: _ca, updated_at: _ua, ...rest } = rec
          setForm(rest as RecordFormData)
          // Inicializar toggles de roles opcionales según los datos del registro
          const active = new Set<string>()
          if (str(rec.rte_venta_primaria)    || str(rec.cuit_rte_venta_primaria))    active.add('rte_primaria')
          if (str(rec.rte_venta_secundaria)  || str(rec.cuit_rte_venta_secundaria))  active.add('rte_secundaria')
          if (str(rec.rte_venta_secundaria2) || str(rec.cuit_rte_venta_secundaria2)) active.add('rte_secundaria2')
          if (str(rec.mercado_termino))                                               active.add('mercado')
          if (str(rec.corredor_primario)     || str(rec.cuit_corredor_primario))      active.add('corredor_primario')
          if (str(rec.corredor_secundario)   || str(rec.cuit_corredor_secundario))    active.add('corredor_secundario')
          if (str(rec.repr_entregador)       || str(rec.cuit_repr_entregador))        active.add('repr_entregador')
          if (str(rec.repr_recibidor)        || str(rec.cuit_repr_recibidor))         active.add('repr_recibidor')
          setRolesActivos(active)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        setLoadError((err as Error).message ?? 'Error al cargar el registro')
        setLoading(false)
      })
  }, [id])

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
        <div className="max-w-mobile md:max-w-desktop mx-auto px-4 pt-20 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-light animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (loadError || !form) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Error" showBack accentColor="#FF6C02" />
        <div className="max-w-mobile md:max-w-desktop mx-auto px-4 pt-20 text-center">
          <p className="font-sans text-red-600 text-sm">{loadError ?? 'Registro no encontrado'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={`Editar ${original?.cpe_id ?? ''}`} showBack accentColor="#FF6C02" />

      <div className="max-w-mobile md:max-w-desktop mx-auto px-4 pt-20 pb-32 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── TRANSPORTE ── */}
        <SectionTitle className="md:col-span-2">Transporte</SectionTitle>
        <FormField label="Cupo" value={str(form.cupo)} onChange={set('cupo')} className="md:col-span-2" />
        <VoiceInput label="Empresa Transportista" value={str(form.transporte)} onChange={set('transporte')} />
        <FormField label="CUIT Empresa Transportista" value={str(form.cuit_transporte)} onChange={set('cuit_transporte')} />
        <VoiceInput label="Chofer" value={str(form.chofer)} onChange={set('chofer')} />
        <FormField label="CUIL Chofer" value={str(form.cuil_chofer)} onChange={set('cuil_chofer')} />
        <VoiceInput label="Chasis / Patente" value={str(form.chasis)} onChange={set('chasis')} />
        <VoiceInput label="Acoplado / Patente" value={str(form.acoplado)} onChange={set('acoplado')} />
        <FormField label="Fecha Partida" value={str(form.fecha_partida)} onChange={set('fecha_partida')} type="datetime-local" className="md:col-span-2" />
        <FormField label="Kms. a recorrer" value={str(form.km)} onChange={set('km')} type="number" />
        <FormField label="Tarifa" value={str(form.tarifa)} onChange={set('tarifa')} type="number" />
        <FormField label="N° RUCA" value={str(form.nro_ruca)} onChange={set('nro_ruca')} className="md:col-span-2" />

        {/* ── INTERVINIENTES ── */}
        <SectionTitle className="mt-4 md:col-span-2">Intervinientes (Sección A)</SectionTitle>

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
          <CuitField  label="CUIT Rte. Comercial Venta Primaria"     value={str(form.cuit_rte_venta_primaria)}    onChange={set('cuit_rte_venta_primaria')}    onRazonSocialFound={set('rte_venta_primaria')} />
          <VoiceInput label="Rte. Comercial Venta Primaria"          value={str(form.rte_venta_primaria)}         onChange={set('rte_venta_primaria')} />
        </>)}
        {rolesActivos.has('rte_secundaria') && (<>
          <CuitField  label="CUIT Rte. Comercial Venta Secundaria"   value={str(form.cuit_rte_venta_secundaria)}  onChange={set('cuit_rte_venta_secundaria')}   onRazonSocialFound={set('rte_venta_secundaria')} />
          <VoiceInput label="Rte. Comercial Venta Secundaria"        value={str(form.rte_venta_secundaria)}       onChange={set('rte_venta_secundaria')} />
        </>)}
        {rolesActivos.has('rte_secundaria2') && (<>
          <CuitField  label="CUIT Rte. Comercial Venta Secundaria 2" value={str(form.cuit_rte_venta_secundaria2)} onChange={set('cuit_rte_venta_secundaria2')}  onRazonSocialFound={set('rte_venta_secundaria2')} />
          <VoiceInput label="Rte. Comercial Venta Secundaria 2"      value={str(form.rte_venta_secundaria2)}      onChange={set('rte_venta_secundaria2')} />
        </>)}
        {rolesActivos.has('mercado') && (
          <VoiceInput label="Mercado a Término" value={str(form.mercado_termino)} onChange={set('mercado_termino')} className="md:col-span-2" />
        )}
        {rolesActivos.has('corredor_primario') && (<>
          <CuitField  label="CUIT Corredor Venta Primaria" value={str(form.cuit_corredor_primario)}    onChange={set('cuit_corredor_primario')}    onRazonSocialFound={set('corredor_primario')} />
          <VoiceInput label="Corredor Venta Primaria"      value={str(form.corredor_primario)}         onChange={set('corredor_primario')} />
        </>)}
        {rolesActivos.has('corredor_secundario') && (<>
          <CuitField  label="CUIT Corredor Venta Secundaria" value={str(form.cuit_corredor_secundario)}  onChange={set('cuit_corredor_secundario')}  onRazonSocialFound={set('corredor_secundario')} />
          <VoiceInput label="Corredor Venta Secundaria"      value={str(form.corredor_secundario)}       onChange={set('corredor_secundario')} />
        </>)}
        {rolesActivos.has('repr_entregador') && (<>
          <CuitField  label="CUIT Representante Entregador" value={str(form.cuit_repr_entregador)} onChange={set('cuit_repr_entregador')} onRazonSocialFound={set('repr_entregador')} />
          <VoiceInput label="Representante Entregador"      value={str(form.repr_entregador)}      onChange={set('repr_entregador')} />
        </>)}
        {rolesActivos.has('repr_recibidor') && (<>
          <CuitField  label="CUIT Representante Recibidor" value={str(form.cuit_repr_recibidor)}  onChange={set('cuit_repr_recibidor')}  onRazonSocialFound={set('repr_recibidor')} />
          <VoiceInput label="Representante Recibidor"      value={str(form.repr_recibidor)}       onChange={set('repr_recibidor')} />
        </>)}

        {/* Siempre visibles — parte inferior */}
        <CuitField  label="CUIT Destinatario"           value={str(form.cuit_destinatario)}   onChange={set('cuit_destinatario')}   onRazonSocialFound={set('destinatario')} />
        <VoiceInput label="Destinatario"                value={str(form.destinatario)}        onChange={set('destinatario')} />
        <CuitField  label="CUIT Destino"                value={str(form.cuit_destino)}        onChange={set('cuit_destino')}        onRazonSocialFound={set('destino')} />
        <VoiceInput label="Destino"                     value={str(form.destino)}             onChange={set('destino')} />
        <CuitField  label="CUIT Flete Pagador"          value={str(form.cuit_pagador_flete)}  onChange={set('cuit_pagador_flete')}  onRazonSocialFound={set('pagador_flete')} />
        <VoiceInput label="Flete Pagador"               value={str(form.pagador_flete)}       onChange={set('pagador_flete')} />
        <CuitField  label="CUIT Intermediario de Flete" value={str(form.cuit_intermediario)}  onChange={set('cuit_intermediario')}  onRazonSocialFound={set('intermediario_flete')} />
        <VoiceInput label="Intermediario de Flete"      value={str(form.intermediario_flete)} onChange={set('intermediario_flete')} />

        {/* ── GRANO / ESPECIE ── */}
        <SectionTitle className="mt-4 md:col-span-2">Grano / Especie (Sección B)</SectionTitle>
        <SelectField label="Grano"    value={str(form.grano)}    onChange={set('grano')}    options={GRANOS} />
        <SelectField label="Variedad" value={str(form.variedad)} onChange={set('variedad')} options={VARIEDADES} />
        <SelectField
          label="Declaración de Calidad"
          value={str(form.declaracion_calidad)}
          onChange={set('declaracion_calidad')}
          options={['conforme', 'condicional']}
          className="md:col-span-2"
        />
        <FormField label="Campaña"      value={str(form.campania)}          onChange={set('campania')} className="md:col-span-2" />
        <FormField label="Peso Bruto"   value={str(form.kg_bruto_cargados)} onChange={set('kg_bruto_cargados')} type="number" />
        <FormField label="Peso Tara"    value={str(form.kg_tara_cargados)}  onChange={set('kg_tara_cargados')}  type="number" />
        <VoiceInput label="Observaciones" value={str(form.observaciones)} onChange={set('observaciones')} multiline rows={4} className="md:col-span-2" />

        {/* ── PROCEDENCIA (C) ── */}
        <SectionTitle className="mt-4 md:col-span-2">Procedencia — Origen (Sección C)</SectionTitle>
        <FormField label="Fecha de carga" value={str(form.fecha_carga)} onChange={set('fecha_carga')} type="date" className="md:col-span-2" />
        <div className="md:col-span-2 flex items-center gap-3 px-1">
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
        <div className="md:col-span-2"><GPSInput latitud={form.latitud ?? null} longitud={form.longitud ?? null} onChangeCoords={setGps} /></div>
        <FormField label="Dirección" value={str(form.descripcion_origen)} onChange={set('descripcion_origen')} className="md:col-span-2" />
        <FormField label="RENSPA"      value={str(form.renspa)}             onChange={set('renspa')} />
        <FormField   label="Campo"     value={str(form.campo)}              onChange={set('campo')} />

        {/* ── DESTINO (D) ── */}
        <SectionTitle className="mt-4 md:col-span-2">Destino de la Mercadería (Sección D)</SectionTitle>
        <div className="md:col-span-2 flex items-center gap-3 px-1">
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
        <SectionTitle className="mt-4 md:col-span-2">Contingencias (Sección F)</SectionTitle>
        <FormField label="Contingencia"  value={str(form.contingencia)}      onChange={set('contingencia')} />
        <FormField label="Otro"          value={str(form.contingencia_otro)} onChange={set('contingencia_otro')} />
        <FormField label="Desactivación" value={str(form.desactivacion)}     onChange={set('desactivacion')} />
        <FormField label="Otro"          value={str(form.desactivacion_otro)} onChange={set('desactivacion_otro')} />

        {/* ── DESCARGA (G) ── */}
        <SectionTitle className="mt-4 md:col-span-2">Descarga (Sección G)</SectionTitle>
        <FormField label="Fecha Arribo"   value={str(form.fecha_arribo)}   onChange={set('fecha_arribo')}   type="datetime-local" className="md:col-span-2" />
        <FormField label="Fecha Descarga" value={str(form.fecha_descarga)} onChange={set('fecha_descarga')} type="datetime-local" className="md:col-span-2" />
        <FormField label="N° Turno"        value={str(form.nro_turno)}        onChange={set('nro_turno')} />
        <FormField label="Peso Bruto (kg)" value={str(form.kg_bruto_descargados)} onChange={set('kg_bruto_descargados')} type="number" />
        <FormField label="Peso Tara (kg)"  value={str(form.kg_tara_descargados)}  onChange={set('kg_tara_descargados')}  type="number" />
        <FormField label="Localidad (Descarga)"  value={str(form.localidad_descarga)}  onChange={set('localidad_descarga')} />
        <FormField label="Provincia (Descarga)"  value={str(form.provincia_descarga)}  onChange={set('provincia_descarga')} />
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
        <div className="max-w-mobile md:max-w-desktop mx-auto">
          <Button fullWidth variant="accent" size="lg" loading={saving} onClick={handleSave}>
            <Save className="w-5 h-5" /> Guardar cambios
          </Button>
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}
