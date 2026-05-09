import React, { useEffect } from 'react'
import { CheckCircle, AlertCircle, XCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  const styles = {
    success: 'bg-green-700 text-white',
    error: 'bg-red-700 text-white',
    info: 'bg-primary text-white',
  }

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertCircle

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-xs w-full px-4">
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg ${styles[type]}`}>
        <Icon className="w-5 h-5 shrink-0" />
        <p className="text-sm font-sans flex-1">{message}</p>
        <button onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Hook-style toast manager
import { useState, useCallback } from 'react'

interface ToastState {
  message: string
  type: ToastType
  id: number
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const show = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  const hide = useCallback(() => setToast(null), [])

  const ToastComponent = toast ? (
    <Toast key={toast.id} message={toast.message} type={toast.type} onClose={hide} />
  ) : null

  return { show, ToastComponent }
}
