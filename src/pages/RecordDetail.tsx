import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Clock, FileText } from 'lucide-react'
import Header from '../components/layout/Header'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { getRecord, getAuditLog } from '../lib/storage'
import { formatDateTime } from '../lib/dateUtils'
import type { CpeRecord, AuditEntry } from '../types'
import { FIELD_LABELS } from '../types'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  IMPORTADO:  { bg: '#2C9FC0', text: '#ffffff' },
  TRANSPORTE: { bg: '#F59E0B', text: '#1E3252' },
  CARGADO:    { bg: '#FF6C02', text: '#ffffff' },
  CERRADO:    { bg: '#16A34A', text: '#ffffff' },
  ENVIADO:    { bg: '#15803D', text: '#ffffff' },
}

const SECTIONS: { title: string; fields: (keyof CpeRecord)[] }[] = [
  { title: 'General', fields: ['fecha_carga', 'campo', 'localidad', 'grano', 'variedad'] },
  {
    title: 'Comercial',
    fields: [
      'destinatario', 'cuit_destinatario', 'destino', 'cuit_destino',
      'rte_venta_primaria', 'rte_venta_secundaria', 'rte_venta_secundaria2',
      'mercado_termino', 'corredor_primario', 'corredor_secundario',
      'repr_entregador', 'repr_recibidor',
    ],
  },
  {
    title: 'Flete',
    fields: ['km', 'tarifa', 'pagador_flete', 'cupo', 'intermediario_flete', 'cuil_intermediario', 'observaciones'],
  },
  {
    title: 'Transporte',
    fields: ['transporte', 'cuit_transporte', 'chofer', 'cuil_chofer', 'chasis', 'acoplado'],
  },
  {
    title: 'Pesaje',
    fields: [
      'kg_bruto_cargados', 'kg_tara_cargados', 'kg_estimados', 'kg_reales',
      'kg_bruto_descargados', 'kg_tara_descargados',
    ],
  },
  { title: 'Cierre', fields: ['nro_ruca', 'ingeniero', 'contacto', 'gps'] },
]

function DataTab({ record }: { record: CpeRecord }) {
  return (
    <div className="space-y-6">
      {SECTIONS.map(({ title, fields }) => {
        const pairs = fields
          .map((f) => [FIELD_LABELS[f] ?? f, record[f]] as [string, unknown])
          .filter(([, v]) => v !== null && v !== undefined && v !== '')

        if (pairs.length === 0) return null

        return (
          <div key={title} className="bg-white border border-gray-light rounded-2xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-light">
              <span className="font-mono text-xs font-bold text-text-muted uppercase tracking-widest">
                {title}
              </span>
            </div>
            <div className="divide-y divide-gray-light">
              {pairs.map(([label, val]) => (
                <div key={label} className="flex justify-between items-start px-4 py-3 gap-4">
                  <span className="font-mono text-xs text-text-muted shrink-0 pt-0.5">{label}</span>
                  <span className="font-sans text-sm text-primary text-right break-all">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HistoryTab({ entries }: { entries: AuditEntry[] }) {
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
      {entries.map((entry) => (
        <div key={entry.id} className="bg-white border border-gray-light rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge
              label={entry.action}
              variant={entry.action === 'CREACIÓN' ? 'green' : 'orange'}
            />
            <span className="font-mono text-xs text-text-muted">{formatDateTime(entry.created_at)}</span>
          </div>
          <p className="font-sans text-xs text-text-muted">{entry.user_email}</p>
          {entry.field_name && (
            <div className="mt-1 space-y-0.5">
              <p className="font-mono text-xs text-secondary">{FIELD_LABELS[entry.field_name] ?? entry.field_name}</p>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {entry.old_value && (
                  <span className="font-sans line-through text-text-muted">{entry.old_value}</span>
                )}
                {entry.old_value && <span className="text-text-muted">→</span>}
                <span className="font-sans text-primary font-medium">{entry.new_value ?? '—'}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<CpeRecord | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [tab, setTab] = useState<'datos' | 'historial'>('datos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getRecord(id)
      .then(async (rec) => {
        setRecord(rec)
        if (rec) {
          const log = await getAuditLog(rec.cpe_id)
          setAudit(log)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Cargando…" showBack />
        <div className="max-w-mobile mx-auto px-4 pt-20 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-gray-light animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="No encontrado" showBack />
        <div className="max-w-mobile mx-auto px-4 pt-20 text-center">
          <p className="font-sans text-text-muted">Registro no encontrado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header
        title={record.cpe_id}
        showBack
        rightElement={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/registro/${id}/editar`)}
            className="border-white/30 text-white hover:bg-white/10 h-9 px-3"
          >
            <Pencil className="w-4 h-4" /> Editar
          </Button>
        }
      />

      <div className="max-w-mobile mx-auto px-4 pt-20">
        {/* Status + meta */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold"
            style={{
              backgroundColor: (STATUS_COLORS[record.status] ?? STATUS_COLORS.IMPORTADO).bg,
              color:           (STATUS_COLORS[record.status] ?? STATUS_COLORS.IMPORTADO).text,
            }}
          >
            {record.status}
          </span>
          <span className="font-sans text-xs text-text-muted">{record.created_by}</span>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-light rounded-xl p-1 mb-4 gap-1">
          {(['datos', 'historial'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg font-mono text-xs font-medium transition-all ${
                tab === t ? 'bg-white text-primary shadow-sm' : 'text-text-muted'
              }`}
            >
              {t === 'datos' ? <FileText className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {t === 'datos' ? 'Datos' : 'Historial'}
            </button>
          ))}
        </div>

        {tab === 'datos' ? <DataTab record={record} /> : <HistoryTab entries={audit} />}
      </div>
    </div>
  )
}
