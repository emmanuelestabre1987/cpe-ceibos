import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Truck, MessageSquare } from 'lucide-react'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import SectionTitle from '../components/ui/SectionTitle'
import { FormField } from '../components/forms/FormField'
import { useToast } from '../components/ui/Toast'
import { getRecord, updateRecord, updateCupoStatus } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { validarCuit, formatearCuit, normalizarCuit } from '../lib/validarCuit'
import { parseTransporteMsg } from '../lib/transporteParser'
import type { CpeRecord } from '../types'

export default function AsignarTransporte() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { show, ToastComponent } = useToast()

  const [records,  setRecords]  = useState<CpeRecord[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [cuitErrors, setCuitErrors] = useState<{ cuit_transporte?: string; cuil_chofer?: string }>({})

  // Form fields
  const [transporte,      setTransporte]     = useState('')
  const [cuit_transporte, setCuitTransporte] = useState('')
  const [chofer,          setChofer]         = useState('')
  const [cuil_chofer,     setCuilChofer]     = useState('')
  const [chasis,          setChasis]         = useState('')
  const [acoplado,        setAcoplado]       = useState('')
  const [parserOpen,      setParserOpen]     = useState(false)
  const [parserText,      setParserText]     = useState('')

  // ── Fetch records ─────────────────────────────────────────────

  useEffect(() => {
    const raw = searchParams.get('ids') ?? ''
    const ids = raw.split(',').filter(Boolean)
    if (ids.length === 0) { navigate('/'); return }

    setLoading(true)
    Promise.all(ids.map(id => getRecord(id)))
      .then(results => {
        const valid = results.filter((r): r is CpeRecord => r !== null && (r.status === 'IMPORTADO' || r.status === 'TRANSPORTE'))
        if (valid.length === 0) { navigate('/'); return }
        setRecords(valid)
      })
      .catch(() => show('Error al cargar cupos', 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── CUIT/CUIL validation ──────────────────────────────────────

  const validateCuitTransporte = () => {
    if (!cuit_transporte) { setCuitErrors(p => ({ ...p, cuit_transporte: undefined })); return }
    setCuitErrors(p => ({
      ...p,
      cuit_transporte: validarCuit(cuit_transporte) ? undefined : 'CUIT inválido',
    }))
  }

  const validateCuilChofer = () => {
    if (!cuil_chofer) { setCuitErrors(p => ({ ...p, cuil_chofer: undefined })); return }
    setCuitErrors(p => ({
      ...p,
      cuil_chofer: validarCuit(cuil_chofer) ? undefined : 'CUIL inválido',
    }))
  }

  const hasErrors = !!(cuitErrors.cuit_transporte || cuitErrors.cuil_chofer)

  const handleParseTransporte = () => {
    const result = parseTransporteMsg(parserText)
    if (result.transporte)      setTransporte(result.transporte)
    if (result.cuit_transporte) setCuitTransporte(result.cuit_transporte)
    if (result.chofer)          setChofer(result.chofer)
    if (result.cuil_chofer)     setCuilChofer(result.cuil_chofer)
    if (result.chasis)          setChasis(result.chasis)
    if (result.acoplado)        setAcoplado(result.acoplado)
    setParserOpen(false)
    setParserText('')
    if (result.missing.length > 0) {
      show(`No se detectaron: ${result.missing.join(', ')}. Completá manualmente.`, 'info')
    }
  }

  // ── Save ──────────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!user?.email || hasErrors) return
    setSaving(true)

    const cuit = cuit_transporte ? formatearCuit(normalizarCuit(cuit_transporte)) : null
    const cuil = cuil_chofer     ? formatearCuit(normalizarCuit(cuil_chofer))     : null

    const changes = {
      transporte:      transporte      || null,
      cuit_transporte: cuit,
      chofer:          chofer          || null,
      cuil_chofer:     cuil,
      chasis:          chasis          || null,
      acoplado:        acoplado        || null,
    }

    try {
      await Promise.all(
        records.map(async (r) => {
          await updateRecord(r.id, r.cpe_id, changes, r, user.email!)
          await updateCupoStatus(r.cpe_id, 'TRANSPORTE', user.email!)
        })
      )
      show(`Transporte asignado a ${records.length} cupos`, 'success')
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
        <div className="max-w-mobile md:max-w-desktop mx-auto px-4 pt-20 space-y-3">
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

      <div className="max-w-mobile md:max-w-desktop mx-auto px-4 space-y-4 pt-20">

        {/* Summary of selected cupos */}
        <SectionTitle>
          {records.length} {records.length === 1 ? 'cupo seleccionado' : 'cupos seleccionados'}
        </SectionTitle>

        <div className="bg-white border border-gray-light rounded-2xl divide-y divide-gray-light">
          {records.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-primary truncate">
                  {r.cupo ?? r.cpe_id}
                </p>
                <p className="font-sans text-xs text-text-muted truncate">
                  {[r.grano, r.destinatario].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span
                className="shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-semibold text-white"
                style={{ backgroundColor: '#2C9FC0' }}
              >
                IMPORTADO
              </span>
            </div>
          ))}
        </div>

        {/* Transport form */}
        <SectionTitle>Datos del transporte</SectionTitle>

        <button
          type="button"
          onClick={() => setParserOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-secondary text-secondary font-sans text-sm font-medium active:bg-blue-50"
        >
          <MessageSquare className="w-4 h-4" />
          Pegar mensaje WA
        </button>

        <FormField label="Transporte" value={transporte} onChange={setTransporte} />
        <FormField
          label="CUIT Transporte"
          value={cuit_transporte}
          onChange={setCuitTransporte}
          onBlur={validateCuitTransporte}
          error={cuitErrors.cuit_transporte}
        />
        <FormField label="Chofer" value={chofer} onChange={setChofer} />
        <FormField
          label="CUIL Chofer"
          value={cuil_chofer}
          onChange={setCuilChofer}
          onBlur={validateCuilChofer}
          error={cuitErrors.cuil_chofer}
        />
        <FormField label="Chasis / Patente" value={chasis} onChange={setChasis} />
        <FormField label="Acoplado / Patente" value={acoplado} onChange={setAcoplado} />

      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
        <div className="max-w-mobile md:max-w-desktop mx-auto">
          <Button
            fullWidth
            size="lg"
            loading={saving}
            disabled={hasErrors}
            onClick={handleGuardar}
            style={{ backgroundColor: '#2C9FC0' }}
          >
            <Truck className="w-5 h-5" />
            Asignar transporte a {records.length} {records.length === 1 ? 'cupo' : 'cupos'}
          </Button>
        </div>
      </div>

      {/* ── Parser WhatsApp sheet ──────────────────────────────── */}
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
            <Button
              fullWidth
              onClick={handleParseTransporte}
              disabled={!parserText.trim()}
              style={{ backgroundColor: '#2C9FC0' }}
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
