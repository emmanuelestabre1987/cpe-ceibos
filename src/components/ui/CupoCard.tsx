import React from 'react'
import { Truck, Scale, CheckCircle, Eye, ChevronRight } from 'lucide-react'
import type { CpeRecord } from '../../types'
import { format } from '../../lib/dateUtils'

// ── Types ────────────────────────────────────────────────────

type TabTarget = 'transporte' | 'pesaje' | 'cierre' | 'datos'
type CupoStatus = 'IMPORTADO' | 'TRANSPORTE' | 'CARGADO' | 'CERRADO' | 'ENVIADO' | 'CANCELADO'

export interface CupoCardProps {
  cupo: CpeRecord
  onClick: () => void
  onActionClick: (tab: TabTarget) => void
  // Selection mode (all optional — no-op when omitted)
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

// ── Config maps ──────────────────────────────────────────────

const STATUS_CONFIG: Record<CupoStatus, { bg: string; label: string; text: string }> = {
  IMPORTADO:  { bg: '#2C9FC0', label: 'IMPORTADO',  text: '#ffffff' },
  TRANSPORTE: { bg: '#F59E0B', label: 'TRANSPORTE', text: '#1E3252' },
  CARGADO:    { bg: '#FF6C02', label: 'CARGADO',    text: '#ffffff' },
  CERRADO:    { bg: '#16A34A', label: 'CERRADO',    text: '#ffffff' },
  ENVIADO:    { bg: '#15803D', label: 'ENVIADO',    text: '#ffffff' },
  CANCELADO:  { bg: '#9CA3AF', label: 'CANCELADO', text: '#ffffff' },
}

const ACTION_CONFIG: Record<CupoStatus, { label: string; Icon: React.ElementType; tab: TabTarget }> = {
  IMPORTADO:  { label: 'Asignar transporte', Icon: Truck,       tab: 'transporte' },
  TRANSPORTE: { label: 'Registrar pesaje',   Icon: Scale,       tab: 'pesaje'     },
  CARGADO:    { label: 'Cerrar cupo',        Icon: CheckCircle, tab: 'cierre'     },
  CERRADO:    { label: 'Ver detalle',        Icon: Eye,         tab: 'datos'      },
  ENVIADO:    { label: 'Ver detalle',        Icon: Eye,         tab: 'datos'      },
  CANCELADO:  { label: 'Ver detalle',        Icon: Eye,         tab: 'datos'      },
}

// Maps legacy DB status values to the current display statuses
function normalizeStatus(status: string): CupoStatus {
  const u = status.toUpperCase()
  if (u in STATUS_CONFIG) return u as CupoStatus
  if (status === 'Enviado') return 'ENVIADO'
  return 'IMPORTADO'
}

// ── Component ────────────────────────────────────────────────

export default function CupoCard({
  cupo,
  onClick,
  onActionClick,
  selectable,
  selected,
  onToggleSelect,
}: CupoCardProps) {
  const status = normalizeStatus(cupo.status)
  const { bg, label: statusLabel, text } = STATUS_CONFIG[status]
  const { label: actionLabel, Icon: ActionIcon, tab } = ACTION_CONFIG[status]

  const displayCode = cupo.cupo ?? cupo.cpe_id

  const line2 = [
    cupo.grano,
    cupo.destinatario,
    cupo.kg_estimados != null
      ? `${cupo.kg_estimados.toLocaleString('es-AR')} kg`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const line3 = [cupo.localidad, format(cupo.fecha_carga)]
    .filter(Boolean)
    .join(' · ')

  const handleCardClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect()
    } else {
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-all ${
        selected ? 'border-secondary border-2' : 'border-gray-light'
      }`}
    >
      {/* ── Body ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        {/* Row 1: checkbox (if selectable) + code + badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          {selectable && (
            <div className="shrink-0 mt-0.5">
              {selected
                ? <CheckCircle className="w-5 h-5 text-secondary" />
                : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              }
            </div>
          )}
          <p className="font-mono font-bold text-primary text-sm leading-snug flex-1 min-w-0 break-all">
            {displayCode}
          </p>
          <span
            className="shrink-0 inline-block px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold leading-5"
            style={{ backgroundColor: bg, color: text }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Row 2: grano · destinatario · kg */}
        {line2 && (
          <p className="font-sans text-sm font-medium text-primary truncate mb-0.5">
            {line2}
          </p>
        )}

        {/* Row 3: localidad · fecha */}
        {line3 && (
          <p className="font-sans text-xs text-text-muted">
            {line3}
          </p>
        )}
      </div>

      {/* ── Action strip: hidden in selection mode ────────── */}
      {!selectable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onActionClick(tab)
          }}
          className="w-full flex items-center justify-end gap-2 px-4 border-t border-gray-light bg-gray-50 text-secondary font-sans text-sm font-medium hover:bg-orange-50 active:bg-orange-100 transition-colors"
          style={{ minHeight: '48px' }}
        >
          <ActionIcon className="w-4 h-4 shrink-0" />
          <span>{actionLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
        </button>
      )}
    </div>
  )
}
