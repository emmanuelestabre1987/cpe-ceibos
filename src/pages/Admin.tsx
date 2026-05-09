import React, { useState, useEffect } from 'react'
import { UserPlus, Trash2, Search, Users, Activity, BarChart3, Package } from 'lucide-react'
import Header from '../components/layout/Header'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import {
  getAuthorizedEmails,
  addAuthorizedEmail,
  removeAuthorizedEmail,
  getAllAuditLog,
  getRecords,
  updateCupoStatus,
  deleteRecord,
} from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { isAdmin } from '../lib/auth'
import { formatDateTime } from '../lib/dateUtils'
import { FIELD_LABELS, CPE_STATUS_ORDER, type CpeStatus } from '../types'
import type { AuthorizedEmail, AuditEntry, CpeRecord } from '../types'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { show, ToastComponent } = useToast()
  const [tab, setTab] = useState<'usuarios' | 'logs' | 'stats' | 'cupos'>('usuarios')
  const [adminOk, setAdminOk] = useState<boolean | null>(null)

  // Usuarios
  const [emails, setEmails] = useState<AuthorizedEmail[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)

  // Logs
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [logQuery, setLogQuery] = useState('')

  // Stats
  const [records, setRecords] = useState<CpeRecord[]>([])

  // Cupos tab
  const [cupoStatus, setCupoStatus] = useState<CpeStatus | 'TODOS'>('TODOS')
  const [cupoGrano,  setCupoGrano]  = useState('')
  const [cupoSearch, setCupoSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email) return
    isAdmin(user.email).then((ok) => {
      setAdminOk(ok)
      if (!ok) navigate('/')
    })
  }, [user, navigate])

  useEffect(() => {
    if (!adminOk) return
    getAuthorizedEmails().then(setEmails).catch(() => show('Error al cargar usuarios', 'error'))
    getAllAuditLog().then(setLogs).catch(() => show('Error al cargar logs', 'error'))
    getRecords().then(setRecords).catch(() => show('Error al cargar registros', 'error'))
  }, [adminOk]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddEmail = async () => {
    if (!newEmail.trim() || !user?.email) return
    setAddingEmail(true)
    try {
      await addAuthorizedEmail(newEmail, user.email)
      setEmails(await getAuthorizedEmails())
      setNewEmail('')
      show('Email agregado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setAddingEmail(false)
    }
  }

  const handleCupoStatusChange = async (cpeId: string, newStatus: CpeStatus) => {
    if (!user?.email) return
    try {
      await updateCupoStatus(cpeId, newStatus, user.email)
      setRecords(await getRecords())
      show('Estado actualizado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    }
  }

  const handleDeleteCupo = async (id: string) => {
    if (!confirm('¿Eliminar este cupo? Esta acción no se puede deshacer.')) return
    if (!user?.email) return
    setDeletingId(id)
    try {
      await deleteRecord(id, user.email)
      setRecords(await getRecords())
      show('Cupo eliminado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRemoveEmail = async (id: string, email: string) => {
    if (!confirm(`¿Eliminar ${email}?`)) return
    try {
      await removeAuthorizedEmail(id)
      setEmails((prev) => prev.filter((e) => e.id !== id))
      show('Email eliminado', 'success')
    } catch (e) {
      show((e as Error).message, 'error')
    }
  }

  const filteredLogs = logs.filter((l) => {
    if (!logQuery.trim()) return true
    const q = logQuery.toLowerCase()
    return l.record_id.toLowerCase().includes(q) || l.user_email.toLowerCase().includes(q)
  })

  // Cupos filtering
  const filteredCupos = records.filter(r => {
    if (cupoStatus !== 'TODOS' && r.status !== cupoStatus) return false
    if (cupoGrano && r.grano !== cupoGrano) return false
    if (cupoSearch.trim()) {
      const q = cupoSearch.toLowerCase()
      return (
        r.cpe_id.toLowerCase().includes(q) ||
        (r.cupo ?? '').toLowerCase().includes(q) ||
        (r.destinatario ?? '').toLowerCase().includes(q) ||
        (r.campo ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const granosUnicos = Array.from(new Set(records.map(r => r.grano).filter(Boolean))) as string[]

  // Stats
  const granoCount = records.reduce<Record<string, number>>((acc, r) => {
    if (r.grano) acc[r.grano] = (acc[r.grano] ?? 0) + 1
    return acc
  }, {})
  const totalMods = logs.filter((l) => l.action === 'MODIFICACIÓN').length
  const uniqueUsers = new Set(records.map((r) => r.created_by).filter(Boolean)).size

  if (adminOk === null) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header title="Panel Admin" showBack showLogout />

      <div className="max-w-mobile mx-auto px-4 pt-20">
        {/* Tabs */}
        <div className="flex bg-gray-light rounded-xl p-1 mb-4 gap-1">
          {([
            { id: 'usuarios', icon: Users,     label: 'Usuarios' },
            { id: 'logs',     icon: Activity,  label: 'Logs'     },
            { id: 'stats',    icon: BarChart3, label: 'Stats'    },
            { id: 'cupos',    icon: Package,   label: 'Cupos'    },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1 h-9 rounded-lg font-mono text-xs font-medium transition-all ${
                tab === id ? 'bg-white text-primary shadow-sm' : 'text-text-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Usuarios */}
        {tab === 'usuarios' && (
          <div className="space-y-3">
            {/* Add email */}
            <div className="bg-white border border-gray-light rounded-2xl p-4 space-y-3">
              <p className="font-mono text-xs font-bold text-text-muted uppercase tracking-widest">Agregar email</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  className="flex-1 h-11 px-4 rounded-xl border border-gray-light font-sans text-sm text-primary focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                />
                <Button size="sm" onClick={handleAddEmail} loading={addingEmail}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {emails.map((e) => (
              <div key={e.id} className="bg-white border border-gray-light rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-sm text-primary truncate">{e.email}</p>
                  <p className="font-mono text-xs text-text-muted">{e.created_by ?? '—'}</p>
                </div>
                <button
                  onClick={() => handleRemoveEmail(e.id, e.email)}
                  className="text-text-muted hover:text-red-600 transition p-1 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Logs */}
        {tab === 'logs' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white border border-gray-light rounded-xl px-4 h-11">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                type="search"
                value={logQuery}
                onChange={(e) => setLogQuery(e.target.value)}
                placeholder="Buscar por CPE ID o usuario…"
                className="flex-1 bg-transparent font-sans text-sm text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>

            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-white border border-gray-light rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{log.record_id}</span>
                    <Badge label={log.action} variant={log.action === 'CREACIÓN' ? 'green' : 'orange'} />
                  </div>
                  <span className="font-mono text-xs text-text-muted">{formatDateTime(log.created_at)}</span>
                </div>
                <p className="font-sans text-xs text-text-muted">{log.user_email}</p>
                {log.field_name && (
                  <p className="font-mono text-xs text-secondary">
                    {FIELD_LABELS[log.field_name] ?? log.field_name}:{' '}
                    <span className="line-through text-text-muted">{log.old_value}</span>{' → '}
                    <span className="text-primary">{log.new_value}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Registros', value: records.length },
                { label: 'Modificaciones', value: totalMods },
                { label: 'Usuarios activos', value: uniqueUsers },
                { label: 'Emails auth.', value: emails.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-light rounded-2xl p-4 text-center">
                  <p className="font-mono font-black text-3xl text-primary">{value}</p>
                  <p className="font-sans text-xs text-text-muted mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-light rounded-2xl p-4">
              <p className="font-mono text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
                Registros por grano
              </p>
              <div className="space-y-2">
                {Object.entries(granoCount)
                  .sort(([, a], [, b]) => b - a)
                  .map(([grano, count]) => (
                    <div key={grano} className="flex items-center gap-3">
                      <span className="font-sans text-sm text-primary w-24 shrink-0">{grano}</span>
                      <div className="flex-1 bg-gray-light rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${(count / records.length) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-text-muted w-6 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Cupos */}
        {tab === 'cupos' && (
          <div className="space-y-3">
            {/* Filtros */}
            <div className="flex items-center gap-2 bg-white border border-gray-light rounded-xl px-3 h-11">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                type="search"
                value={cupoSearch}
                onChange={e => setCupoSearch(e.target.value)}
                placeholder="Buscar por código, destinatario…"
                className="flex-1 bg-transparent font-sans text-sm text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={cupoStatus}
                onChange={e => setCupoStatus(e.target.value as CpeStatus | 'TODOS')}
                className="flex-1 h-9 px-3 rounded-xl border border-gray-light font-mono text-xs bg-white text-primary"
              >
                <option value="TODOS">Todos los estados</option>
                {CPE_STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={cupoGrano}
                onChange={e => setCupoGrano(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-gray-light font-mono text-xs bg-white text-primary"
              >
                <option value="">Todos los granos</option>
                {granosUnicos.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Lista */}
            {filteredCupos.length === 0 && (
              <div className="text-center py-10">
                <p className="font-sans text-text-muted text-sm">Sin resultados</p>
              </div>
            )}

            {filteredCupos.map(r => {
              const STATUS_COLORS: Record<string, string> = {
                IMPORTADO: '#2C9FC0', TRANSPORTE: '#F59E0B',
                CARGADO: '#FF6C02', CERRADO: '#16A34A', ENVIADO: '#15803D',
              }
              const bg = STATUS_COLORS[r.status] ?? '#2C9FC0'
              return (
                <div
                  key={r.id}
                  className="bg-white border border-gray-light rounded-xl px-4 py-3 space-y-2"
                >
                  {/* Fila 1: código + badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-primary">
                      {r.cupo ?? r.cpe_id}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold text-white shrink-0"
                      style={{ backgroundColor: bg }}
                    >
                      {r.status}
                    </span>
                  </div>

                  {/* Fila 2: destinatario + grano */}
                  <p className="font-sans text-xs text-text-muted">
                    {r.destinatario ?? '—'} · {r.grano ?? '—'}
                  </p>

                  {/* Fila 3: select de status + eliminar */}
                  <div className="flex items-center gap-2">
                    <select
                      value={r.status}
                      onChange={e => handleCupoStatusChange(r.cpe_id, e.target.value as CpeStatus)}
                      className="flex-1 h-8 px-2 rounded-lg border border-gray-light font-mono text-xs bg-white text-primary"
                    >
                      {CPE_STATUS_ORDER.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {adminOk && (
                      <button
                        onClick={() => handleDeleteCupo(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1.5 text-text-muted hover:text-red-600 transition disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {ToastComponent}
    </div>
  )
}
