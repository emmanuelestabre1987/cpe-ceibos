import React from 'react'

interface BadgeProps {
  label: string
  variant?: 'green' | 'orange' | 'blue' | 'gray'
}

export default function Badge({ label, variant = 'gray' }: BadgeProps) {
  const variants = {
    green: 'bg-green-100 text-green-800',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-700',
  }

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-sans font-medium ${variants[variant]}`}
    >
      {label}
    </span>
  )
}
