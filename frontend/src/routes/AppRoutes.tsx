import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from '../components/layout/PublicLayout'
import { AppLayout } from '../components/layout/AppLayout'
import { ChatPage } from '../pages/Chat/ChatPage'
import { LandingPage } from '../pages/Landing/LandingPage'
import { LoginPage } from '../pages/Login/LoginPage'
import { ProfilePage } from '../pages/Profile/ProfilePage'
import { SavedPlacesPage } from '../pages/SavedPlaces/SavedPlacesPage'
import { SignupPage } from '../pages/Signup/SignupPage'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <ProtectedRoute requireGuest>
              <LoginPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <ProtectedRoute requireGuest>
              <SignupPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ChatPage />} />
        <Route path="/saved" element={<SavedPlacesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
