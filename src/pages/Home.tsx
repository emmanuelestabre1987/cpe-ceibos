import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, RefreshCw, Mail, PenLine, Search, Inbox, Layers, Calendar, ChevronDown, Settings } from 'lucide-react'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import CupoCard from '../components/ui/CupoCard'
import ConnectionDot from '../components/ui/ConnectionDot'
import { useToast } from '../components/ui/Toast'
import { useRecords } from '../hooks/useRecords'
import { updateCupoStatus, deleteRecord } from '../lib/storage'
import { isAdmin } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'
import type { CpeRecord } from '../types'

// ── Date helpers ─────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function weekStartStr(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
  return mon.toISOString().slice(0, 10)
}

function formatGroupLabel(dateStr: string): string {
  if (!dateStr || dateStr === 'sin-fecha') return 'Sin fecha'
  const d = new Date(`${dateStr}T12:00:00`)
  const fmt = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value
  const raw = `${parts.weekday ?? ''} ${parts.day ?? ''} de ${parts.month ?? ''}`.trim()
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function formatDatePill(from: string, to: string): string {
  if (!from && !to) return 'Fecha'
  const fmt = (s: string) => {
    const d = new Date(`${s}T12:00:00`)
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }
  if (from && to && from === to) return fmt(from)
  return `${from ? fmt(from) : '…'} — ${to ? fmt(to) : '…'}`
}

// Convierte YYYY-MM-DD → DD/MM/AAAA para mostrar en el input
function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Convierte DD/MM/AAAA → YYYY-MM-DD para el estado interno
function displayToIso(display: string): string {
  const clean = display.replace(/[^\d/]/g, '')
  const parts = clean.split('/')
  if (parts.length !== 3) return ''
  const [d, m, y] = parts
  if (!d || !m || !y || y.length < 4) return ''
  const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  return isNaN(Date.parse(iso)) ? '' : iso
}

// ── Grouping ─────────────────────────────────────────────────

type DateGroup = { date: string; label: string; items: CpeRecord[] }

function buildGroups(records: CpeRecord[]): DateGroup[] {
  const map = new Map<string, CpeRecord[]>()
  for (const r of records) {
    const key = r.fecha_carga ?? 'sin-fecha'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, label: formatGroupLabel(date), items }))
}

// ── Status helpers ────────────────────────────────────────────

const STATUS_OPTS = ['IMPORTADO', 'TRANSPORTE', 'CARGADO', 'CERRADO', 'ENVIADO', 'CANCELADO'] as const

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  IMPORTADO:  { bg: '#2C9FC0', text: '#ffffff' },
  TRANSPORTE: { bg: '#F59E0B', text: '#1E3252' },
  CARGADO:    { bg: '#FF6C02', text: '#ffffff' },
  CERRADO:    { bg: '#16A34A', text: '#ffffff' },
  ENVIADO:    { bg: '#15803D', text: '#ffffff' },
  CANCELADO:  { bg: '#9CA3AF', text: '#ffffff' },
}

function normalizeStatusForFilter(s: string): string {
  return s.toUpperCase()
}

// ── Sub-components ────────────────────────────────────────────

interface FabActionProps {
  icon: React.ElementType
  label: string
  onClick: () => void
}

function FabAction({ icon: Icon, label, onClick }: FabActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 bg-white rounded-xl px-5 shadow-lg font-sans text-sm text-primary font-medium active:scale-95 transition-transform whitespace-nowrap"
      style={{ height: '48px' }}
    >
      <Icon className="w-4 h-4 text-secondary shrink-0" />
      {label}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-light shadow-sm overflow-hidden animate-pulse">
      <div className="px-4 pt-4 pb-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="h-4 w-36 bg-gray-200 rounded" />
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
        </div>
        <div className="h-4 w-52 bg-gray-200 rounded" />
        <div className="h-3 w-40 bg-gray-200 rounded" />
      </div>
      <div className="h-12 bg-gray-100 border-t border-gray-light" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { records, loading, refresh, setRecords } = useRecords()
  const { show, ToastComponent } = useToast()

  const [userIsAdmin,     setUserIsAdmin]     = useState(false)

  useEffect(() => {
    if (user?.email) {
      isAdmin(user.email).then(setUserIsAdmin).catch(() => {})
    }
  }, [user])

  const [query,           setQuery]           = useState('')
  const [dateFrom,        setDateFrom]        = useState(() => offsetDate(-1))
  const [dateTo,          setDateTo]          = useState(() => offsetDate(+1))
  const [filterStatus,    setFilterStatus]    = useState<Set<string>>(new Set())
  const [dateSheetOpen,   setDateSheetOpen]   = useState(false)
  const [statusSheetOpen, setStatusSheetOpen] = useState(false)
  const [fabOpen,         setFabOpen]         = useState(false)
  const [selectMode,      setSelectMode]      = useState(false)
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set())
  const [cancelConfirm,   setCancelConfirm]   = useState(false)
  const [cancelling,      setCancelling]      = useState(false)
  const [deleteConfirm,   setDeleteConfirm]   = useState(false)
  const [deleting,        setDeleting]        = useState(false)

  // ── Filtering ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (dateFrom && r.fecha_carga && r.fecha_carga < dateFrom) return false
      if (dateTo   && r.fecha_carga && r.fecha_carga > dateTo)   return false
      if (filterStatus.size > 0 && !filterStatus.has(normalizeStatusForFilter(r.status))) return false
      if (query.trim()) {
        const q   = query.toLowerCase()
        const hay = [r.cpe_id, r.cupo, r.destinatario, r.transporte, r.chofer]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [records, dateFrom, dateTo, filterStatus, query])

  const groups = useMemo(() => buildGroups(filtered), [filtered])

  // ── Handlers ────────────────────────────────────────────────
  const closeFab = () => setFabOpen(false)

  const handleCardClick = (id: string) => {
    closeFab()
    navigate(`/cupo/${id}`)
  }

  const handleActionClick = (id: string, tab: string) => {
    closeFab()
    if (tab === 'transporte') {
      navigate(`/asignar-transporte?ids=${id}`)
    } else {
      navigate(`/cupo/${id}?tab=${tab}`)
    }
  }

  const toggleSelectMode = () => {
    setSelectMode(v => !v)
    setSelectedIds(new Set())
    setFabOpen(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleStatus = (s: string) => {
    setFilterStatus(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const handleCancelSelected = async () => {
    if (!user?.email) return
    setCancelling(true)
    try {
      const toCancel = records.filter(r => selectedIds.has(r.id))
      await Promise.all(
        toCancel.map(r => updateCupoStatus(r.cpe_id, 'CANCELADO', user.email!))
      )
      show(`${selectedIds.size} ${selectedIds.size === 1 ? 'cupo cancelado' : 'cupos cancelados'}`, 'success')
      setSelectedIds(new Set())
      setSelectMode(false)
      setCancelConfirm(false)
      refresh()
    } catch {
      show('Error al cancelar los cupos', 'error')
    } finally {
      setCancelling(false)
    }
  }

  const allCancelled = selectedIds.size > 0 && Array.from(selectedIds).every(id =>
    records.find(r => r.id === id)?.status === 'CANCELADO'
  )

  const handleDeleteSelected = async () => {
    if (!user?.email) return
    setDeleting(true)
    try {
      const toDelete = records.filter(r => selectedIds.has(r.id))
      await Promise.all(toDelete.map(r => deleteRecord(r.id, user.email!)))
      // Optimistic update — sacar del estado local inmediatamente
      setRecords(prev => prev.filter(r => !selectedIds.has(r.id)))
      show(`${toDelete.length} ${toDelete.length === 1 ? 'cupo eliminado' : 'cupos eliminados'}`, 'success')
      setSelectedIds(new Set())
      setSelectMode(false)
      setDeleteConfirm(false)
    } catch {
      show('Error al eliminar los cupos', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-32" onClick={closeFab}>

      {/* ── Header ──────────────────────────────────────────── */}
      <Header
        title="Panel de Cupos"
        showLogout
        rightElement={
          <div className="flex items-center gap-1">
            {userIsAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="p-1.5 rounded-lg text-white hover:bg-white/20 transition"
                title="Panel Admin"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <ConnectionDot />
          </div>
        }
      />

      {/* ── Filter + search strip ───────────────────────────── */}
      <div
        className="pt-14"
        style={{ background: 'linear-gradient(180deg, #1E3252 0%, #162840 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="max-w-mobile md:max-w-desktop mx-auto">
          {/* Row 1: Date pill + Status pill */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <button
              onClick={() => setDateSheetOpen(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl font-sans font-medium transition-colors active:scale-[0.98] ${
                dateFrom || dateTo ? 'bg-secondary text-white' : 'bg-white/10 text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-xs">{formatDatePill(dateFrom, dateTo)}</span>
            </button>

            <button
              onClick={() => setStatusSheetOpen(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl font-sans font-medium transition-colors active:scale-[0.98] ${
                filterStatus.size > 0 ? 'bg-secondary text-white' : 'bg-white/10 text-white'
              }`}
            >
              <span className="truncate text-xs">
                {filterStatus.size === 0
                  ? 'Estado'
                  : filterStatus.size === 1
                    ? Array.from(filterStatus)[0]
                    : `${filterStatus.size} estados`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/70 shrink-0" />
            </button>
          </div>

          {/* Row 2: Search full-width */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 h-11">
              <Search className="w-4 h-4 text-white/60 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar código, destinatario, transporte…"
                className="flex-1 bg-transparent font-sans text-white text-sm placeholder:text-white/40 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-white/50 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Count + active filter badges + controls ─────────── */}
      <div className="max-w-mobile md:max-w-desktop mx-auto px-4 pt-3 pb-1 flex items-center gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="font-mono text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: '#FF6C02' }}
          >
            {filtered.length}
          </span>
          <span className="font-sans text-xs text-text-muted whitespace-nowrap">
            {filtered.length === 1 ? 'cupo' : 'cupos'}
          </span>
        </div>

        {!selectMode && (dateFrom || dateTo) && (
          <>
            <span className="text-text-muted/50 shrink-0 text-xs">·</span>
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="flex items-center gap-1 h-6 px-2 bg-secondary/10 text-secondary rounded-full text-xs font-sans font-medium shrink-0 active:scale-[0.98] transition-colors"
            >
              <span>{formatDatePill(dateFrom, dateTo)}</span>
              <X className="w-3 h-3" />
            </button>
          </>
        )}

        {!selectMode && filterStatus.size > 0 && (
          <>
            <span className="text-text-muted/50 shrink-0 text-xs">·</span>
            <button
              onClick={() => setFilterStatus(new Set())}
              className="flex items-center gap-1 h-6 px-2 bg-secondary/10 text-secondary rounded-full text-xs font-sans font-medium shrink-0 active:scale-[0.98] transition-colors"
            >
              <span>
                {filterStatus.size === 1
                  ? Array.from(filterStatus)[0]
                  : `${filterStatus.size} estados`}
              </span>
              <X className="w-3 h-3" />
            </button>
          </>
        )}

        <div className="flex-1" />

        <button
          onClick={refresh}
          className="text-text-muted hover:text-secondary transition p-1 shrink-0"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        {selectMode && (
          <button
            onClick={() => {
              const allIds = filtered.map(r => r.id)
              const allSelected = allIds.every(id => selectedIds.has(id))
              if (allSelected) {
                setSelectedIds(new Set())
              } else {
                setSelectedIds(new Set(allIds))
              }
            }}
            className="font-mono text-xs font-medium text-secondary shrink-0 active:opacity-70"
          >
            {filtered.every(r => selectedIds.has(r.id)) ? 'Deselec. todo' : 'Selec. todo'}
          </button>
        )}
        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-1 px-3 h-7 rounded-full font-mono text-xs font-medium transition-colors shrink-0 ${
            selectMode ? 'bg-secondary text-white' : 'text-text-muted hover:text-secondary'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {selectMode ? 'Cancelar' : 'Seleccionar'}
        </button>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="max-w-mobile md:max-w-desktop mx-auto px-4 pb-6">

        {loading && records.length === 0 && (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <Inbox className="w-14 h-14 text-gray-300 mx-auto" />
            <p className="font-mono text-text-muted text-sm">
              No hay cupos para estos filtros
            </p>
            <Button variant="secondary" onClick={() => navigate('/importar')}>
              <Mail className="w-4 h-4" />
              Importar email
            </Button>
          </div>
        )}

        {groups.map(({ date, label, items }) => (
          <div key={date} className="mb-5 mt-3">
            <p className="font-mono font-bold text-xs text-primary uppercase tracking-wide mb-2 px-0.5">
              {label}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((r) => (
                <CupoCard
                  key={r.id}
                  cupo={r}
                  onClick={() => handleCardClick(r.id)}
                  onActionClick={(tab) => handleActionClick(r.id, tab)}
                  selectable={selectMode}
                  selected={selectedIds.has(r.id)}
                  onToggleSelect={() => toggleSelect(r.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Selection action bar ─────────────────────────────── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-light px-4 py-3 pb-safe">
          <div className="max-w-mobile md:max-w-desktop mx-auto space-y-2">
            <p className="font-mono text-sm font-bold text-primary">
              {selectedIds.size} {selectedIds.size === 1 ? 'cupo seleccionado' : 'cupos seleccionados'}
            </p>
            <div className="flex gap-2">
              {allCancelled ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex-1 h-11 rounded-xl font-sans text-xs font-semibold border border-red-400 text-red-600 active:bg-red-50 transition"
                >
                  Eliminar
                </button>
              ) : (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="flex-1 h-11 rounded-xl font-sans text-xs font-semibold border border-orange-400 text-orange-600 active:bg-orange-50 transition"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  const ids = Array.from(selectedIds).join(',')
                  navigate(`/asignar-datos?ids=${ids}`)
                }}
                className="flex-1 h-11 rounded-xl font-sans text-xs font-semibold text-white transition active:scale-95"
                style={{ backgroundColor: '#1E3252' }}
              >
                Asignar datos
              </button>
              <button
                onClick={() => {
                  const ids = Array.from(selectedIds).join(',')
                  navigate(`/asignar-transporte?ids=${ids}`)
                }}
                className="flex-1 h-11 rounded-xl font-sans text-xs font-semibold text-white transition active:scale-95"
                style={{ backgroundColor: '#2C9FC0' }}
              >
                Transporte →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-safe">
          <div className="w-full max-w-mobile md:max-w-desktop bg-white rounded-2xl p-5 space-y-3 mb-4">
            <p className="font-sans font-semibold text-primary text-base">
              ¿Eliminar {selectedIds.size} {selectedIds.size === 1 ? 'cupo' : 'cupos'}?
            </p>
            <p className="font-sans text-sm text-text-muted">
              Esta acción es permanente y no se puede deshacer.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 h-11 rounded-xl font-sans text-sm font-medium border border-gray-200 text-primary active:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl font-sans text-sm font-semibold text-white bg-red-600 active:opacity-80 disabled:opacity-50"
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel confirmation modal ────────────────────────── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-safe">
          <div className="w-full max-w-mobile md:max-w-desktop bg-white rounded-2xl p-5 space-y-3 mb-4">
            <p className="font-sans font-semibold text-primary text-base">
              ¿Cancelar {selectedIds.size} {selectedIds.size === 1 ? 'cupo' : 'cupos'}?
            </p>
            <p className="font-sans text-sm text-text-muted">
              Los cupos quedarán registrados como CANCELADO. Esta acción no se puede deshacer desde la app.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setCancelConfirm(false)}
                className="flex-1 h-11 rounded-xl font-sans text-sm font-medium border border-gray-200 text-primary active:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={handleCancelSelected}
                disabled={cancelling}
                className="flex-1 h-11 rounded-xl font-sans text-sm font-semibold text-white active:opacity-80 transition disabled:opacity-50"
                style={{ backgroundColor: '#FF6C02' }}
              >
                {cancelling ? 'Cancelando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB ──────────────────────────────────────────────── */}
      {!selectMode && (
        <>
          {fabOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={(e) => { e.stopPropagation(); closeFab() }}
            />
          )}
          {fabOpen && (
            <div
              className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <FabAction icon={Mail} label="Importar email" onClick={() => navigate('/importar')} />
              <FabAction icon={PenLine} label="Carga manual" onClick={() => navigate('/nuevo')} />
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setFabOpen((v) => !v) }}
            className="fixed bottom-6 right-4 w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-all z-50"
            style={{
              backgroundColor: '#FF6C02',
              boxShadow: '0 6px 24px rgba(255, 108, 2, 0.45)',
            }}
            aria-label={fabOpen ? 'Cerrar menú' : 'Nueva acción'}
          >
            {fabOpen
              ? <X    className="w-7 h-7 text-white" />
              : <Plus className="w-8 h-8 text-white" />
            }
          </button>
        </>
      )}

      {/* ── Date range bottom sheet ───────────────────────────── */}
      {dateSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setDateSheetOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-mono font-bold text-primary text-base">Rango de fechas</h3>
              <button
                onClick={() => setDateSheetOpen(false)}
                className="p-1 text-text-muted active:scale-[0.98] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick shortcuts */}
            <div className="grid grid-cols-4 gap-2">
              {([
                { label: 'Ayer',        from: offsetDate(-1), to: offsetDate(-1) },
                { label: 'Hoy',         from: todayStr(),     to: todayStr()     },
                { label: 'Esta semana', from: weekStartStr(), to: ''             },
                { label: 'Todo',        from: '',             to: ''             },
              ] as const).map(({ label, from, to }) => (
                <button
                  key={label}
                  onClick={() => { setDateFrom(from); setDateTo(to) }}
                  className={`h-10 rounded-xl text-xs font-sans font-medium transition-colors active:scale-[0.98] ${
                    dateFrom === from && dateTo === to
                      ? 'bg-secondary text-white'
                      : 'bg-gray-100 text-primary active:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Date inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-sans text-xs text-text-muted mb-1.5">Desde</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  value={isoToDisplay(dateFrom)}
                  onChange={(e) => {
                    const iso = displayToIso(e.target.value)
                    if (iso || e.target.value === '') setDateFrom(iso)
                  }}
                  maxLength={10}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 font-sans text-sm text-primary focus:outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-text-muted mb-1.5">Hasta</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  value={isoToDisplay(dateTo)}
                  onChange={(e) => {
                    const iso = displayToIso(e.target.value)
                    if (iso || e.target.value === '') setDateTo(iso)
                  }}
                  maxLength={10}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 font-sans text-sm text-primary focus:outline-none focus:border-secondary"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="flex-1 h-11 rounded-xl font-sans text-sm font-medium border border-gray-200 text-text-muted active:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={() => setDateSheetOpen(false)}
                className="flex-1 h-11 rounded-xl font-sans text-sm font-semibold text-white active:opacity-80 transition-colors"
                style={{ backgroundColor: '#1E3252' }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status bottom sheet ──────────────────────────────── */}
      {statusSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setStatusSheetOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-5 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-mono font-bold text-primary text-base">Estado</h3>
              <button
                onClick={() => setStatusSheetOpen(false)}
                className="p-1 text-text-muted active:scale-[0.98] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setFilterStatus(new Set())}
              className="w-full flex items-center justify-between h-12 px-4 rounded-xl bg-gray-50 font-sans text-sm text-primary font-medium active:bg-gray-100 transition-colors"
            >
              <span>Todos los estados</span>
              {filterStatus.size === 0 && <span className="text-secondary font-bold">✓</span>}
            </button>

            {STATUS_OPTS.map((status) => {
              const { bg, text } = STATUS_COLORS[status]
              const active = filterStatus.has(status)
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className="w-full flex items-center justify-between h-12 px-4 rounded-xl font-mono text-sm font-semibold active:opacity-80 transition-colors"
                  style={{
                    backgroundColor: active ? bg : `${bg}22`,
                    color: active ? text : bg,
                    border: `2px solid ${active ? bg : `${bg}44`}`,
                  }}
                >
                  <span>{status}</span>
                  {active && <span>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
