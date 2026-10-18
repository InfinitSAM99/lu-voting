import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { ClaimProvider, useClaim } from './ClaimContext'
import { ProfileLockProvider, useProfileLock } from './ProfileLockContext'
import { useTheme } from '../hooks/useTheme'
import Splash from '../components/Splash'
import AppPageShell from '../components/AppPageShell'
import HomePage from '../pages/HomePage'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Claim from '../pages/Claim'
import UpdateProfileGate from '../pages/UpdateProfileGate'
import FakeIdentityAppeal from '../pages/FakeIdentityAppeal'
import Elections from '../pages/Elections'
import ElectionDetail from '../pages/ElectionDetail'
import CandidateApply from '../pages/CandidateApply'
import Vote from '../pages/Vote'
import Apply from '../pages/Apply'
import Results from '../pages/Results'
import Profile from '../pages/Profile'
import StudentVerify from '../pages/StudentVerify'
import VerifyReceipt from '../pages/VerifyReceipt'
import Appeal from '../pages/Appeal'
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

function UnlockedRoute({ children }) {
  const { lockActive } = useProfileLock()
  if (lockActive) return <Navigate to="/update-profile" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to="/" replace />
  return children
}

function Shell() {
  useTheme()
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/claim" element={<ProtectedRoute><Claim /></ProtectedRoute>} />

      <Route path="/update-profile" element={<ProtectedRoute><ClaimedRoute><UpdateProfileGate /></ClaimedRoute></ProtectedRoute>} />
      <Route path="/fake-identity-appeal" element={<ProtectedRoute><ClaimedRoute><FakeIdentityAppeal /></ClaimedRoute></ProtectedRoute>} />

      <Route path="/" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute><HomePage /></UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />

      <Route path="/appeal" element={<ProtectedRoute><Appeal /></ProtectedRoute>} />
      <Route path="/verify-receipt" element={<VerifyReceipt />} />
      <Route path="/verify-receipt/:token" element={<VerifyReceipt />} />

      <Route path="/elections" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute>
          <AppPageShell title="Elections" logo><Elections /></AppPageShell>
        </UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />
      <Route path="/elections/:id" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute>
          <AppPageShell title="Election" logo><ElectionDetail /></AppPageShell>
        </UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />
      <Route path="/elections/:id/apply/:positionId" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute>
          <AppPageShell title="Apply" logo><CandidateApply /></AppPageShell>
        </UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />
      <Route path="/elections/:id/vote" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute>
          <AppPageShell title="Cast your vote" logo><Vote /></AppPageShell>
        </UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />
      <Route path="/apply" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute>
          <AppPageShell title="Apply" logo><Apply /></AppPageShell>
        </UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />
      <Route path="/results" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute>
          <AppPageShell title="Results" logo><Results /></AppPageShell>
        </UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />
      <Route path="/verify" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute>
          <AppPageShell title="Verify" logo><StudentVerify /></AppPageShell>
        </UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><ClaimedRoute><UnlockedRoute>
          <AppPageShell title="Profile"><Profile /></AppPageShell>
        </UnlockedRoute></ClaimedRoute></ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function Root() {
  const [splashDone, setSplashDone] = useState(false)
  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />
  return <Shell />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClaimProvider>
          <ProfileLockProvider>
            <Root />
          </ProfileLockProvider>
        </ClaimProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
