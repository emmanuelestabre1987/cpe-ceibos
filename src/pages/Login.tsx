import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Send, CheckCircle } from 'lucide-react'
import { isEmailAuthorized, sendMagicLink } from '../lib/auth'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../hooks/useAuth'
import logoColor from '../assets/logo-color.png'

export default function Login() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { show, ToastComponent } = useToast()

  useEffect(() => {
    if (!authLoading && user) navigate('/')
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const authorized = await isEmailAuthorized(email)
      if (!authorized) {
        show('Email no autorizado. Contactá al administrador.', 'error')
        setLoading(false)
        return
      }
      await sendMagicLink(email)
      setSent(true)
    } catch (err) {
      show((err as Error).message ?? 'Error al enviar el acceso', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return null

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1E3252' }}>

      {/* ── Top: navy ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-10">
        <h1 className="font-mono font-black text-white text-2xl tracking-tight text-center">
          CPE Campo
        </h1>
        <p className="font-sans text-white/60 text-sm text-center mt-1">
          Gestión de cupos agronómicos
        </p>
      </div>

      {/* ── Bottom: white card ───────────────────────────────── */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 md:rounded-3xl md:max-w-md md:mx-auto md:mb-16 md:shadow-xl">
        <div className="flex justify-center mb-6">
          <img
            src={logoColor}
            alt="Avancargo"
            className="h-16 w-auto object-contain"
          />
        </div>

        {sent ? (
          <div className="text-center space-y-4 py-4">
            <CheckCircle className="w-12 h-12 text-secondary mx-auto" />
            <h2 className="font-mono font-bold text-primary text-xl">Revisá tu email</h2>
            <p className="font-sans text-text-muted text-sm">
              Enviamos un enlace de acceso a{' '}
              <span className="text-secondary font-medium">{email}</span>
            </p>
            <p className="font-sans text-text-muted/70 text-xs">
              El enlace expira en 1 hora. Revisá también la carpeta de spam.
            </p>
            <button
              onClick={() => setSent(false)}
              className="w-full h-12 rounded-xl font-sans text-sm font-medium border border-gray-200 text-primary active:bg-gray-50 transition-colors"
            >
              Usar otro email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-xs font-medium text-text-muted uppercase tracking-widest mb-2">
                Email
              </label>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 h-14 focus-within:border-secondary transition-colors">
                <Mail className="w-5 h-5 text-text-muted shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  className="flex-1 bg-transparent font-sans text-primary text-base placeholder:text-text-muted/50 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-sans text-base font-semibold text-white flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#FF6C02' }}
            >
              {loading ? (
                <span className="font-sans text-sm">Enviando…</span>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Solicitar acceso
                </>
              )}
            </button>
          </form>
        )}

        <p className="font-sans text-text-muted/50 text-xs text-center mt-8">
          Avancargo © {new Date().getFullYear()}
        </p>
      </div>

      {ToastComponent}
    </div>
  )
}
