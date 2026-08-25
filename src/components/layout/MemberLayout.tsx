import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopHeader from './TopHeader'

export default function MemberLayout() {
  return (
    <div className="flex min-h-screen bg-festival-light">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <TopHeader />
        <main className="flex-1 p-4 lg:p-8 fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
