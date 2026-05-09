const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const

export function normalizarCuit(cuit: string): string {
  return cuit.replace(/\D/g, '')
}

export function formatearCuit(cuit: string): string {
  const d = normalizarCuit(cuit)
  if (d.length !== 11) return cuit
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}`
}

export function validarCuit(cuit: string): boolean {
  const d = normalizarCuit(cuit)
  if (d.length !== 11) return false
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(d[i]), 0)
  const rem = sum % 11
  const v = rem === 0 ? 0 : rem === 1 ? 9 : 11 - rem
  return v === Number(d[10])
}
