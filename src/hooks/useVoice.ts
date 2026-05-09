import { useState, useRef } from 'react'
import { startVoiceRecognition, isVoiceSupported } from '../lib/voice'

export function useVoice(onResult: (text: string) => void, onError?: (msg: string) => void) {
  const [listening, setListening] = useState(false)
  const stopRef = useRef<() => void>(() => {})

  const supported = isVoiceSupported()

  const start = () => {
    if (!supported) {
      onError?.('Reconocimiento de voz no disponible')
      return
    }
    if (listening) return

    setListening(true)
    stopRef.current = startVoiceRecognition(
      (text) => { onResult(text); setListening(false) },
      (err) => { onError?.(err); setListening(false) },
      () => setListening(false)
    )
  }

  const stop = () => {
    stopRef.current()
    setListening(false)
  }

  return { listening, start, stop, supported }
}
