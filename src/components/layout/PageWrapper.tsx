import React from 'react'

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  topOffset?: string // e.g. 'top-14' or 'top-28'
}

export default function PageWrapper({
  children,
  className = '',
  topOffset = 'top-14',
}: PageWrapperProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${topOffset === 'top-14' ? 'pt-14' : 'pt-28'} ${className}`}>
      <div className="max-w-mobile md:max-w-desktop mx-auto px-4 pb-32">
        {children}
      </div>
    </div>
  )
}
