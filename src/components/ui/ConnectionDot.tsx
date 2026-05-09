import React from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export default function ConnectionDot() {
  const isOnline = useOnlineStatus()
  return (
    <span
      className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
      style={{ backgroundColor: isOnline ? '#22c55e' : '#ef4444' }}
      title={isOnline ? 'En línea' : 'Sin conexión'}
    />
  )
}
