import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut } from 'lucide-react'
import { signOut } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'
import logoWhite from '../../assets/logo-white.png'

interface HeaderProps {
  title: string
  showBack?: boolean
  showLogout?: boolean
  accentColor?: string
  rightElement?: React.ReactNode
}

export default function Header({
  title,
  showBack = false,
  showLogout = false,
  accentColor = '#1E3252',
  rightElement,
}: HeaderProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-14 pt-safe border-b-[3px]"
      style={{ backgroundColor: accentColor, borderBottomColor: '#FF6C02' }}
    >
      <div className="max-w-mobile md:max-w-desktop mx-auto px-4 h-full flex items-center justify-between">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBack && (
          <button
            aria-label="Volver"
            onClick={() => navigate(-1)}
            className="text-white p-1 -ml-1 rounded-lg active:bg-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {showLogout
          ? <img src={logoWhite} alt="Avancargo" className="h-11 max-w-[180px] object-contain object-left" />
          : <h1 className="font-mono font-bold text-white text-base truncate">{title}</h1>
        }
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {rightElement}
        {showLogout && user && (
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-xs font-sans truncate max-w-[120px]">
              {user.email}
            </span>
            <button
              aria-label="Cerrar sesión"
              onClick={handleLogout}
              className="text-white p-1 rounded-lg active:bg-white/10"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  )
}
