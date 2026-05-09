type VoiceCallback = (text: string) => void
type ErrorCallback = (err: string) => void

export function isVoiceSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function startVoiceRecognition(
  onResult: VoiceCallback,
  onError: ErrorCallback,
  onEnd: () => void
): () => void {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) {
    onError('Reconocimiento de voz no soportado en este dispositivo')
    return () => {}
  }

  const recognition = new SR()
  recognition.lang = 'es-AR'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event: any) => {
    const result = event.results?.[0]?.[0]
    if (!result) return
    onResult(result.transcript as string)
  }

  recognition.onerror = (event: any) => {
    onError(event.error === 'not-allowed'
      ? 'Permiso de micrófono denegado'
      : `Error de voz: ${event.error}`)
  }

  recognition.onend = () => {
    onEnd()
  }

  recognition.start()

  return () => {
    try { recognition.stop() } catch {}
  }
}
