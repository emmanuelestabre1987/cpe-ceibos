import React, { useState, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { startVoiceRecognition, isVoiceSupported } from '../../lib/voice'
import { useToast } from '../ui/Toast'

interface VoiceInputProps {
  id?: string
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  required?: boolean
  type?: 'text' | 'email' | 'tel'
  multiline?: boolean
  rows?: number
}

export default function VoiceInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  multiline = false,
  rows = 4,
}: VoiceInputProps) {
  const [listening, setListening] = useState(false)
  const stopRef = useRef<() => void>(() => {})
  const { show, ToastComponent } = useToast()
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  const handleMic = () => {
    if (listening) {
      stopRef.current()
      setListening(false)
      return
    }

    if (!isVoiceSupported()) {
      show('Reconocimiento de voz no disponible en este navegador', 'error')
      return
    }

    setListening(true)
    stopRef.current = startVoiceRecognition(
      (text) => {
        if (multiline) {
          onChange(value + (value ? '\n' : '') + text)
        } else {
          onChange(text)
        }
        show(`Capturado: "${text}"`, 'success')
        setListening(false)
      },
      (err) => {
        show(err, 'error')
        setListening(false)
      },
      () => setListening(false)
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="font-mono text-xs font-medium text-primary uppercase tracking-wide">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <div className="flex gap-2 items-start">
        {multiline ? (
          <textarea
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? label}
            rows={rows}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-light bg-white font-sans text-base text-primary placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition resize-none"
          />
        ) : (
          <input
            id={inputId}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? label}
            className="flex-1 h-12 px-4 rounded-xl border border-gray-light bg-white font-sans text-base text-primary placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition"
          />
        )}
        <button
          type="button"
          onClick={handleMic}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            listening
              ? 'bg-red-600 text-white mic-active'
              : 'bg-gray-light text-primary hover:bg-secondary hover:text-white'
          }`}
        >
          {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>
      {ToastComponent}
    </div>
  )
}
