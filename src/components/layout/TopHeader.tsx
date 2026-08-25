import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, User, ChevronDown, Building, Plus, LayoutGrid, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import toast from 'react-hot-toast'

export default function TopHeader() {
  const { user, role, isSuperAdmin, logout } = useAuth()
  const { festival, allFestivals, selectFestival } = useFestival()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    isSuperAdmin
      ? 'President'
      : role === 'admin'
      ? 'Administrator'
      : role === 'volunteer'
      ? 'Coordinator'
      : 'Volunteer'

  const roleBadgeColor =
    isSuperAdmin
      ? 'bg-amber-100 text-amber-900 border-amber-400 font-black'
      : role === 'admin'
      ? 'bg-amber-100 text-amber-900 border-amber-300'
      : role === 'volunteer'
      ? 'bg-blue-100 text-blue-900 border-blue-300'
      : 'bg-purple-100 text-purple-900 border-purple-300'

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-amber-200/60 px-4 lg:px-8 py-2.5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Committee / Festival Badge with Multi-Committee Dropdown for Super Admins ONLY */}
        <div className="flex items-center gap-2 pl-12 lg:pl-0">
          <div className="relative" ref={dropdownRef}>
            {isSuperAdmin ? (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-2xl hover:bg-amber-50/80 border border-transparent hover:border-amber-200 transition-all text-left group"
                title="Switch Committee / Pandal (President Access)"
              >
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="w-8 h-8 rounded-full object-cover shadow-xs border border-amber-400 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h2 className="text-xs sm:text-sm font-black text-gray-900 leading-tight truncate max-w-[180px] sm:max-w-[240px]">
                      {festival?.committeeName || 'Ganesh Committee'}
                    </h2>
                    <ChevronDown size={14} className="text-gray-400 group-hover:text-saffron-600 transition-transform flex-shrink-0" />
                  </div>
                  <p className="text-[10px] text-amber-700 font-bold">
                    Ganesh Festival {festival?.festivalYear || '2026'} • <span className="text-saffron-600 underline">Switch Pandal</span>
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 px-1 py-1">
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="w-8 h-8 rounded-full object-cover shadow-xs border border-amber-400"
                />
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                    {festival?.committeeName || 'Ganesh Committee'}
                  </h2>
                  <p className="text-[10px] text-amber-700 font-medium">
                    Ganesh Festival {festival?.festivalYear || '2026'}
                  </p>
                </div>
              </div>
            )}

            {/* Committee Switcher Menu (Super Admin Only) */}
            {dropdownOpen && isSuperAdmin && (
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-amber-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    Switch Committee ({allFestivals.length})
                  </p>
                  <Link
                    to="/admin/master"
                    onClick={() => setDropdownOpen(false)}
                    className="text-[11px] font-bold text-saffron-600 hover:text-saffron-700 flex items-center gap-1"
                  >
                    <LayoutGrid size={12} /> Master Hub
                  </Link>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                  {allFestivals.map((fest) => {
                    const isSelected = festival?.id === fest.id
                    return (
                      <button
                        key={fest.id}
                        onClick={async () => {
                          await selectFestival(fest.id)
                          setDropdownOpen(false)
                          toast.success(`Switched to ${fest.committeeName}`)
                        }}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-saffron-50 text-saffron-950 font-bold'
                            : 'hover:bg-gray-50 text-gray-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Building size={16} className={isSelected ? 'text-saffron-600' : 'text-gray-400'} />
                          <div className="min-w-0">
                            <p className="text-xs truncate">{fest.committeeName}</p>
                            <p className="text-[10px] text-gray-400">{fest.festivalYear || '2026'}</p>
                          </div>
                        </div>
                        {isSelected && <Check size={16} className="text-saffron-600 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                <div className="p-2 border-t border-gray-100 bg-amber-50/50 rounded-b-2xl">
                  <Link
                    to="/admin/master"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-saffron-600 hover:bg-saffron-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Plus size={14} /> Add / Manage All Pandals
                  </Link>
                </div>
              </div>
            )}
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
