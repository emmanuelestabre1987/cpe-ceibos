import React, { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useToast } from './components/ui/Toast'
import Login from './pages/Login'
import Home from './pages/Home'
import NewRecord from './pages/NewRecord'
import RecordDetail from './pages/RecordDetail'
import EditRecord from './pages/EditRecord'
import Admin from './pages/Admin'
import ImportarCupos from './pages/ImportarCupos'
import DetalleCupo from './pages/DetalleCupo'
import AsignarTransporte from './pages/AsignarTransporte'
import AsignarDatos from './pages/AsignarDatos'

function GlobalStatusBanner() {
  const isOnline = useOnlineStatus()
  const { show, ToastComponent } = useToast()
  const prevRef = useRef(isOnline)

  useEffect(() => {
    if (!prevRef.current && isOnline) {
      show('Conexión restaurada', 'success')
    }
    prevRef.current = isOnline
  }, [isOnline, show])

  return (
    <>
      {!isOnline && (
        <div
          className="fixed top-14 left-0 right-0 z-30 flex items-center justify-center h-7 font-sans text-white text-xs font-medium"
          style={{ backgroundColor: '#FF6C02' }}
        >
          Sin conexión — modo offline
        </div>
      )}
      {ToastComponent}
    </>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalStatusBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nuevo"
          element={
            <ProtectedRoute>
              <NewRecord />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registro/:id"
          element={
            <ProtectedRoute>
              <RecordDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registro/:id/editar"
          element={
            <ProtectedRoute>
              <EditRecord />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/importar"
          element={
            <ProtectedRoute>
              <ImportarCupos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cupo/:id"
          element={
            <ProtectedRoute>
              <DetalleCupo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asignar-transporte"
          element={
            <ProtectedRoute>
              <AsignarTransporte />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asignar-datos"
          element={
            <ProtectedRoute>
              <AsignarDatos />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
