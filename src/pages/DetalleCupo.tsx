import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, MoreVertical, MessageSquare } from 'lucide-react'
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
  CAMPOS,
  GRANOS,
  VARIEDADES,
  LOCALIDADES,
  FIELD_LABELS,
  type CpeRecord,
  type AuditEntry,
  type CpeStatus,
} from '../types'

// ── Types ────────────────────────────────────────────────────

type TabId = 'transporte' | 'intervinientes' | 'grano' | 'procedencia' | 'contingencias' | 'descarga' | 'historial'
type CupoStatus = 'IMPORTADO' | 'TRANSPORTE' | 'CARGADO' | 'CERRADO' | 'ENVIADO' | 'CANCELADO'

// ── Status config ─────────────────────────────────────────────

const STATUS_CONFIG: Record<CupoStatus, { bg: string; label: string; text: string }> = {
  IMPORTADO:  { bg: '#2C9FC0', label: 'IMPORTADO',  text: '#ffffff' },
  TRANSPORTE: { bg: '#F59E0B', label: 'TRANSPORTE', text: '#1E3252' },
  CARGADO:    { bg: '#FF6C02', label: 'CARGADO',    text: '#ffffff' },
  CERRADO:    { bg: '#16A34A', label: 'CERRADO',    text: '#ffffff' },
  ENVIADO:    { bg: '#15803D', label: 'ENVIADO',    text: '#ffffff' },
  CANCELADO:  { bg: '#9CA3AF', label: 'CANCELADO',  text: '#ffffff' },
}

const VALID_TABS: TabId[] = ['transporte', 'intervinientes', 'grano', 'procedencia', 'contingencias', 'descarga', 'historial']

function ResponsableChip({ label }: { label: string }) {
  return (
    <p className="font-sans text-xs text-text-muted -mt-2 mb-1">
      Carga: <span className="font-medium text-secondary">{label}</span>
    </p>
  )
}

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

interface TransporteForm {
  cupo: string
  transporte: string; cuit_transporte: string
  chofer: string; cuil_chofer: string
  chasis: string; acoplado: string
  fecha_partida: string
  km: string; tarifa: string
  nro_ruca: string
}

interface IntervinientesForm {
  titular_nombre: string; titular_cuit: string
  remitente_comercial_nombre: string; remitente_comercial_cuit: string
  rte_venta_primaria: string; cuit_rte_venta_primaria: string
  rte_venta_secundaria: string; cuit_rte_venta_secundaria: string
  rte_venta_secundaria2: string; cuit_rte_venta_secundaria2: string
  mercado_termino: string
  corredor_primario: string; cuit_corredor_primario: string
  corredor_secundario: string; cuit_corredor_secundario: string
  repr_entregador: string; cuit_repr_entregador: string
  repr_recibidor: string; cuit_repr_recibidor: string
  destinatario: string; cuit_destinatario: string
  destino: string; cuit_destino: string
  pagador_flete: string; cuit_pagador_flete: string
  intermediario_flete: string; cuit_intermediario: string
}

interface GranoForm {
  grano: string; variedad: string
  declaracion_calidad: string
  campania: string
  kg_bruto_cargados: string; kg_tara_cargados: string
  kg_estimados: string
  observaciones: string
}

interface ProcedenciaForm {
  // C — Procedencia
  es_campo_origen: boolean
  localidad: string; provincia_origen: string
  latitud: number | null; longitud: number | null
  gps: string
  descripcion_origen: string; renspa: string
  campo: string
  // D — Destino
  es_campo_destino: boolean
  nro_planta: string; direccion_destino: string
  localidad_destino: string; provincia_destino: string
}

interface ContingenciasForm {
  contingencia: string; contingencia_otro: string
  desactivacion: string; desactivacion_otro: string
}

interface DescargaForm {
  fecha_arribo: string; fecha_descarga: string
  nro_turno: string
  kg_bruto_descargados: string; kg_tara_descargados: string
  localidad_descarga: string; provincia_descarga: string
}

// ── Init helpers ─────────────────────────────────────────────

function initTransporte(r: CpeRecord): TransporteForm {
  return {
    cupo: str(r.cupo),
    transporte: str(r.transporte), cuit_transporte: str(r.cuit_transporte),
    chofer: str(r.chofer), cuil_chofer: str(r.cuil_chofer),
    chasis: str(r.chasis), acoplado: str(r.acoplado),
    fecha_partida: str(r.fecha_partida),
    km: str(r.km), tarifa: str(r.tarifa),
    nro_ruca: str(r.nro_ruca),
  }
}
function initIntervinientes(r: CpeRecord): IntervinientesForm {
  return {
    titular_nombre: str(r.titular_nombre), titular_cuit: str(r.titular_cuit),
    remitente_comercial_nombre: str(r.remitente_comercial_nombre),
    remitente_comercial_cuit: str(r.remitente_comercial_cuit),
    rte_venta_primaria: str(r.rte_venta_primaria), cuit_rte_venta_primaria: str(r.cuit_rte_venta_primaria),
    rte_venta_secundaria: str(r.rte_venta_secundaria), cuit_rte_venta_secundaria: str(r.cuit_rte_venta_secundaria),
    rte_venta_secundaria2: str(r.rte_venta_secundaria2), cuit_rte_venta_secundaria2: str(r.cuit_rte_venta_secundaria2),
    mercado_termino: str(r.mercado_termino),
    corredor_primario: str(r.corredor_primario), cuit_corredor_primario: str(r.cuit_corredor_primario),
    corredor_secundario: str(r.corredor_secundario), cuit_corredor_secundario: str(r.cuit_corredor_secundario),
    repr_entregador: str(r.repr_entregador), cuit_repr_entregador: str(r.cuit_repr_entregador),
    repr_recibidor: str(r.repr_recibidor), cuit_repr_recibidor: str(r.cuit_repr_recibidor),
    destinatario: str(r.destinatario), cuit_destinatario: str(r.cuit_destinatario),
    destino: str(r.destino), cuit_destino: str(r.cuit_destino),
    pagador_flete: str(r.pagador_flete), cuit_pagador_flete: str(r.cuit_pagador_flete),
    intermediario_flete: str(r.intermediario_flete), cuit_intermediario: str(r.cuit_intermediario),
  }
}
function initGrano(r: CpeRecord): GranoForm {
  return {
    grano: str(r.grano), variedad: str(r.variedad),
    declaracion_calidad: str(r.declaracion_calidad),
    campania: str(r.campania),
    kg_bruto_cargados: str(r.kg_bruto_cargados),
    kg_tara_cargados: str(r.kg_tara_cargados),
    kg_estimados: str(r.kg_estimados),
    observaciones: str(r.observaciones),
  }
}
function initProcedencia(r: CpeRecord): ProcedenciaForm {
  return {
    es_campo_origen: r.es_campo_origen ?? false,
    localidad: str(r.localidad), provincia_origen: str(r.provincia_origen),
    latitud: r.latitud ?? null, longitud: r.longitud ?? null,
    gps: str(r.gps),
    descripcion_origen: str(r.descripcion_origen), renspa: str(r.renspa),
    campo: str(r.campo),
    es_campo_destino: r.es_campo_destino ?? false,
    nro_planta: str(r.nro_planta), direccion_destino: str(r.direccion_destino),
    localidad_destino: str(r.localidad_destino), provincia_destino: str(r.provincia_destino),
  }
}
function initContingencias(r: CpeRecord): ContingenciasForm {
  return {
    contingencia: str(r.contingencia), contingencia_otro: str(r.contingencia_otro),
    desactivacion: str(r.desactivacion), desactivacion_otro: str(r.desactivacion_otro),
  }
}
function initDescarga(r: CpeRecord): DescargaForm {
  return {
    fecha_arribo: str(r.fecha_arribo), fecha_descarga: str(r.fecha_descarga),
    nro_turno: str(r.nro_turno),
    kg_bruto_descargados: str(r.kg_bruto_descargados),
    kg_tara_descargados: str(r.kg_tara_descargados),
    localidad_descarga: str(r.localidad_descarga),
    provincia_descarga: str(r.provincia_descarga),
  }
}

// ── Tab draft helpers ─────────────────────────────────────────

type DraftTabId = 'transporte' | 'intervinientes' | 'grano' | 'procedencia' | 'contingencias' | 'descarga'

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

function KgNetoField({ label, bruto, tara }: { label: string; bruto: string; tara: string }) {
  const neto = bruto && tara ? Number(bruto) - Number(tara) : null
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs font-medium text-secondary uppercase tracking-wide">
        {label}
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
  onSelect: (tab: TabId) => void
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'transporte',    label: 'Transporte'    },
  { id: 'intervinientes',label: 'Intervinientes'},
  { id: 'grano',         label: 'Grano'         },
  { id: 'procedencia',   label: 'Procedencia'   },
  { id: 'contingencias', label: 'Contingencias' },
  { id: 'descarga',      label: 'Descarga'      },
  { id: 'historial',     label: 'Historial'     },
]

function TabBar({ activeTab, onSelect }: TabBarProps) {
  return (
    <div className="fixed top-14 left-0 right-0 z-30 bg-white border-b border-gray-light flex overflow-x-auto scrollbar-hide">
      {TAB_LABELS.map(({ id, label }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex-shrink-0 px-4 py-3 font-mono text-xs font-medium transition-colors border-b-2 ${
              active
                ? 'border-secondary text-secondary'
                : 'border-transparent text-text-muted hover:text-primary'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Fixed bottom action bar ───────────────────────────────────

function BottomBar({ children }: { children: React.ReactNode }) {
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
  const [cpModalOpen,   setCpModalOpen]   = useState(false)
  const [cpMissing,     setCpMissing]     = useState<{ section: string; missing: string[] }[]>([])
  const [generando,     setGenerando]     = useState(false)

  // ── Tab state — init from ?tab= query param ──────────────────
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const q = searchParams.get('tab')
    return VALID_TABS.includes(q as TabId) ? (q as TabId) : 'transporte'
  })

  // ── Form state per tab ───────────────────────────────────────
  const [transporteF,    setTransporteF]    = useState<TransporteForm>({
    cupo: '', transporte: '', cuit_transporte: '', chofer: '', cuil_chofer: '',
    chasis: '', acoplado: '', fecha_partida: '', km: '', tarifa: '', nro_ruca: '',
  })
  const [intervinientesF, setIntervinientesF] = useState<IntervinientesForm>({
    titular_nombre: '', titular_cuit: '',
    remitente_comercial_nombre: '', remitente_comercial_cuit: '',
    rte_venta_primaria: '', cuit_rte_venta_primaria: '',
    rte_venta_secundaria: '', cuit_rte_venta_secundaria: '',
    rte_venta_secundaria2: '', cuit_rte_venta_secundaria2: '',
    mercado_termino: '',
    corredor_primario: '', cuit_corredor_primario: '',
    corredor_secundario: '', cuit_corredor_secundario: '',
    repr_entregador: '', cuit_repr_entregador: '',
    repr_recibidor: '', cuit_repr_recibidor: '',
    destinatario: '', cuit_destinatario: '',
    destino: '', cuit_destino: '',
    pagador_flete: '', cuit_pagador_flete: '',
    intermediario_flete: '', cuit_intermediario: '',
  })
  const [granoF,         setGranoF]         = useState<GranoForm>({
    grano: '', variedad: '', declaracion_calidad: '', campania: '',
    kg_bruto_cargados: '', kg_tara_cargados: '', kg_estimados: '', observaciones: '',
  })
  const [procedenciaF,   setProcedenciaF]   = useState<ProcedenciaForm>({
    es_campo_origen: false, localidad: '', provincia_origen: '',
    latitud: null, longitud: null, gps: '',
    descripcion_origen: '', renspa: '', campo: '',
    es_campo_destino: false, nro_planta: '', direccion_destino: '',
    localidad_destino: '', provincia_destino: '',
  })
  const [contingenciasF, setContingenciasF] = useState<ContingenciasForm>({
    contingencia: '', contingencia_otro: '', desactivacion: '', desactivacion_otro: '',
  })
  const [descargaF,      setDescargaF]      = useState<DescargaForm>({
    fecha_arribo: '', fecha_descarga: '', nro_turno: '',
    kg_bruto_descargados: '', kg_tara_descargados: '',
    localidad_descarga: '', provincia_descarga: '',
  })

  // ── Draft dirty tracking ──────────────────────────────────────
  const tabDirtyRef = useRef(new Set<DraftTabId>())

  // ── Setter helpers ────────────────────────────────────────────
  const setT  = (f: keyof TransporteForm)     => (v: string) => { tabDirtyRef.current.add('transporte');    setTransporteF(p    => ({ ...p, [f]: v })) }
  const setI  = (f: keyof IntervinientesForm) => (v: string) => { tabDirtyRef.current.add('intervinientes');setIntervinientesF(p=> ({ ...p, [f]: v })) }
  const setG  = (f: keyof GranoForm)          => (v: string) => { tabDirtyRef.current.add('grano');         setGranoF(p         => ({ ...p, [f]: v })) }
  const setP  = (f: keyof ProcedenciaForm)    => (v: string) => { tabDirtyRef.current.add('procedencia');   setProcedenciaF(p   => ({ ...p, [f]: v })) }
  const setCt = (f: keyof ContingenciasForm)  => (v: string) => { tabDirtyRef.current.add('contingencias'); setContingenciasF(p => ({ ...p, [f]: v })) }
  const setDe = (f: keyof DescargaForm)       => (v: string) => { tabDirtyRef.current.add('descarga');      setDescargaF(p      => ({ ...p, [f]: v })) }

  const setGpsP = (lat: number, lng: number) => {
    tabDirtyRef.current.add('procedencia')
    setProcedenciaF(p => ({
      ...p,
      latitud: lat,
      longitud: lng,
      gps: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    }))
  }

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

  // ── Init forms once record loads ─────────────────────────────
  useEffect(() => {
    if (!record) return
    setTransporteF(    readTabDraft<TransporteForm>(record.id, 'transporte')           ?? initTransporte(record))
    setIntervinientesF(readTabDraft<IntervinientesForm>(record.id, 'intervinientes')   ?? initIntervinientes(record))
    setGranoF(         readTabDraft<GranoForm>(record.id, 'grano')                     ?? initGrano(record))
    setProcedenciaF(   readTabDraft<ProcedenciaForm>(record.id, 'procedencia')         ?? initProcedencia(record))
    setContingenciasF( readTabDraft<ContingenciasForm>(record.id, 'contingencias')     ?? initContingencias(record))
    setDescargaF(      readTabDraft<DescargaForm>(record.id, 'descarga')               ?? initDescarga(record))
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
    if (!record || !tabDirtyRef.current.has('transporte')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'transporte', transporteF), 800)
    return () => clearTimeout(t)
  }, [transporteF, record])

  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('intervinientes')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'intervinientes', intervinientesF), 800)
    return () => clearTimeout(t)
  }, [intervinientesF, record])

  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('grano')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'grano', granoF), 800)
    return () => clearTimeout(t)
  }, [granoF, record])

  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('procedencia')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'procedencia', procedenciaF), 800)
    return () => clearTimeout(t)
  }, [procedenciaF, record])

  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('contingencias')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'contingencias', contingenciasF), 800)
    return () => clearTimeout(t)
  }, [contingenciasF, record])

  useEffect(() => {
    if (!record || !tabDirtyRef.current.has('descarga')) return
    const t = setTimeout(() => writeTabDraft(record.id, 'descarga', descargaF), 800)
    return () => clearTimeout(t)
  }, [descargaF, record])

  // ── Derived values ────────────────────────────────────────────
  const status = useMemo(
    () => (record ? normalizeStatus(record.status) : 'IMPORTADO'),
    [record]
  )
  const statusCfg   = STATUS_CONFIG[status]
  const displayCode = record ? (record.cupo ?? record.cpe_id) : '…'
  const descargaReadOnly = status === 'CERRADO' || status === 'ENVIADO' || status === 'CANCELADO'

  // ── Tab selection ─────────────────────────────────────────────
  const handleTabSelect = (tab: TabId) => setActiveTab(tab)

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
      ;(['transporte', 'intervinientes', 'grano', 'procedencia', 'contingencias', 'descarga'] as DraftTabId[])
        .forEach(t => clearTabDraft(id, t))
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

  // ── Generar CP ───────────────────────────────────────────────

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
      labels: { km: 'Km', provincia_origen: 'Provincia Origen', provincia_destino: 'Provincia Destino' },
    },
    {
      section: 'Transporte',
      fields: ['transporte', 'cuit_transporte', 'chofer', 'cuil_chofer', 'chasis'],
      labels: { transporte: 'Transportista', cuit_transporte: 'CUIT Transporte', chofer: 'Chofer', cuil_chofer: 'CUIL Chofer', chasis: 'Patente Chasis' },
    },
    {
      section: 'Pesaje',
      fields: ['kg_estimados'],
      labels: { kg_estimados: 'Kg Estimados' },
    },
  ]

  function validateForCP(rec: CpeRecord): { section: string; missing: string[] }[] {
    return CP_REQUIRED
      .map(({ section, fields, labels }) => ({
        section,
        missing: fields.filter(f => !rec[f] && rec[f] !== 0).map(f => labels[f]),
      }))
      .filter(({ missing }) => missing.length > 0)
  }

  const handleGenerarCP = async () => {
    if (!record) return
    const errors = validateForCP(record)
    if (errors.length > 0) {
      setCpMissing(errors)
      setCpModalOpen(true)
      return
    }
    setGenerando(true)
    try {
      const webhookUrl = (import.meta.env.VITE_N8N_WEBHOOK_CP_URL as string | undefined)?.trim()
      if (!webhookUrl) {
        show('URL del webhook no configurada (VITE_N8N_WEBHOOK_CP_URL)', 'error')
        return
      }
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      show('Solicitud de CP enviada correctamente', 'success')
    } catch {
      show('Error al enviar la solicitud. Intentá de nuevo.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  const handleGenerarIgual = async () => {
    setCpModalOpen(false)
    if (!record) return
    setGenerando(true)
    try {
      const webhookUrl = (import.meta.env.VITE_N8N_WEBHOOK_CP_URL as string | undefined)?.trim()
      if (!webhookUrl) {
        show('URL del webhook no configurada (VITE_N8N_WEBHOOK_CP_URL)', 'error')
        return
      }
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      show('Solicitud de CP enviada correctamente', 'success')
    } catch {
      show('Error al enviar la solicitud. Intentá de nuevo.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  // ── Save handlers ─────────────────────────────────────────────

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
        id, record.cpe_id,
        {
          cupo:            transporteF.cupo || null,
          transporte:      transporteF.transporte || null,
          cuit_transporte: cuit,
          chofer:          transporteF.chofer || null,
          cuil_chofer:     cuil,
          chasis:          transporteF.chasis || null,
          acoplado:        transporteF.acoplado || null,
          fecha_partida:   transporteF.fecha_partida || null,
          km:              numOrNull(transporteF.km),
          tarifa:          numOrNull(transporteF.tarifa),
          nro_ruca:        transporteF.nro_ruca || null,
        },
        record, user.email
      )
      await updateCupoStatus(record.cpe_id, 'TRANSPORTE', user.email)
      clearTabDraft(id, 'transporte')
      tabDirtyRef.current.delete('transporte')
      await reload()
      show('Transporte guardado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveIntervinientes = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      await updateRecord(
        id, record.cpe_id,
        {
          titular_nombre:              intervinientesF.titular_nombre || null,
          titular_cuit:                intervinientesF.titular_cuit || null,
          remitente_comercial_nombre:  intervinientesF.remitente_comercial_nombre || null,
          remitente_comercial_cuit:    intervinientesF.remitente_comercial_cuit || null,
          rte_venta_primaria:          intervinientesF.rte_venta_primaria || null,
          cuit_rte_venta_primaria:     intervinientesF.cuit_rte_venta_primaria || null,
          rte_venta_secundaria:        intervinientesF.rte_venta_secundaria || null,
          cuit_rte_venta_secundaria:   intervinientesF.cuit_rte_venta_secundaria || null,
          rte_venta_secundaria2:       intervinientesF.rte_venta_secundaria2 || null,
          cuit_rte_venta_secundaria2:  intervinientesF.cuit_rte_venta_secundaria2 || null,
          mercado_termino:             intervinientesF.mercado_termino || null,
          corredor_primario:           intervinientesF.corredor_primario || null,
          cuit_corredor_primario:      intervinientesF.cuit_corredor_primario || null,
          corredor_secundario:         intervinientesF.corredor_secundario || null,
          cuit_corredor_secundario:    intervinientesF.cuit_corredor_secundario || null,
          repr_entregador:             intervinientesF.repr_entregador || null,
          cuit_repr_entregador:        intervinientesF.cuit_repr_entregador || null,
          repr_recibidor:              intervinientesF.repr_recibidor || null,
          cuit_repr_recibidor:         intervinientesF.cuit_repr_recibidor || null,
          destinatario:                intervinientesF.destinatario || null,
          cuit_destinatario:           intervinientesF.cuit_destinatario || null,
          destino:                     intervinientesF.destino || null,
          cuit_destino:                intervinientesF.cuit_destino || null,
          pagador_flete:               intervinientesF.pagador_flete || null,
          cuit_pagador_flete:          intervinientesF.cuit_pagador_flete || null,
          intermediario_flete:         intervinientesF.intermediario_flete || null,
          cuit_intermediario:          intervinientesF.cuit_intermediario || null,
        },
        record, user.email
      )
      clearTabDraft(id, 'intervinientes')
      tabDirtyRef.current.delete('intervinientes')
      await reload()
      show('Cambios guardados', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveGrano = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      await updateRecord(
        id, record.cpe_id,
        {
          grano:              granoF.grano || null,
          variedad:           granoF.variedad || null,
          declaracion_calidad:(granoF.declaracion_calidad as 'conforme' | 'condicional' | null) || null,
          campania:           granoF.campania || null,
          kg_bruto_cargados:  numOrNull(granoF.kg_bruto_cargados),
          kg_tara_cargados:   numOrNull(granoF.kg_tara_cargados),
          kg_estimados:       numOrNull(granoF.kg_estimados),
          observaciones:      granoF.observaciones || null,
        },
        record, user.email
      )
      await updateCupoStatus(record.cpe_id, 'CARGADO', user.email)
      clearTabDraft(id, 'grano')
      tabDirtyRef.current.delete('grano')
      await reload()
      show('Grano guardado → Cargado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProcedencia = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      await updateRecord(
        id, record.cpe_id,
        {
          es_campo_origen:   procedenciaF.es_campo_origen,
          localidad:         procedenciaF.localidad || null,
          provincia_origen:  procedenciaF.provincia_origen || null,
          latitud:           procedenciaF.latitud ?? null,
          longitud:          procedenciaF.longitud ?? null,
          gps:               procedenciaF.gps || null,
          descripcion_origen:procedenciaF.descripcion_origen || null,
          renspa:            procedenciaF.renspa || null,
          campo:             procedenciaF.campo || null,
          es_campo_destino:  procedenciaF.es_campo_destino,
          nro_planta:        procedenciaF.nro_planta || null,
          direccion_destino: procedenciaF.direccion_destino || null,
          localidad_destino: procedenciaF.localidad_destino || null,
          provincia_destino: procedenciaF.provincia_destino || null,
        },
        record, user.email
      )
      clearTabDraft(id, 'procedencia')
      tabDirtyRef.current.delete('procedencia')
      await reload()
      show('Procedencia guardada', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveContingencias = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      await updateRecord(
        id, record.cpe_id,
        {
          contingencia:       contingenciasF.contingencia || null,
          contingencia_otro:  contingenciasF.contingencia_otro || null,
          desactivacion:      contingenciasF.desactivacion || null,
          desactivacion_otro: contingenciasF.desactivacion_otro || null,
        },
        record, user.email
      )
      clearTabDraft(id, 'contingencias')
      tabDirtyRef.current.delete('contingencias')
      await reload()
      show('Contingencias guardadas', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDescarga = async () => {
    if (!record || !user?.email || !id) return
    setSaving(true)
    try {
      await updateRecord(
        id, record.cpe_id,
        {
          fecha_arribo:         descargaF.fecha_arribo || null,
          fecha_descarga:       descargaF.fecha_descarga || null,
          nro_turno:            descargaF.nro_turno || null,
          kg_bruto_descargados: numOrNull(descargaF.kg_bruto_descargados),
          kg_tara_descargados:  numOrNull(descargaF.kg_tara_descargados),
          localidad_descarga:   descargaF.localidad_descarga || null,
          provincia_descarga:   descargaF.provincia_descarga || null,
        },
        record, user.email
      )
      await updateCupoStatus(record.cpe_id, 'CERRADO', user.email)
      ;(['transporte', 'intervinientes', 'grano', 'procedencia', 'contingencias', 'descarga'] as DraftTabId[])
        .forEach(t => { clearTabDraft(id, t); tabDirtyRef.current.delete(t) })
      await reload()
      setShowConfirm(false)
      show('Descarga guardada → Cerrado', 'success')
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
      <TabBar activeTab={activeTab} onSelect={handleTabSelect} />

      {/* ── Content area (offset: header 56px + tabbar 44px) ─── */}
      <div className="max-w-mobile mx-auto px-4 space-y-4" style={{ paddingTop: '108px' }}>

        {/* ── TAB 1: TRANSPORTE ────────────────────────────── */}
        {activeTab === 'transporte' && (
          <>
            <SectionTitle>Transporte</SectionTitle>
            <ResponsableChip label="Admin Zonal" />
            <button
              type="button"
              onClick={() => setParserOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-secondary text-secondary font-sans text-sm font-medium mb-4 active:bg-blue-50"
            >
              <MessageSquare className="w-4 h-4" />
              Pegar mensaje WA
            </button>
            <FormField label="Cupo" value={transporteF.cupo} onChange={setT('cupo')} />
            <VoiceInput label="Empresa Transportista" value={transporteF.transporte} onChange={setT('transporte')} />
            <FormField
              label="CUIT Empresa Transportista"
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
            <FormField label="Fecha Partida" value={transporteF.fecha_partida} onChange={setT('fecha_partida')} type="datetime-local" />
            <FormField label="Kms. a recorrer" value={transporteF.km} onChange={setT('km')} type="number" />
            <FormField label="Tarifa" value={transporteF.tarifa} onChange={setT('tarifa')} type="number" />
            <FormField label="N° RUCA" value={transporteF.nro_ruca} onChange={setT('nro_ruca')} />
          </>
        )}

        {/* ── TAB 2: INTERVINIENTES ────────────────────────── */}
        {activeTab === 'intervinientes' && (
          <>
            <SectionTitle>Intervinientes (Sección A)</SectionTitle>
            <ResponsableChip label="Comercial / Log Central" />
            <VoiceInput label="Titular Carta de Porte"        value={intervinientesF.titular_nombre}            onChange={setI('titular_nombre')} />
            <FormField  label="CUIT Titular"                  value={intervinientesF.titular_cuit}              onChange={setI('titular_cuit')} />
            <VoiceInput label="Remitente Comercial Productor" value={intervinientesF.remitente_comercial_nombre} onChange={setI('remitente_comercial_nombre')} />
            <FormField  label="CUIT Remitente Comercial"      value={intervinientesF.remitente_comercial_cuit}  onChange={setI('remitente_comercial_cuit')} />
            <VoiceInput label="Rte. Comercial Venta Primaria"    value={intervinientesF.rte_venta_primaria}    onChange={setI('rte_venta_primaria')} />
            <FormField  label="CUIT Rte. Comercial Venta Primaria" value={intervinientesF.cuit_rte_venta_primaria} onChange={setI('cuit_rte_venta_primaria')} />
            <VoiceInput label="Rte. Comercial Venta Secundaria"  value={intervinientesF.rte_venta_secundaria}  onChange={setI('rte_venta_secundaria')} />
            <FormField  label="CUIT Rte. Comercial Venta Secundaria" value={intervinientesF.cuit_rte_venta_secundaria} onChange={setI('cuit_rte_venta_secundaria')} />
            <VoiceInput label="Rte. Comercial Venta Secundaria 2" value={intervinientesF.rte_venta_secundaria2} onChange={setI('rte_venta_secundaria2')} />
            <FormField  label="CUIT Rte. Comercial Venta Secundaria 2" value={intervinientesF.cuit_rte_venta_secundaria2} onChange={setI('cuit_rte_venta_secundaria2')} />
            <VoiceInput label="Mercado a Término"      value={intervinientesF.mercado_termino}      onChange={setI('mercado_termino')} />
            <VoiceInput label="Corredor Venta Primaria"      value={intervinientesF.corredor_primario}     onChange={setI('corredor_primario')} />
            <FormField  label="CUIT Corredor Venta Primaria" value={intervinientesF.cuit_corredor_primario} onChange={setI('cuit_corredor_primario')} />
            <VoiceInput label="Corredor Venta Secundaria"    value={intervinientesF.corredor_secundario}   onChange={setI('corredor_secundario')} />
            <FormField  label="CUIT Corredor Venta Secundaria" value={intervinientesF.cuit_corredor_secundario} onChange={setI('cuit_corredor_secundario')} />
            <VoiceInput label="Representante Entregador"      value={intervinientesF.repr_entregador}      onChange={setI('repr_entregador')} />
            <FormField  label="CUIT Representante Entregador" value={intervinientesF.cuit_repr_entregador} onChange={setI('cuit_repr_entregador')} />
            <VoiceInput label="Representante Recibidor"       value={intervinientesF.repr_recibidor}       onChange={setI('repr_recibidor')} />
            <FormField  label="CUIT Representante Recibidor"  value={intervinientesF.cuit_repr_recibidor}  onChange={setI('cuit_repr_recibidor')} />
            <VoiceInput label="Destinatario"      value={intervinientesF.destinatario}      onChange={setI('destinatario')} />
            <FormField  label="CUIT Destinatario" value={intervinientesF.cuit_destinatario} onChange={setI('cuit_destinatario')} />
            <VoiceInput label="Destino"      value={intervinientesF.destino}      onChange={setI('destino')} />
            <FormField  label="CUIT Destino" value={intervinientesF.cuit_destino} onChange={setI('cuit_destino')} />
            <VoiceInput label="Flete Pagador"        value={intervinientesF.pagador_flete}      onChange={setI('pagador_flete')} />
            <FormField  label="CUIT Flete Pagador"   value={intervinientesF.cuit_pagador_flete} onChange={setI('cuit_pagador_flete')} />
            <VoiceInput label="Intermediario de Flete"     value={intervinientesF.intermediario_flete} onChange={setI('intermediario_flete')} />
            <FormField  label="CUIT Intermediario de Flete" value={intervinientesF.cuit_intermediario}  onChange={setI('cuit_intermediario')} />
          </>
        )}

        {/* ── TAB 3: GRANO / ESPECIE ───────────────────────── */}
        {activeTab === 'grano' && (
          <>
            <SectionTitle>Grano / Especie (Sección B)</SectionTitle>
            <ResponsableChip label="Agro / Producción" />
            <SelectField label="Grano"    value={granoF.grano}    onChange={setG('grano')}    options={GRANOS} />
            <SelectField label="Variedad" value={granoF.variedad} onChange={setG('variedad')} options={VARIEDADES} />
            <SelectField
              label="Declaración de Calidad"
              value={granoF.declaracion_calidad}
              onChange={setG('declaracion_calidad')}
              options={['conforme', 'condicional']}
            />
            <FormField label="Campaña" value={granoF.campania} onChange={setG('campania')} />
            <FormField label="Peso Bruto"       value={granoF.kg_bruto_cargados} onChange={setG('kg_bruto_cargados')} type="number" />
            <FormField label="Peso Tara"        value={granoF.kg_tara_cargados}  onChange={setG('kg_tara_cargados')}  type="number" />
            <KgNetoField label="Kg Neto cargados" bruto={granoF.kg_bruto_cargados} tara={granoF.kg_tara_cargados} />
            <FormField label="Kg Estimados"     value={granoF.kg_estimados}       onChange={setG('kg_estimados')}       type="number" />
            <VoiceInput label="Observaciones"   value={granoF.observaciones}       onChange={setG('observaciones')} multiline rows={3} />
          </>
        )}

        {/* ── TAB 4: PROCEDENCIA ───────────────────────────── */}
        {activeTab === 'procedencia' && (
          <>
            <SectionTitle>Procedencia — Origen (Sección C)</SectionTitle>
            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="es_campo_origen"
                checked={procedenciaF.es_campo_origen}
                onChange={e => { tabDirtyRef.current.add('procedencia'); setProcedenciaF(p => ({ ...p, es_campo_origen: e.target.checked })) }}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: '#2C9FC0' }}
              />
              <label htmlFor="es_campo_origen" className="font-mono text-xs font-medium text-primary uppercase tracking-wide cursor-pointer">
                Es un campo
              </label>
            </div>
            <SelectField label="Localidad"        value={procedenciaF.localidad}       onChange={setP('localidad')}       options={LOCALIDADES} />
            <FormField   label="Provincia Origen" value={procedenciaF.provincia_origen} onChange={setP('provincia_origen')} />
            <GPSInput latitud={procedenciaF.latitud} longitud={procedenciaF.longitud} onChangeCoords={setGpsP} />
            <FormField label="Descripción"  value={procedenciaF.descripcion_origen} onChange={setP('descripcion_origen')} />
            <FormField label="RENSPA"       value={procedenciaF.renspa}             onChange={setP('renspa')} />
            <SelectField label="Campo"      value={procedenciaF.campo}              onChange={setP('campo')}  options={CAMPOS} />

            <SectionTitle className="mt-2">Destino de la Mercadería (Sección D)</SectionTitle>
            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="es_campo_destino"
                checked={procedenciaF.es_campo_destino}
                onChange={e => { tabDirtyRef.current.add('procedencia'); setProcedenciaF(p => ({ ...p, es_campo_destino: e.target.checked })) }}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: '#2C9FC0' }}
              />
              <label htmlFor="es_campo_destino" className="font-mono text-xs font-medium text-primary uppercase tracking-wide cursor-pointer">
                Es un campo (Destino)
              </label>
            </div>
            <FormField label="N° Planta"           value={procedenciaF.nro_planta}        onChange={setP('nro_planta')} />
            <FormField label="Dirección"           value={procedenciaF.direccion_destino} onChange={setP('direccion_destino')} />
            <FormField label="Localidad (Destino)" value={procedenciaF.localidad_destino} onChange={setP('localidad_destino')} />
            <FormField label="Provincia Destino"   value={procedenciaF.provincia_destino} onChange={setP('provincia_destino')} />
          </>
        )}

        {/* ── TAB 5: CONTINGENCIAS ─────────────────────────── */}
        {activeTab === 'contingencias' && (
          <>
            <SectionTitle>Contingencias (Sección F)</SectionTitle>
            {!contingenciasF.contingencia && !contingenciasF.contingencia_otro &&
             !contingenciasF.desactivacion && !contingenciasF.desactivacion_otro ? (
              <div className="flex items-center justify-center py-8 px-4 rounded-2xl bg-gray-50 border border-dashed border-gray-light">
                <p className="font-sans text-sm text-text-muted">Sin contingencias registradas</p>
              </div>
            ) : null}
            <FormField label="Contingencia" value={contingenciasF.contingencia}      onChange={setCt('contingencia')} />
            <FormField label="Otro"         value={contingenciasF.contingencia_otro} onChange={setCt('contingencia_otro')} />
            <FormField label="Desactivación" value={contingenciasF.desactivacion}     onChange={setCt('desactivacion')} />
            <FormField label="Otro"          value={contingenciasF.desactivacion_otro} onChange={setCt('desactivacion_otro')} />
          </>
        )}

        {/* ── TAB 6: DESCARGA ──────────────────────────────── */}
        {activeTab === 'descarga' && (
          <>
            <SectionTitle>Descarga (Sección G)</SectionTitle>
            <ResponsableChip label="Agro / Producción" />
            {descargaReadOnly ? (
              <>
                <ReadOnlyField label="Fecha Arribo"    value={descargaF.fecha_arribo}    />
                <ReadOnlyField label="Fecha Descarga"  value={descargaF.fecha_descarga}  />
                <ReadOnlyField label="N° Turno"        value={descargaF.nro_turno}        />
                <ReadOnlyField label="Peso Bruto (kg)" value={descargaF.kg_bruto_descargados} />
                <ReadOnlyField label="Peso Tara (kg)"  value={descargaF.kg_tara_descargados}  />
                <ReadOnlyField label="Localidad (Descarga)"  value={descargaF.localidad_descarga}  />
                <ReadOnlyField label="Provincia (Descarga)"  value={descargaF.provincia_descarga}  />
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                  <span className="font-sans text-sm text-green-700 font-medium">
                    Cupo cerrado — solo lectura
                  </span>
                </div>
                <Button
                  fullWidth
                  loading={generando}
                  onClick={handleGenerarCP}
                  style={{ backgroundColor: '#1E3252' }}
                >
                  Generar CP
                </Button>
              </>
            ) : (
              <>
                <FormField label="Fecha Arribo"   value={descargaF.fecha_arribo}   onChange={setDe('fecha_arribo')}   type="datetime-local" />
                <FormField label="Fecha Descarga" value={descargaF.fecha_descarga} onChange={setDe('fecha_descarga')} type="datetime-local" />
                <FormField label="N° Turno"        value={descargaF.nro_turno}        onChange={setDe('nro_turno')} />
                <FormField label="Peso Bruto (kg)" value={descargaF.kg_bruto_descargados} onChange={setDe('kg_bruto_descargados')} type="number" />
                <FormField label="Peso Tara (kg)"  value={descargaF.kg_tara_descargados}  onChange={setDe('kg_tara_descargados')}  type="number" />
                <KgNetoField label="Kg Neto descargados" bruto={descargaF.kg_bruto_descargados} tara={descargaF.kg_tara_descargados} />
                <FormField label="Localidad (Descarga)"  value={descargaF.localidad_descarga}  onChange={setDe('localidad_descarga')} />
                <FormField label="Provincia (Descarga)"  value={descargaF.provincia_descarga}  onChange={setDe('provincia_descarga')} />
                <Button
                  fullWidth
                  loading={generando}
                  onClick={() => void handleGenerarCP()}
                  style={{ backgroundColor: '#1E3252' }}
                >
                  {generando ? 'Enviando…' : 'Generar CP'}
                </Button>
              </>
            )}
          </>
        )}

        {/* ── TAB 7: HISTORIAL ─────────────────────────────── */}
        {activeTab === 'historial' && (
          <>
            <SectionTitle>Historial de cambios</SectionTitle>
            <HistoryPanel entries={audit} />
          </>
        )}
      </div>

      {/* ── Bottom action buttons ────────────────────────────── */}
      {activeTab === 'transporte' && (
        <BottomBar>
          <Button
            fullWidth size="lg" loading={saving}
            disabled={hasTransporteErrors}
            onClick={handleSaveTransporte}
            style={{ backgroundColor: '#2C9FC0' }}
          >
            Guardar → Transporte Asignado
          </Button>
        </BottomBar>
      )}

      {activeTab === 'intervinientes' && (
        <BottomBar>
          <Button fullWidth size="lg" loading={saving} onClick={handleSaveIntervinientes}>
            Guardar cambios
          </Button>
        </BottomBar>
      )}

      {activeTab === 'grano' && (
        <BottomBar>
          <Button
            fullWidth size="lg" loading={saving}
            onClick={handleSaveGrano}
            style={{ backgroundColor: '#FF6C02' }}
          >
            Guardar → Cargado
          </Button>
        </BottomBar>
      )}

      {activeTab === 'procedencia' && (
        <BottomBar>
          <Button fullWidth size="lg" loading={saving} onClick={handleSaveProcedencia}>
            Guardar cambios
          </Button>
        </BottomBar>
      )}

      {activeTab === 'contingencias' && (
        <BottomBar>
          <Button fullWidth size="lg" loading={saving} onClick={handleSaveContingencias}>
            Guardar cambios
          </Button>
        </BottomBar>
      )}

      {activeTab === 'descarga' && !descargaReadOnly && (
        <BottomBar>
          <Button
            fullWidth size="lg" loading={saving}
            onClick={() => setShowConfirm(true)}
          >
            Cerrar cupo
          </Button>
        </BottomBar>
      )}

      {/* ── Confirm modal (Descarga/Cierre) ─────────────────── */}
      {showConfirm && (
        <ConfirmModal
          code={displayCode}
          saving={saving}
          onConfirm={handleSaveDescarga}
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
              <Button variant="ghost" fullWidth onClick={() => setDeleteConfirm(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button fullWidth loading={saving} onClick={handleDeleteCupo} style={{ backgroundColor: '#DC2626' }}>
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
              <Button variant="ghost" fullWidth onClick={() => setCancelConfirm(false)} disabled={saving}>
                Volver
              </Button>
              <Button fullWidth loading={saving} onClick={handleCancelCupo} style={{ backgroundColor: '#FF6C02' }}>
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

      {/* ── CP campos faltantes ────────────────────────────────── */}
      {cpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-safe">
          <div className="w-full max-w-mobile bg-white rounded-2xl p-5 space-y-4 mb-4">
            <p className="font-sans font-semibold text-primary text-base">
              Faltan datos para generar la CP
            </p>
            <div className="space-y-3">
              {cpMissing.map(({ section, missing }) => (
                <div key={section}>
                  <p className="font-mono text-xs font-bold text-text-muted uppercase tracking-wide mb-1">
                    {section}
                  </p>
                  <ul className="space-y-0.5">
                    {missing.map(label => (
                      <li key={label} className="font-sans text-sm text-primary flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => void handleGenerarIgual()}
                className="w-full h-12 rounded-xl font-sans font-semibold text-white text-sm active:opacity-80 transition"
                style={{ backgroundColor: '#1E3252' }}
              >
                Generar CP igual
              </button>
              <button
                onClick={() => setCpModalOpen(false)}
                className="w-full h-11 rounded-xl font-sans text-sm font-medium border border-gray-200 text-primary active:bg-gray-50"
              >
                Seguir completando
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
