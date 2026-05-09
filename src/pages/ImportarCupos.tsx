import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import SectionTitle from '../components/ui/SectionTitle'
import { FormField, SelectField } from '../components/forms/FormField'
import { useToast } from '../components/ui/Toast'
import { createImportBatch, createCuposEnLote } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { format } from '../lib/dateUtils'
import { GRANOS, LOCALIDADES, type CpeRecord } from '../types'

// ── Types ────────────────────────────────────────────────────

type Vista = 'upload' | 'preview' | 'loading'

interface CupoParsed {
  codigo: string
  fechaISO: string
}

interface CamposComunes {
  grano: string
  localidad: string
  destinatario: string
  cuit_destinatario: string
  destino: string
  cuit_destino: string
  vendedor: string
  nro_planta: string
}

const CAMPOS_VACIOS: CamposComunes = {
  grano: '',
  localidad: '',
  destinatario: '',
  cuit_destinatario: '',
  destino: '',
  cuit_destino: '',
  vendedor: '',
  nro_planta: '',
}

// ── Date parser ───────────────────────────────────────────────

function parseDate(val: unknown): string | null {
  if (typeof val === 'number') {
    // Excel serial date (epoch: Dec 30, 1899)
    const d = new Date((val - 25569) * 86400 * 1000)
    const y = d.getUTCFullYear()
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dy = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${mo}-${dy}`
  }
  if (typeof val === 'string') {
    const s = val.trim()
    // DD.MM.YYYY or DD/MM/YYYY
    const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  }
  return null
}

// ── Main component ────────────────────────────────────────────

export default function ImportarCupos() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { show, ToastComponent } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const [vista, setVista] = useState<Vista>('upload')
  const [cupos, setCupos] = useState<CupoParsed[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [campos, setCampos] = useState<CamposComunes>(CAMPOS_VACIOS)

  const allChecked = cupos.length > 0 && selected.size === cupos.length
  const someChecked = selected.size > 0 && !allChecked
  const nSelected = selected.size

  // Drive checkbox indeterminate imperatively
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked
    }
  }, [someChecked])

  const set = (field: keyof CamposComunes) => (val: string) =>
    setCampos(prev => ({ ...prev, [field]: val }))

  // ── Template download ─────────────────────────────────────────

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nro de Cupo', 'Fecha'],
      ['TBBMA260507EE52', '07.05.2026'],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Cupos')
    XLSX.writeFile(wb, 'template_cupos.xlsx')
  }

  // ── Excel parsing ─────────────────────────────────────────────

  const handleFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

      const parsed: CupoParsed[] = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!Array.isArray(row)) continue
        const codigo = String(row[0] ?? '').trim()
        if (!/^[A-Za-z0-9]{5,}$/.test(codigo)) continue
        const fechaISO = parseDate(row[1])
        if (!fechaISO) continue
        parsed.push({ codigo, fechaISO })
      }

      if (parsed.length === 0) {
        show('No se encontraron cupos válidos en el archivo', 'error')
        return
      }

      setCupos(parsed)
      setSelected(new Set(parsed.map((_, i) => i)))
      setCampos(CAMPOS_VACIOS)
      setVista('preview')
    } catch {
      show('Error al leer el archivo. Verificá que sea un Excel válido.', 'error')
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  // ── Selection ─────────────────────────────────────────────────

  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === cupos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(cupos.map((_, i) => i)))
    }
  }

  // ── Confirm import ────────────────────────────────────────────

  const confirmar = async () => {
    if (!user?.email || nSelected === 0) return
    const selectedCupos = cupos.filter((_, i) => selected.has(i))
    const email = user.email
    setVista('loading')

    try {
      const batch = await createImportBatch({
        raw_email_text: '',
        parsed_data: {
          grano: campos.grano,
          localidad: campos.localidad,
          destinatario: campos.destinatario,
          cuit_destinatario: campos.cuit_destinatario,
          destino: campos.destino,
          cuit_destino: campos.cuit_destino,
          rte_venta_primaria: campos.vendedor,
          nro_planta: campos.nro_planta,
          kg_estimados: 0,
          cupos: selectedCupos.map(c => ({ codigo: c.codigo, fecha: c.fechaISO })),
        },
        created_by: email,
        total_cupos: selectedCupos.length,
        grano: campos.grano,
        destinatario: campos.destinatario,
        destino: campos.destino,
      })

      const records: Omit<CpeRecord, 'id' | 'cpe_id' | 'created_at' | 'updated_at'>[] =
        selectedCupos.map(c => ({
          status: 'IMPORTADO' as const,
          created_by: email,
          imported_at: new Date().toISOString(),
          batch_id: batch.id,
          fecha_carga: c.fechaISO,
          cupo: c.codigo,
          grano: campos.grano || null,
          localidad: campos.localidad || null,
          destinatario: campos.destinatario || null,
          cuit_destinatario: campos.cuit_destinatario || null,
          destino: campos.destino || null,
          cuit_destino: campos.cuit_destino || null,
          rte_venta_primaria: campos.vendedor || null,
          nro_planta: campos.nro_planta || null,
          // remaining fields null
          campo: null,
          variedad: null,
          rte_venta_secundaria: null,
          rte_venta_secundaria2: null,
          mercado_termino: null,
          corredor_primario: null,
          corredor_secundario: null,
          repr_entregador: null,
          repr_recibidor: null,
          km: null,
          tarifa: null,
          pagador_flete: null,
          intermediario_flete: null,
          cuil_intermediario: null,
          observaciones: null,
          transporte: null,
          cuit_transporte: null,
          chofer: null,
          cuil_chofer: null,
          chasis: null,
          acoplado: null,
          kg_bruto_cargados: null,
          kg_tara_cargados: null,
          kg_estimados: null,
          kg_reales: null,
          kg_bruto_descargados: null,
          kg_tara_descargados: null,
          nro_ruca: null,
          ingeniero: null,
          contacto: null,
          gps: null,
        }))

      await createCuposEnLote(batch.id, records, email)
      show(`${selectedCupos.length} cupos importados correctamente`, 'success')
      navigate('/')
    } catch (e) {
      show((e as Error).message, 'error')
      setVista('preview')
    }
  }

  // ── Loading state ─────────────────────────────────────────────

  if (vista === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#2C9FC0' }} />
        <p className="font-sans text-text-muted text-sm">
          Creando {nSelected} cupo{nSelected !== 1 ? 's' : ''}…
        </p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Importar Cupos" showBack />

      {/* ── Estado 1: upload ──────────────────────────────────── */}
      {vista === 'upload' && (
        <div className="max-w-mobile mx-auto px-4 pt-20 pb-10 space-y-5">

          <Button variant="ghost" onClick={downloadTemplate} className="w-full">
            <Download className="w-4 h-4" />
            Descargar template
          </Button>

          {/* Drop / tap zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 cursor-pointer transition hover:bg-white/60 active:bg-white"
            style={{ borderColor: '#2C9FC0' }}
          >
            <FileSpreadsheet className="w-14 h-14" style={{ color: '#2C9FC0' }} />
            <div className="text-center space-y-1.5">
              <p className="font-sans font-semibold text-primary text-base">
                Subí el Excel completado
              </p>
              <p className="font-sans text-text-muted text-xs leading-relaxed">
                Formato: columna A = código de cupo, columna B = fecha
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* ── Estado 2: preview ─────────────────────────────────── */}
      {vista === 'preview' && (
        <div className="max-w-mobile mx-auto px-4 pt-20 pb-44 space-y-4">

          {/* Cupo list with checkboxes */}
          <div className="bg-white border border-gray-light rounded-2xl overflow-hidden">

            {/* Select-all header */}
            <label className="flex items-center gap-3 px-4 py-3 border-b border-gray-light bg-gray-50 cursor-pointer">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: '#2C9FC0' }}
              />
              <span className="font-mono text-xs font-bold text-primary uppercase tracking-wide">
                Todos — {cupos.length} cupos
              </span>
            </label>

            {/* Scrollable cupo rows */}
            <div className="divide-y divide-gray-light max-h-64 overflow-y-auto">
              {cupos.map((cupo, i) => (
                <label
                  key={`${cupo.codigo}-${i}`}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleSelect(i)}
                    className="w-4 h-4 rounded cursor-pointer shrink-0"
                    style={{ accentColor: '#2C9FC0' }}
                  />
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span
                      className="font-mono font-bold text-sm tracking-wide"
                      style={{ color: '#1E3252' }}
                    >
                      {cupo.codigo}
                    </span>
                    <span className="font-sans text-xs text-text-muted shrink-0">
                      {format(cupo.fechaISO)}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Selection counter */}
            <div className="px-4 py-2 border-t border-gray-light bg-gray-50">
              <p className="font-mono text-xs text-text-muted">
                {nSelected} de {cupos.length} seleccionados
              </p>
            </div>
          </div>

          {/* Campos comunes */}
          <SectionTitle>Datos para los cupos seleccionados</SectionTitle>

          <SelectField
            label="Grano"
            value={campos.grano}
            onChange={set('grano')}
            options={GRANOS}
          />
          <SelectField
            label="Localidad"
            value={campos.localidad}
            onChange={set('localidad')}
            options={LOCALIDADES}
          />
          <FormField
            label="Destinatario"
            value={campos.destinatario}
            onChange={set('destinatario')}
          />
          <FormField
            label="CUIT Destinatario"
            value={campos.cuit_destinatario}
            onChange={set('cuit_destinatario')}
          />
          <FormField
            label="Destino"
            value={campos.destino}
            onChange={set('destino')}
          />
          <FormField
            label="CUIT Destino"
            value={campos.cuit_destino}
            onChange={set('cuit_destino')}
          />
          <FormField
            label="Vendedor / Rte. Venta Primaria"
            value={campos.vendedor}
            onChange={set('vendedor')}
          />
          <FormField
            label="Nro. de Planta"
            value={campos.nro_planta}
            onChange={set('nro_planta')}
          />
        </div>
      )}

      {/* ── Bottom nav (preview only) ─────────────────────────── */}
      {vista === 'preview' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-4 py-3 pb-safe z-40">
          <div className="max-w-mobile mx-auto space-y-2">
            <Button
              fullWidth
              size="lg"
              onClick={() => void confirmar()}
              disabled={nSelected === 0}
              style={{ backgroundColor: '#1E3252' }}
            >
              Importar {nSelected} cupo{nSelected !== 1 ? 's' : ''} seleccionado{nSelected !== 1 ? 's' : ''}
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => setVista('upload')}
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </Button>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
