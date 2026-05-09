import React, { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { useToast } from '../ui/Toast'

interface GPSInputProps {
  value: string
  onChange: (val: string) => void
}

export default function GPSInput({ value, onChange }: GPSInputProps) {
  const [loading, setLoading] = useState(false)
  const { show, ToastComponent } = useToast()

  const capture = () => {
    if (!navigator.geolocation) {
      show('GPS no disponible en este dispositivo', 'error')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
        onChange(coords)
        show(`Ubicación capturada: ${coords}`, 'success')
        setLoading(false)
      },
      (err) => {
        show(`Error GPS: ${err.message}`, 'error')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-xs font-medium text-primary uppercase tracking-wide">GPS</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
