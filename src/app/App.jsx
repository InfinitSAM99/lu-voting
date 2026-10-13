import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { ClaimProvider, useClaim } from './ClaimContext'
import { useTheme } from '../hooks/useTheme'
import ProfileNudge from '../components/ProfileNudge'
import AppLayout from '../layouts/AppLayout'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Claim from '../pages/Claim'
import ProfileSetup from '../pages/ProfileSetup'
import Elections from '../pages/Elections'
import ElectionDetail from '../pages/ElectionDetail'
import CandidateApply from '../pages/CandidateApply'
import Apply from '../pages/Apply'
import Results from '../pages/Results'
import Profile from '../pages/Profile'
import NotFound from '../pages/NotFound'

function FullScreenLoader() {
  return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ef4444', fontSize: 14 }}>Loading…</div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function ClaimedRoute({ children }) {
  const { isClaimed, loading } = useClaim()
  if (loading) return <FullScreenLoader />
  if (!isClaimed) return <Navigate to="/claim" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to="/elections" replace />
  return children
}

function Shell() {
  useTheme()
  return (
    <>
      <ProfileNudge />
      <Routes>
        <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/claim" element={<ProtectedRoute><Claim /></ProtectedRoute>} />
        <Route path="/profile/setup" element={<ProtectedRoute><ClaimedRoute><ProfileSetup /></ClaimedRoute></ProtectedRoute>} />

        <Route element={<ProtectedRoute><ClaimedRoute><AppLayout /></ClaimedRoute></ProtectedRoute>}>
          <Route path="/elections" element={<Elections />} />
          <Route path="/elections/:id" element={<ElectionDetail />} />
          <Route path="/elections/:id/apply/:positionId" element={<CandidateApply />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/results" element={<Results />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClaimProvider>
          <Shell />
        </ClaimProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
