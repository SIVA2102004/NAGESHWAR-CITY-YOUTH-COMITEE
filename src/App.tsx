import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FestivalProvider } from './context/FestivalContext'

import AdminRoute from './routes/AdminRoute'
import VolunteerRoute from './routes/VolunteerRoute'
import MemberRoute from './routes/MemberRoute'

import AdminLayout from './components/layout/AdminLayout'
import VolunteerLayout from './components/layout/VolunteerLayout'
import MemberLayout from './components/layout/MemberLayout'

import LoginPage from './pages/public/LoginPage'
import JoinPage from './pages/public/JoinPage'
import SetupPage from './pages/public/SetupPage'
import PublicReceiptPage from './pages/public/PublicReceiptPage'
import NotFoundPage from './pages/public/NotFoundPage'

import AdminDashboard from './pages/admin/AdminDashboard'
import MasterCommitteesPage from './pages/admin/MasterCommitteesPage'
import AdminsPage from './pages/admin/AdminsPage'
import ContributionsPage from './pages/admin/ContributionsPage'
import MembersPage from './pages/admin/MembersPage'
import VolunteersPage from './pages/admin/VolunteersPage'
import DepartmentsPage from './pages/admin/DepartmentsPage'
import ExpensesPage from './pages/admin/ExpensesPage'
import ReportsPage from './pages/admin/ReportsPage'
import AnnouncementsPage from './pages/admin/AnnouncementsPage'
import ActivityLogPage from './pages/admin/ActivityLogPage'
import SettingsPage from './pages/admin/SettingsPage'

import VolunteerDashboard from './pages/volunteer/VolunteerDashboard'
import MyContributionsPage from './pages/volunteer/MyContributionsPage'
import MyMembersPage from './pages/volunteer/MyMembersPage'
import VolunteerProfilePage from './pages/volunteer/VolunteerProfilePage'

import MemberDashboard from './pages/member/MemberDashboard'
import MyReceiptsPage from './pages/member/MyReceiptsPage'
import MemberProfilePage from './pages/member/MemberProfilePage'

import LoadingSpinner from './components/ui/LoadingSpinner'
import PwaInstallPrompt from './components/shared/PwaInstallPrompt'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen label="Loading Sri Nageshwar Youth..." />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'volunteer') return <Navigate to="/volunteer" replace />
  return <Navigate to="/member" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FestivalProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <PwaInstallPrompt />
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/receipt/:id" element={<PublicReceiptPage />} />

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/master" element={<MasterCommitteesPage />} />
                <Route path="/admin/admins" element={<AdminsPage />} />
                <Route path="/admin/contributions" element={<ContributionsPage />} />
                <Route path="/admin/members" element={<MembersPage />} />
                <Route path="/admin/volunteers" element={<VolunteersPage />} />
                <Route path="/admin/departments" element={<DepartmentsPage />} />
                <Route path="/admin/expenses" element={<ExpensesPage />} />
                <Route path="/admin/reports" element={<ReportsPage />} />
                <Route path="/admin/announcements" element={<AnnouncementsPage />} />
                <Route path="/admin/activity" element={<ActivityLogPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Volunteer Routes */}
            <Route element={<VolunteerRoute />}>
              <Route element={<VolunteerLayout />}>
                <Route path="/volunteer" element={<VolunteerDashboard />} />
                <Route path="/volunteer/contributions" element={<MyContributionsPage />} />
                <Route path="/volunteer/members" element={<MyMembersPage />} />
                <Route path="/volunteer/profile" element={<VolunteerProfilePage />} />
              </Route>
            </Route>

            {/* Member Routes */}
            <Route element={<MemberRoute />}>
              <Route element={<MemberLayout />}>
                <Route path="/member" element={<MemberDashboard />} />
                <Route path="/member/receipts" element={<MyReceiptsPage />} />
                <Route path="/member/profile" element={<MemberProfilePage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </FestivalProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
