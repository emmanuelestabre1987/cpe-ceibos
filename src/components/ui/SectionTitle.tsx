import React from 'react'

interface SectionTitleProps {
  children: React.ReactNode
  className?: string
}

export default function SectionTitle({ children, className = '' }: SectionTitleProps) {
  return (
    <h2 className={`font-mono font-bold text-xs text-secondary uppercase tracking-widest mb-3 pb-1.5 border-b border-secondary/25 ${className}`}>
      {children}
    </h2>
  )
}
