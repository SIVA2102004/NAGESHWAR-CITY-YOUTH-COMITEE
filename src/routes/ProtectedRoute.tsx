import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner fullScreen label="Loading..." />
  if (!user)   return <Navigate to="/login" replace />

  return <Outlet />
}