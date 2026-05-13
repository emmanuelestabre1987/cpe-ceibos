import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { FormField } from './FormField'
import { fetchRazonSocial } from '../../lib/afip'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  onRazonSocialFound?: (nombre: string) => void
  /** onBlur extra — se llama además del autocomplete (p. ej. validación de formato CUIT) */
  onBlur?: () => void
  placeholder?: string
  error?: string
}

export default function CuitField({
  label,
  value,
  onChange,
  onRazonSocialFound,
  onBlur,
  placeholder,
  error,
}: Props) {
  const [loading, setLoading] = useState(false)

  const handleChange = (v: string) => {
    onChange(v)
    // Si el CUIT queda vacío, limpiar la razón social
    if (onRazonSocialFound && v.replace(/\D/g, '').length === 0) {
      onRazonSocialFound('')
    }
  }

  const handleBlur = async () => {
    // Validación de formato si viene de afuera
    onBlur?.()

    const clean = value.replace(/\D/g, '')
    if (clean.length !== 11 || !onRazonSocialFound) return

    setLoading(true)
    const nombre = await fetchRazonSocial(clean)
    setLoading(false)

    if (nombre) onRazonSocialFound(nombre)
  }

  return (
    <div className="relative">
      <FormField
        label={label}
        value={value}
        onChange={handleChange}
        onBlur={() => void handleBlur()}
        placeholder={placeholder ?? '00-00000000-0'}
        inputMode="numeric"
        error={error}
      />
      {loading && (
        <div className="absolute right-3 top-9">
          <Loader2 className="w-4 h-4 animate-spin text-secondary" />
        </div>
      )}
    </div>
  )
}
