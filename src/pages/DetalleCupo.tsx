import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Clock, MoreVertical, MessageSquare } from 'lucide-react'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import SectionTitle from '../components/ui/SectionTitle'
import { FormField, SelectField } from '../components/forms/FormField'
import VoiceInput from '../components/forms/VoiceInput'
import GPSInput from '../components/forms/GPSInput'
import { useToast } from '../components/ui/Toast'
import {
  getRecord,
  getAuditLog,
  updateRecord,
  updateCupoStatus,
  deleteRecord,
} from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { isAdmin } from '../lib/auth'
import { formatDateTime } from '../lib/dateUtils'
import { validarCuit, formatearCuit, normalizarCuit } from '../lib/validarCuit'
import { parseTransporteMsg } from '../lib/transporteParser'
import {
  GRANOS,
  LOCALIDADES,
  FIELD_LABELS,
  type CpeRecord,
  type AuditEntry,
  type CpeStatus,
} from '../types'

// ── Types ────────────────────────────────────────────────────

type TabId = 'datos' | 'transporte' | 'pesaje' | 'cierre' | 'historial'
type CupoStatus = 'IMPORTADO' | 'TRANSPORTE' | 'CARGADO' | 'CERRADO' | 'ENVIADO' | 'CANCELADO'

// ── Status config (mirrors CupoCard) ─────────────────────────

const STATUS_CONFIG: Record<CupoStatus, { bg: string; label: string; text: string }> = {
  IMPORTADO:  { bg: '#2C9FC0', label: 'IMPORTADO',  text: '#ffffff' },
  TRANSPORTE: { bg: '#F59E0B', label: 'TRANSPORTE', text: '#1E3252' },
  CARGADO:    { bg: '#FF6C02', label: 'CARGADO',    text: '#ffffff' },
  CERRADO:    { bg: '#16A34A', label: 'CERRADO',    text: '#ffffff' },
  ENVIADO:    { bg: '#15803D', label: 'ENVIADO',    text: '#ffffff' },
  CANCELADO:  { bg: '#9CA3AF', label: 'CANCELADO', text: '#ffffff' },
}

// Which tabs are LOCKED per status (cumulative unlocking)
const LOCKED_TABS: Record<CupoStatus, Set<TabId>> = {
  IMPORTADO:  new Set(['transporte', 'pesaje', 'cierre']),
  TRANSPORTE: new Set(['pesaje', 'cierre']),
  CARGADO:    new Set(['cierre']),
  CERRADO:    new Set(),
  ENVIADO:    new Set(),
  CANCELADO:  new Set(),
}

const VALID_TABS: TabId[] = ['datos', 'transporte', 'pesaje', 'cierre', 'historial']

function normalizeStatus(s: string): CupoStatus {
  const u = s.toUpperCase()
  if (u in STATUS_CONFIG) return u as CupoStatus
  if (s === 'Enviado') return 'ENVIADO'
  return 'IMPORTADO'
}

function str(v: string | number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v)
}

// ── Form types ───────────────────────────────────────────────

interface DatosForm {
  fecha_carga: string; grano: string; localidad: string
  destinatario: string; cuit_destinatario: string
  destino: string; cuit_destino: string
  rte_venta_primaria: string; kg_estimados: string
}

interface TransporteForm {
  transporte: string; cuit_transporte: string
  chofer: string; cuil_chofer: string
  chasis: string; acoplado: string
}

interface PesajeForm {
  kg_bruto_cargados: string; kg_tara_cargados: string; kg_reales: string
  kg_bruto_descargados: string; kg_tara_descargados: string
  kg_estimados: string
}

interface CierreForm {
  nro_ruca: string; ingeniero: string; contacto: string; gps: string
}

function initDatos(r: CpeRecord): DatosForm {
  return {
    fecha_carga: str(r.fecha_carga), grano: str(r.grano), localidad: str(r.localidad),
    destinatario: str(r.destinatario), cuit_destinatario: str(r.cuit_destinatario),
    destino: str(r.destino), cuit_destino: str(r.cuit_destino),
    rte_venta_primaria: str(r.rte_venta_primaria), kg_estimados: str(r.kg_estimados),
  }
}
function initTransporte(r: CpeRecord): TransporteForm {
  return {
    transporte: str(r.transporte), cuit_transporte: str(r.cuit_transporte),
    chofer: str(r.chofer), cuil_chofer: str(r.cuil_chofer),
    chasis: str(r.chasis), acoplado: str(r.acoplado),
  }
}
function initPesaje(r: CpeRecord): PesajeForm {
  return {
    kg_bruto_cargados: str(r.kg_bruto_cargados), kg_tara_cargados: str(r.kg_tara_cargados),
    kg_reales: str(r.kg_reales), kg_bruto_descargados: str(r.kg_bruto_descargados),
    kg_tara_descargados: str(r.kg_tara_descargados), kg_estimados: str(r.kg_estimados),
  }
}
function initCierre(r: CpeRecord): CierreForm {
  return {
    nro_ruca: str(r.nro_ruca), ingeniero: str(r.ingeniero),
    contacto: str(r.contacto), gps: str(r.gps),
  }
}

// ── Tab draft helpers ─────────────────────────────────────────

type DraftTabId = 'datos' | 'transporte' | 'pesaje' | 'cierre'

const TAB_DRAFT_KEY = (id: string, tab: DraftTabId) => `cupo_draft_${id}_${tab}`

function readTabDraft<T>(id: string, tab: DraftTabId): T | null {
  try {
    const raw = localStorage.getItem(TAB_DRAFT_KEY(id, tab))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeTabDraft<T>(id: string, tab: DraftTabId, data: T): void {
  try {
    localStorage.setItem(TAB_DRAFT_KEY(id, tab), JSON.stringify(data))
  } catch {}
}

function clearTabDraft(id: string, tab: DraftTabId): void {
  localStorage.removeItem(TAB_DRAFT_KEY(id, tab))
}

function numOrNull(s: string): number | null {
  return s === '' ? null : Number(s)
}

// ── Sub-components ────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs font-medium text-primary uppercase tracking-wide">{label}</span>
      <div className="h-12 px-4 flex items-center rounded-xl bg-gray-100 border border-gray-light">
        <span className="font-sans text-base text-text-muted">{value || '—'}</span>
      </div>
    </div>
  )
}

function KgNetoField({ bruto, tara }: { bruto: string; tara: string }) {
  const neto = bruto && tara ? Number(bruto) - Number(tara) : null
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs font-medium text-secondary uppercase tracking-wide">
        Kg Neto cargados
      </span>
      <div className="h-12 px-4 flex items-center rounded-xl bg-gray-100 border border-secondary/30">
        <span className={`font-sans text-base font-semibold ${neto !== null ? 'text-secondary' : 'text-text-muted'}`}>
          {neto !== null ? neto.toLocaleString('es-AR') + ' kg' : '—'}
        </span>
      </div>
    </div>
  )
}

function HistoryPanel({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="font-sans text-text-muted text-sm">Sin historial</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="bg-white border border-gray-light rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge label={e.action} variant={e.action === 'CREACIÓN' ? 'green' : 'orange'} />
            <span className="font-mono text-xs text-text-muted">{formatDateTime(e.created_at)}</span>
          </div>
          <p className="font-sans text-xs text-text-muted">{e.user_email}</p>
          {e.field_name && (
            <div className="space-y-0.5">
              <p className="font-mono text-xs text-secondary">{FIELD_LABELS[e.field_name] ?? e.field_name}</p>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {e.old_value && (
                  <span className="font-sans line-through text-text-muted">{e.old_value}</span>
                )}
                {e.old_value && <span className="text-text-muted">→</span>}
                <span className="font-sans text-primary font-medium">{e.new_value ?? '—'}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface ConfirmModalProps {
  code: string
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}
function ConfirmModal({ code, saving, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
        <h3 className="font-mono font-bold text-primary text-lg">¿Cerrar cupo?</h3>
        <p className="font-sans text-sm text-text-muted leading-relaxed">
          ¿Cerrás el cupo{' '}
          <strong className="font-mono text-primary">{code}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            fullWidth
            loading={saving}
            onClick={onConfirm}
            style={{ backgroundColor: '#1E3252' }}
          >
            Cerrar cupo
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────

interface TabBarProps {
  activeTab: TabId
  lockedTabs: Set<TabId>
  onSelect: (tab: TabId) => void
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'datos',      label: 'Datos'      },
  { id: 'transporte', label: 'Transporte' },
  { id: 'pesaje',     label: 'Pesaje'     },
  { id: 'cierre',     label: 'Cierre'     },
  { id: 'historial',  label: 'Historial'  },
]

function TabBar({ activeTab, lockedTabs, onSelect }: TabBarProps) {
  return (
    <div className="fixed top-14 left-0 right-0 z-30 bg-white border-b border-gray-light flex overflow-x-auto scrollbar-hide">
      {TAB_LABELS.map(({ id, label }) => {
        const locked = lockedTabs.has(id)
        const active = activeTab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex-shrink-0 flex items-center gap-1 px-4 py-3 font-mono text-xs font-medium transition-colors border-b-2 ${
              active
                ? 'border-secondary text-secondary'
                : 'border-transparent text-text-muted hover:text-primary'
            }`}
          >
            {label}
            {locked && <Lock className="w-3 h-3 opacity-60" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Fixed bottom action bar ───────────────────────────────────

interface BottomBarProps {
  children: React.ReactNode
}
function BottomBar({ children }: BottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
      <div className="max-w-mobile mx-auto">{children}</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function DetalleCupo() {
  const { id }         = useParams<{ id: string }>()
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const { user }       = useAuth()
  const { show, ToastComponent } = useToast()

  // ── Core state ───────────────────────────────────────────────
  const [record,  setRecord]  = useState<CpeRecord | null>(null)
  const [audit,   setAudit]   = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [cuitErrors, setCuitErrors] = useState<{ cuit_transporte?: string; cuil_chofer?: string }>({})
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [forceOpen,     setForceOpen]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [userIsAdmin,   setUserIsAdmin]   = useState(false)
  const [parserOpen,    setParserOpen]    = useState(false)
  const [parserText,    setParserText]    = useState('')

  // ── Tab state — init from ?tab= query param ──────────────────
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const q = searchParams.get('tab')
    return VALID_TABS.includes(q as TabId) ? (q as TabId) : 'datos'
  })

  // ── Form state per tab ───────────────────────────────────────
  const [datosF,      setDatosF]      = useState<DatosForm>({
    fecha_carga: '', grano: '', localidad: '', destinatario: '',
    cuit_destinatario: '', destino: '', cuit_destino: '',
    rte_venta_primaria: '', kg_estimados: '',
  })
  const [transporteF, setTransporteF] = useState<TransporteForm>({
    transporte: '', cuit_transporte: '', chofer: '', cuil_chofer: '', chasis: '', acoplado: '',
  })
  const [pesajeF,     setPesajeF]     = useState<PesajeForm>({
    kg_bruto_cargados: '', kg_tara_cargados: '', kg_reales: '',
    kg_bruto_descargados: '', kg_tara_descargados: '', kg_estimados: '',
  })
  const [cierreF,     setCierreF]     = useState<CierreForm>({
    nro_ruca: '', ingeniero: '', contacto: '', gps: '',
  })

  // ── Draft dirty tracking ──────────────────────────────────────
  const tabDirtyRef = useRef(new Set<DraftTabId>())

  // ── Helpers ───────────────────────────────────────────────────
  const setD = (f: keyof DatosForm)      => (v: string) => { tabDirtyRef.current.add('datos');      setDatosF(p => ({ ...p, [f]: v })) }
  const setT = (f: keyof TransporteForm) => (v: string) => { tabDirtyRef.current.add('transporte'); setTransporteF(p => ({ ...p, [f]: v })) }
  const setP = (f: keyof PesajeForm)     => (v: string) => { tabDirtyRef.current.add('pesaje');     setPesajeF(p => ({ ...p, [f]: v })) }
  const setC = (f: keyof CierreForm)     => (v: string) => { tabDirtyRef.current.add('cierre');     setCierreF(p => ({ ...p, [f]: v })) }

  // ── Fetch record + audit ─────────────────────────────────────
  const reload = async () => {
    if (!id) return
    const rec = await getRecord(id)
    setRecord(rec)
    if (rec) {
      const log = await getAuditLog(rec.cpe_id)
      setAudit(log)
    }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    reload()
      .catch(() => {})
      .finally(() => setLoading(false))
    if (user?.email) {
      isAdmin(user.email).then(setUserIsAdmin).catch(() => {})
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init forms once record loads (restore drafts if present) ─
  useEffect(() => {
    if (!record) return
    setDatosF(      readTabDraft<DatosForm>(record.id, 'datos')           ?? initDatos(record))
    setTransporteF( readTabDraft<TransporteForm>(record.id, 'transporte') ?? initTransporte(record))
    setPesajeF(     readTabDraft<PesajeForm>(record.id, 'pesaje')         ?? initPesaje(record))
    setCierreF(     readTabDraft<CierreForm>(record.id, 'cierre')         ?? initCierre(record))
    setCuitErrors({})
    tabDirtyRef.current.clear()
  }, [record])

  // ── CUIT/CUIL blur validators ─────────────────────────────────
  const validateCuitTransporte = () => {
    const raw = transporteF.cuit_transporte
    if (!raw) { setCuitErrors(p => ({ ...p, cuit_transporte: undefined })); return }
    const ok = validarCuit(raw)
    setCuitErrors(p => ({ ...p, cuit_transporte: ok ? undefined : 'CUIT inválido' }))
  }
  const validateCuilChofer = () => {
    const raw = transporteF.cuil_chofer
    if (!raw) { setCuitErrors(p => ({ ...p, cuil_chofer: undefined })); return }
    const ok = validarCuit(raw)
    setCuitErrors(p => ({ ...p, cuil_chofer: ok ? undefined : 'CUIL inválido' }))
  }
  const hasTransporteErrors = !!(cuitErrors.cuit_transporte || cuitErrors.cuil_chofer)

  // ── Debounced draft saves ─────────────────────────────────────
  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('datos')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'datos', datosF), 800)
    return () => clearTimeout(t)
  }, [datosF, record])

  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('transporte')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'transporte', transporteF), 800)
    return () => clearTimeout(t)
  }, [transporteF, record])

  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('pesaje')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'pesaje', pesajeF), 800)
    return () => clearTimeout(t)
  }, [pesajeF, record])

  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('cierre')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'cierre', cierreF), 800)
    return () => clearTimeout(t)
  }, [cierreF, record])

  // ── Derived values ────────────────────────────────────────────
  const status = useMemo(
    () => (record ? normalizeStatus(record.status) : 'IMPORTADO'),
    [record]
  )
  const lockedTabs  = LOCKED_TABS[status]
  const statusCfg   = STATUS_CONFIG[status]
  const displayCode = record ? (record.cupo ?? record.cpe_id) : '…'
  const cierreReadOnly = status === 'CERRADO' || status === 'ENVIADO' || status === 'CANCELADO'

  // ── Tab selection with lock guard ────────────────────────────
  const handleTabSelect = (tab: TabId) => {
    if (lockedTabs.has(tab)) {
      show('Completá la etapa anterior primero.', 'info')
      return
    }
    setActiveTab(tab)
  }

  // ── Menu handlers ─────────────────────────────────────────────

  const handleForceStatus = async (newStatus: CpeStatus) => {
    if (!record || !user?.email) return
    setSaving(true)
    try {
      await updateCupoStatus(record.cpe_id, newStatus, user.email)
      await reload()
      setForceOpen(false)
      show(`Estado forzado a ${newStatus}`, 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCupo = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      ;(['datos', 'transporte', 'pesaje', 'cierre'] as DraftTabId[]).forEach(t => clearTabDraft(id, t))
      await deleteRecord(id, user.email)
      navigate('/', { replace: true })
    } catch (e) {
      show((e as Error).message, 'error')
      setSaving(false)
    }
  }

  const handleCancelCupo = async () => {
    if (!record || !user?.email) return
    setSaving(true)
    try {
      await updateCupoStatus(record.cpe_id, 'CANCELADO', user.email)
      navigate('/', { replace: true })
    } catch (e) {
      show((e as Error).message, 'error')
      setSaving(false)
    }
  }

  const handleParseTransporte = () => {
    const result = parseTransporteMsg(parserText)
    setTransporteF(p => ({
      ...p,
      ...(result.transporte      !== undefined ? { transporte:      result.transporte      } : {}),
      ...(result.cuit_transporte !== undefined ? { cuit_transporte: result.cuit_transporte } : {}),
      ...(result.chofer          !== undefined ? { chofer:          result.chofer          } : {}),
      ...(result.cuil_chofer     !== undefined ? { cuil_chofer:     result.cuil_chofer     } : {}),
      ...(result.chasis          !== undefined ? { chasis:          result.chasis          } : {}),
      ...(result.acoplado        !== undefined ? { acoplado:        result.acoplado        } : {}),
    }))
    tabDirtyRef.current.add('transporte')
    setParserOpen(false)
    setParserText('')
    if (result.missing.length > 0) {
      show(`No se detectaron: ${result.missing.join(', ')}. Completá manualmente.`, 'info')
    }
  }

  // ── Save handlers ─────────────────────────────────────────────

  const handleSaveDatos = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      await updateRecord(
        id,
        record.cpe_id,
        {
          fecha_carga: datosF.fecha_carga || null,
          grano: datosF.grano || null,
          localidad: datosF.localidad || null,
          destinatario: datosF.destinatario || null,
          cuit_destinatario: datosF.cuit_destinatario || null,
          destino: datosF.destino || null,
          cuit_destino: datosF.cuit_destino || null,
          rte_venta_primaria: datosF.rte_venta_primaria || null,
          kg_estimados: numOrNull(datosF.kg_estimados),
        },
        record,
        user.email
      )
      clearTabDraft(id, 'datos')
      tabDirtyRef.current.delete('datos')
      await reload()
      show('Cambios guardados', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTransporte = async () => {
    if (!record || !user?.email || !id) return
    if (hasTransporteErrors) return
    setSaving(true)
    try {
      const cuit = transporteF.cuit_transporte
        ? formatearCuit(normalizarCuit(transporteF.cuit_transporte))
        : null
      const cuil = transporteF.cuil_chofer
        ? formatearCuit(normalizarCuit(transporteF.cuil_chofer))
        : null
      await updateRecord(
        id,
        record.cpe_id,
        {
          transporte: transporteF.transporte || null,
          cuit_transporte: cuit,
          chofer: transporteF.chofer || null,
          cuil_chofer: cuil,
          chasis: transporteF.chasis || null,
          acoplado: transporteF.acoplado || null,
        },
        record,
        user.email
      )
      await updateCupoStatus(record.cpe_id, 'TRANSPORTE', user.email)
      clearTabDraft(id, 'transporte')
      tabDirtyRef.current.delete('transporte')
      await reload()
      show('Transporte asignado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePesaje = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      await updateRecord(
        id,
        record.cpe_id,
        {
          kg_bruto_cargados:    numOrNull(pesajeF.kg_bruto_cargados),
          kg_tara_cargados:     numOrNull(pesajeF.kg_tara_cargados),
          kg_reales:            numOrNull(pesajeF.kg_reales),
          kg_bruto_descargados: numOrNull(pesajeF.kg_bruto_descargados),
          kg_tara_descargados:  numOrNull(pesajeF.kg_tara_descargados),
          kg_estimados:         numOrNull(pesajeF.kg_estimados),
        },
        record,
        user.email
      )
      await updateCupoStatus(record.cpe_id, 'CARGADO', user.email)
      clearTabDraft(id, 'pesaje')
      tabDirtyRef.current.delete('pesaje')
      await reload()
      show('Pesaje guardado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCierre = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      await updateRecord(
        id,
        record.cpe_id,
        {
          nro_ruca:  cierreF.nro_ruca  || null,
          ingeniero: cierreF.ingeniero || null,
          contacto:  cierreF.contacto  || null,
          gps:       cierreF.gps       || null,
        },
        record,
        user.email
      )
      await updateCupoStatus(record.cpe_id, 'CERRADO', user.email);
      (['datos', 'transporte', 'pesaje', 'cierre'] as DraftTabId[]).forEach(t => {
        clearTabDraft(id, t)
        tabDirtyRef.current.delete(t)
      })
      await reload()
      setShowConfirm(false)
      show('Cupo cerrado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Cargando…" showBack />
        <div className="max-w-mobile mx-auto px-4 pt-20 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-light animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="No encontrado" showBack />
        <div className="max-w-mobile mx-auto px-4 pt-20 text-center space-y-4">
          <p className="font-sans text-text-muted text-sm">Cupo no encontrado.</p>
          <Button variant="ghost" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ── Header ───────────────────────────────────────────── */}
      <Header
        title={displayCode}
        showBack
        rightElement={
          <div className="flex items-center gap-2">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
            >
              {statusCfg.label}
            </span>
            <button
              onClick={() => setMenuOpen(true)}
              className="p-1.5 rounded-lg text-white hover:bg-white/20 transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* ── Tab bar ──────────────────────────────────────────── */}
      <TabBar
        activeTab={activeTab}
        lockedTabs={lockedTabs}
        onSelect={handleTabSelect}
      />

      {/* ── Content area (offset: header 56px + tabbar 44px) ─── */}
      <div className="max-w-mobile mx-auto px-4 space-y-4" style={{ paddingTop: '108px' }}>

        {/* ── Tab: DATOS ────────────────────────────────────── */}
        {activeTab === 'datos' && (
          <>
            <SectionTitle>Datos del cupo</SectionTitle>
            <FormField label="Fecha de carga" value={datosF.fecha_carga} onChange={setD('fecha_carga')} type="date" />
            <SelectField label="Grano" value={datosF.grano} onChange={setD('grano')} options={GRANOS} />
            <SelectField label="Localidad" value={datosF.localidad} onChange={setD('localidad')} options={LOCALIDADES} />
            <FormField label="Destinatario" value={datosF.destinatario} onChange={setD('destinatario')} />
            <FormField label="CUIT Destinatario" value={datosF.cuit_destinatario} onChange={setD('cuit_destinatario')} />
            <FormField label="Destino" value={datosF.destino} onChange={setD('destino')} />
            <FormField label="CUIT Destino" value={datosF.cuit_destino} onChange={setD('cuit_destino')} />
            <FormField label="Vendedor" value={datosF.rte_venta_primaria} onChange={setD('rte_venta_primaria')} />
            <FormField label="Kg Estimados" value={datosF.kg_estimados} onChange={setD('kg_estimados')} type="number" />
          </>
        )}

        {/* ── Tab: TRANSPORTE ──────────────────────────────── */}
        {activeTab === 'transporte' && (
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
            <VoiceInput label="Transporte" value={transporteF.transporte} onChange={setT('transporte')} />
            <FormField
              label="CUIT Transporte"
              value={transporteF.cuit_transporte}
              onChange={setT('cuit_transporte')}
              onBlur={validateCuitTransporte}
              error={cuitErrors.cuit_transporte}
            />
            <VoiceInput label="Chofer" value={transporteF.chofer} onChange={setT('chofer')} />
            <FormField
              label="CUIL Chofer"
              value={transporteF.cuil_chofer}
              onChange={setT('cuil_chofer')}
              onBlur={validateCuilChofer}
              error={cuitErrors.cuil_chofer}
            />
            <VoiceInput label="Chasis / Patente" value={transporteF.chasis} onChange={setT('chasis')} />
            <VoiceInput label="Acoplado / Patente" value={transporteF.acoplado} onChange={setT('acoplado')} />
          </>
        )}

        {/* ── Tab: PESAJE ───────────────────────────────────── */}
        {activeTab === 'pesaje' && (
          <>
            <SectionTitle>Cargados</SectionTitle>
            <FormField label="Kg Bruto" value={pesajeF.kg_bruto_cargados} onChange={setP('kg_bruto_cargados')} type="number" />
            <FormField label="Kg Tara" value={pesajeF.kg_tara_cargados} onChange={setP('kg_tara_cargados')} type="number" />
            <KgNetoField bruto={pesajeF.kg_bruto_cargados} tara={pesajeF.kg_tara_cargados} />
            <FormField label="Kg Reales" value={pesajeF.kg_reales} onChange={setP('kg_reales')} type="number" />
            <SectionTitle className="mt-2">Descargados</SectionTitle>
            <FormField label="Kg Bruto" value={pesajeF.kg_bruto_descargados} onChange={setP('kg_bruto_descargados')} type="number" />
            <FormField label="Kg Tara" value={pesajeF.kg_tara_descargados} onChange={setP('kg_tara_descargados')} type="number" />
            <SectionTitle className="mt-2">Referencia</SectionTitle>
            <FormField label="Kg Estimados (email)" value={pesajeF.kg_estimados} onChange={setP('kg_estimados')} type="number" />
          </>
        )}

        {/* ── Tab: CIERRE ───────────────────────────────────── */}
        {activeTab === 'cierre' && (
          <>
            <SectionTitle>Cierre de cupo</SectionTitle>
            {cierreReadOnly ? (
              <>
                <ReadOnlyField label="N° RUCA"    value={cierreF.nro_ruca}  />
                <ReadOnlyField label="Ingeniero"  value={cierreF.ingeniero} />
                <ReadOnlyField label="Contacto"   value={cierreF.contacto}  />
                <ReadOnlyField label="GPS"        value={cierreF.gps}       />
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                  <span className="font-sans text-sm text-green-700 font-medium">
                    Cupo cerrado — solo lectura
                  </span>
                </div>
              </>
            ) : (
              <>
                <FormField label="N° RUCA"   value={cierreF.nro_ruca}  onChange={setC('nro_ruca')}  />
                <FormField label="Ingeniero" value={cierreF.ingeniero} onChange={setC('ingeniero')} />
                <FormField label="Contacto"  value={cierreF.contacto}  onChange={setC('contacto')}  />
                <GPSInput value={cierreF.gps} onChange={setC('gps')} />
              </>
            )}
          </>
        )}

        {/* ── Tab: HISTORIAL ───────────────────────────────── */}
        {activeTab === 'historial' && (
          <>
            <SectionTitle>Historial de cambios</SectionTitle>
            <HistoryPanel entries={audit} />
          </>
        )}
      </div>

      {/* ── Bottom action buttons ────────────────────────────── */}
      {activeTab === 'datos' && (
        <BottomBar>
          <Button fullWidth size="lg" loading={saving} onClick={handleSaveDatos}>
            Guardar cambios
          </Button>
        </BottomBar>
      )}

      {activeTab === 'transporte' && (
        <BottomBar>
          <Button
            fullWidth
            size="lg"
            loading={saving}
            disabled={hasTransporteErrors}
            onClick={handleSaveTransporte}
            style={{ backgroundColor: '#2C9FC0' }}
          >
            Guardar → Transporte Asignado
          </Button>
        </BottomBar>
      )}

      {activeTab === 'pesaje' && (
        <BottomBar>
          <Button
            fullWidth
            size="lg"
            loading={saving}
            onClick={handleSavePesaje}
            style={{ backgroundColor: '#FF6C02' }}
          >
            Guardar → Cargado
          </Button>
        </BottomBar>
      )}

      {activeTab === 'cierre' && !cierreReadOnly && (
        <BottomBar>
          <Button
            fullWidth
            size="lg"
            loading={saving}
            onClick={() => setShowConfirm(true)}
          >
            Cerrar cupo
          </Button>
        </BottomBar>
      )}

      {/* ── Confirm modal (Cierre) ───────────────────────────── */}
      {showConfirm && (
        <ConfirmModal
          code={displayCode}
          saving={saving}
          onConfirm={handleSaveCierre}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* ── Menu bottom sheet ──────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-mobile p-4 space-y-2 pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-mono text-xs text-text-muted uppercase tracking-widest px-1 pb-1">
              Acciones
            </p>
            <button
              className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-primary hover:bg-gray-50 transition"
              onClick={() => { setMenuOpen(false); setForceOpen(true) }}
            >
              Forzar estado
            </button>
            {status !== 'CANCELADO' && (
              <button
                className="w-full text-left px-4 py-3.5 font-sans text-sm text-orange-600 font-medium border-t border-gray-100"
                onClick={() => { setMenuOpen(false); setCancelConfirm(true) }}
              >
                Cancelar cupo
              </button>
            )}
            {userIsAdmin && (
              <button
                className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-red-600 hover:bg-red-50 transition"
                onClick={() => { setMenuOpen(false); setDeleteConfirm(true) }}
              >
                Eliminar cupo
              </button>
            )}
            <button
              className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-text-muted hover:bg-gray-50 transition"
              onClick={() => setMenuOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Forzar estado bottom sheet ─────────────────────────── */}
      {forceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setForceOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-mobile p-4 space-y-2 pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-mono text-xs text-text-muted uppercase tracking-widest px-1 pb-1">
              Seleccioná el nuevo estado
            </p>
            {(['IMPORTADO', 'TRANSPORTE', 'CARGADO', 'CERRADO', 'ENVIADO'] as CpeStatus[]).map(s => (
              <button
                key={s}
                disabled={s === status || saving}
                className={`w-full text-left px-4 py-3 rounded-xl font-mono text-sm font-medium transition ${
                  s === status
                    ? 'text-text-muted bg-gray-50 cursor-default'
                    : 'text-primary hover:bg-gray-50'
                }`}
                onClick={() => handleForceStatus(s)}
              >
                {s === status ? `✓ ${s} (actual)` : s}
              </button>
            ))}
            <button
              className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm text-text-muted hover:bg-gray-50 transition"
              onClick={() => setForceOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ───────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-mono font-bold text-red-600 text-lg">¿Eliminar cupo?</h3>
            <p className="font-sans text-sm text-text-muted leading-relaxed">
              Eliminás el cupo{' '}
              <strong className="font-mono text-primary">{displayCode}</strong>.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setDeleteConfirm(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                fullWidth
                loading={saving}
                onClick={handleDeleteCupo}
                style={{ backgroundColor: '#DC2626' }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar cancelación ──────────────────────────────── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-mono font-bold text-orange-600 text-lg">¿Cancelar cupo?</h3>
            <div>
              <p className="font-sans text-sm text-text-muted leading-relaxed">
                ¿Cancelás el cupo{' '}
                <strong className="font-mono text-primary">{displayCode}</strong>?
              </p>
              <p className="font-sans text-xs text-text-muted mt-1">
                El cupo quedará registrado como CANCELADO. Esta acción no se puede deshacer desde la app.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setCancelConfirm(false)}
                disabled={saving}
              >
                Volver
              </Button>
              <Button
                fullWidth
                loading={saving}
                onClick={handleCancelCupo}
                style={{ backgroundColor: '#FF6C02' }}
              >
                Cancelar cupo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Parser WhatsApp sheet ──────────────────────────────── */}
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
