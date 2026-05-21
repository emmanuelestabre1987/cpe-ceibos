import React from 'react'

interface FormFieldProps {
  id?: string
  label: string
  value: string | number
  onChange: (val: string) => void
  onBlur?: () => void
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'email' | 'tel'
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search' | 'none'
  placeholder?: string
  required?: boolean
  multiline?: boolean
  rows?: number
  error?: string
  className?: string
}

export function FormField({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  inputMode,
  placeholder,
  required,
  multiline,
  rows = 3,
  error,
  className = '',
}: FormFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const borderCls = error
    ? 'border-accent focus:border-accent focus:ring-accent/20'
    : 'border-gray-light focus:border-secondary focus:ring-secondary/20'
  const base = `w-full px-4 rounded-xl border bg-white font-sans text-base text-primary placeholder:text-text-muted focus:ring-2 transition ${borderCls}`

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="font-mono text-xs font-medium text-primary uppercase tracking-wide">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea
          id={inputId}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? label}
          rows={rows}
          className={`${base} py-3`}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? label}
          className={`${base} h-12`}
        />
      )}
      {error && (
        <span className="font-sans text-xs text-accent">{error}</span>
      )}
    </div>
  )
}

interface SelectFieldProps {
  id?: string
  label: string
  value: string
  onChange: (val: string) => void
  options: string[]
  required?: boolean
  placeholder?: string
  className?: string
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  required,
  placeholder,
  className = '',
}: SelectFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="font-mono text-xs font-medium text-primary uppercase tracking-wide">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 rounded-xl border border-gray-light bg-white font-sans text-base text-primary focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition appearance-none"
      >
        <option value="">{placeholder ?? `Seleccionar ${label}`}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
