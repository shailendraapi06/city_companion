import { Route, Routes } from 'react-router-dom'
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
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:conversationId"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved"
        element={
          <ProtectedRoute>
            <SavedPlacesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
