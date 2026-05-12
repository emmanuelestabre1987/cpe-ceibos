import React, { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { useToast } from '../ui/Toast'

interface GPSInputProps {
  latitud: number | null
  longitud: number | null
  onChangeCoords: (lat: number, lng: number) => void
}

function formatCoords(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return ''
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

function parseCoords(text: string): { lat: number; lng: number } | null {
  const parts = text.split(',').map((s) => s.trim())
  if (parts.length !== 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lng)) return null
  return { lat, lng }
}

export default function GPSInput({ latitud, longitud, onChangeCoords }: GPSInputProps) {
  const [loading, setLoading] = useState(false)
  const [manualText, setManualText] = useState<string | null>(null)
  const { show, ToastComponent } = useToast()

  // Display value: si el usuario está editando manualmente usamos ese texto,
  // si no, lo derivamos de latitud/longitud.
  const displayValue = manualText !== null ? manualText : formatCoords(latitud, longitud)

  const capture = () => {
    if (!navigator.geolocation) {
      show('GPS no disponible en este dispositivo', 'error')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        onChangeCoords(lat, lng)
        setManualText(null) // limpiar edición manual
        show(`Ubicación capturada: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'success')
        setLoading(false)
      },
      (err) => {
        show(`Error GPS: ${err.message}`, 'error')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleManualChange = (text: string) => {
    setManualText(text)
    const parsed = parseCoords(text)
    if (parsed) {
      onChangeCoords(parsed.lat, parsed.lng)
    }
  }

  const handleBlur = () => {
    // Si al perder el foco el texto no es parseable, lo descartamos
    // y volvemos a mostrar las coordenadas guardadas (o vacío).
    if (manualText !== null) {
      const parsed = parseCoords(manualText)
      if (!parsed) {
        setManualText(null)
      }
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-xs font-medium text-primary uppercase tracking-wide">GPS</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => handleManualChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="lat, lng"
          className="flex-1 h-12 px-4 rounded-xl border border-gray-light bg-white font-sans text-base text-primary placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition"
          readOnly={loading}
        />
        <button
          type="button"
          onClick={capture}
          disabled={loading}
          className="flex items-center gap-1.5 h-12 px-4 rounded-xl bg-primary text-white font-sans text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {loading ? 'Buscando…' : 'Capturar'}
        </button>
      </div>
      {ToastComponent}
    </div>
  )
}
