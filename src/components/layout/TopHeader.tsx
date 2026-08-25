import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import toast from 'react-hot-toast'

export default function TopHeader() {
  const { user, role, logout } = useAuth()
  const { festival } = useFestival()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  const roleLabel =
    role === 'admin'
      ? 'Administrator'
      : role === 'volunteer'
      ? 'Coordinator'
      : 'Volunteer'

  const roleBadgeColor =
    role === 'admin'
      ? 'bg-amber-100 text-amber-900 border-amber-300'
      : role === 'volunteer'
      ? 'bg-blue-100 text-blue-900 border-blue-300'
      : 'bg-purple-100 text-purple-900 border-purple-300'

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-amber-200/60 px-4 lg:px-8 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Committee / Festival Badge */}
        <div className="flex items-center gap-2.5 pl-12 lg:pl-0">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="w-8 h-8 rounded-full object-cover shadow-xs border border-amber-400"
          />
          <div className="hidden sm:block">
            <h2 className="text-xs font-bold text-gray-900 leading-tight">
              {festival?.committeeName || 'Ganesh Committee'}
            </h2>
            <p className="text-[10px] text-amber-700 font-medium">
              Ganesh Festival {festival?.festivalYear || '2026'}
            </p>
          </div>
        </div>

        {/* Right: User profile + Prominent Logout button in top right */}
        <div className="flex items-center gap-3">
          {/* User Info Pill */}
          {user && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 rounded-xl px-2.5 py-1.5 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-saffron-100 text-saffron-800 flex items-center justify-center font-bold text-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-gray-900 leading-none truncate max-w-[130px]">
                  {user.name}
                </p>
                <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border mt-0.5 ${roleBadgeColor}`}>
                  {roleLabel}
                </span>
              </div>
            </div>
          )}

          {/* Top Right Logout Button */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Sign out of your account"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
