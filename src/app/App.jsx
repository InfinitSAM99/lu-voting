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
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import Register from '../pages/Register'
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
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

      <Route path="/update-profile" element={<ProtectedRoute><UpdateProfileGate /></ProtectedRoute>} />
      <Route path="/fake-identity-appeal" element={<ProtectedRoute><FakeIdentityAppeal /></ProtectedRoute>} />

      <Route path="/" element={
        <ProtectedRoute><UnlockedRoute><HomePage /></UnlockedRoute></ProtectedRoute>
      } />

      <Route path="/appeal" element={<ProtectedRoute><Appeal /></ProtectedRoute>} />
      <Route path="/verify-receipt" element={<VerifyReceipt />} />
      <Route path="/verify-receipt/:token" element={<VerifyReceipt />} />

      <Route path="/elections" element={
        <ProtectedRoute><UnlockedRoute>
          <AppPageShell title="Elections" logo><Elections /></AppPageShell>
        </UnlockedRoute></ProtectedRoute>
      } />
      <Route path="/elections/:id" element={
        <ProtectedRoute><UnlockedRoute>
          <AppPageShell title="Election" logo><ElectionDetail /></AppPageShell>
        </UnlockedRoute></ProtectedRoute>
      } />
      <Route path="/elections/:id/apply/:positionId" element={
        <ProtectedRoute><UnlockedRoute>
          <AppPageShell title="Apply" logo><CandidateApply /></AppPageShell>
        </UnlockedRoute></ProtectedRoute>
      } />
      <Route path="/elections/:id/vote" element={
        <ProtectedRoute><UnlockedRoute>
          <AppPageShell title="Cast your vote" logo><Vote /></AppPageShell>
        </UnlockedRoute></ProtectedRoute>
      } />
      <Route path="/apply" element={
        <ProtectedRoute><UnlockedRoute>
          <AppPageShell title="Apply" logo><Apply /></AppPageShell>
        </UnlockedRoute></ProtectedRoute>
      } />
      <Route path="/results" element={
        <ProtectedRoute><UnlockedRoute>
          <AppPageShell title="Results" logo><Results /></AppPageShell>
        </UnlockedRoute></ProtectedRoute>
      } />
      <Route path="/verify" element={
        <ProtectedRoute><UnlockedRoute>
          <AppPageShell title="Verify" logo><StudentVerify /></AppPageShell>
        </UnlockedRoute></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><UnlockedRoute>
          <AppPageShell title="Profile"><Profile /></AppPageShell>
        </UnlockedRoute></ProtectedRoute>
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
