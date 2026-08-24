import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-festival-light">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8 fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
