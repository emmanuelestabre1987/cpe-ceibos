import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import SectionTitle from '../components/ui/SectionTitle'
import { FormField, SelectField } from '../components/forms/FormField'
import { useToast } from '../components/ui/Toast'
import { getRecord, updateRecord } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { GRANOS, LOCALIDADES } from '../types'
import type { CpeRecord } from '../types'

export default function AsignarDatos() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { show, ToastComponent } = useToast()

  const [records, setRecords] = useState<CpeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const [fecha_carga,       setFechaCarga]      = useState('')
  const [grano,             setGrano]           = useState('')
  const [localidad,         setLocalidad]       = useState('')
  const [destinatario,      setDestinatario]    = useState('')
  const [cuit_destinatario, setCuitDestinatario]= useState('')
  const [destino,           setDestino]         = useState('')
  const [kg_estimados,      setKgEstimados]     = useState('')

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

  const handleGuardar = async () => {
    if (!user?.email) return
    setSaving(true)

    const changes: Partial<CpeRecord> = {}
    if (fecha_carga)       changes.fecha_carga       = fecha_carga
    if (grano)             changes.grano             = grano
    if (localidad)         changes.localidad         = localidad
    if (destinatario)      changes.destinatario      = destinatario
    if (cuit_destinatario) changes.cuit_destinatario = cuit_destinatario
    if (destino)           changes.destino           = destino
    if (kg_estimados)      changes.kg_estimados      = parseFloat(kg_estimados) || null

    if (Object.keys(changes).length === 0) {
      show('No hay campos para guardar', 'info')
      setSaving(false)
      return
    }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Asignación de datos" showBack />
        <div className="max-w-mobile mx-auto px-4 pt-20 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-white rounded-xl border border-gray-light animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header title="Asignación de datos" showBack />

      <div className="max-w-mobile mx-auto px-4 space-y-4 pt-20">

        <SectionTitle>
          {records.length} {records.length === 1 ? 'cupo seleccionado' : 'cupos seleccionados'}
        </SectionTitle>

        <div className="bg-white border border-gray-light rounded-2xl divide-y divide-gray-light">
          {records.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <p className="font-mono text-sm font-bold text-primary truncate">
                {r.cupo ?? r.cpe_id}
              </p>
              <span
                className="shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-semibold text-white"
                style={{ backgroundColor: '#2C9FC0' }}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>

        <SectionTitle>Datos del cupo</SectionTitle>

        <p className="font-sans text-xs text-text-muted -mt-2">
          Solo se actualizan los campos que completes. Los campos vacíos no se modifican.
        </p>

        <FormField
          label="Fecha de carga"
          value={fecha_carga}
          onChange={setFechaCarga}
          type="date"
        />
        <SelectField
          label="Grano"
          value={grano}
          onChange={setGrano}
          options={GRANOS}
        />
        <SelectField
          label="Localidad"
          value={localidad}
          onChange={setLocalidad}
          options={LOCALIDADES}
        />
        <FormField
          label="Destinatario"
          value={destinatario}
          onChange={setDestinatario}
        />
        <FormField
          label="CUIT Destinatario"
          value={cuit_destinatario}
          onChange={setCuitDestinatario}
        />
        <FormField
          label="Destino"
          value={destino}
          onChange={setDestino}
        />
        <FormField
          label="Kg Estimados"
          value={kg_estimados}
          onChange={setKgEstimados}
          type="number"
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-light px-4 py-3 pb-safe">
        <div className="max-w-mobile mx-auto">
          <Button
            onClick={handleGuardar}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Guardando…' : `Guardar datos en ${records.length} cupos`}
          </Button>
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}
