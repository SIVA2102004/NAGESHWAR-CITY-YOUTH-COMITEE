import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, IndianRupee, Users, UserCheck, Building2,
  ReceiptText, BarChart3, Megaphone, Activity, Settings,
  LogOut, Menu, X, ChevronRight, ShieldCheck, Building
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import toast from 'react-hot-toast'

interface NavItem {
  to:    string
  icon:  React.ReactNode
  label: string
}

const adminNav: NavItem[] = [
  { to: '/admin',               icon: <LayoutDashboard size={18} />, label: 'Dashboard'             },
  { to: '/admin/master',        icon: <Building size={18} />,        label: 'All Pandals (Master)'   },
  { to: '/admin/admins',        icon: <ShieldCheck size={18} />,     label: 'Admins'                 },
  { to: '/admin/contributions',  icon: <IndianRupee size={18} />,     label: 'Contributions'         },
  { to: '/admin/volunteers',     icon: <UserCheck size={18} />,       label: 'Coordinators'    },
  { to: '/admin/members',        icon: <Users size={18} />,           label: 'Volunteers'      },
  { to: '/admin/departments',    icon: <Building2 size={18} />,       label: 'Departments'     },
  { to: '/admin/expenses',       icon: <ReceiptText size={18} />,     label: 'Expenses'        },
  { to: '/admin/reports',        icon: <BarChart3 size={18} />,       label: 'Reports'         },
  { to: '/admin/announcements',  icon: <Megaphone size={18} />,       label: 'Announcements'   },
  { to: '/admin/activity',       icon: <Activity size={18} />,        label: 'Activity Log'    },
  { to: '/admin/settings',       icon: <Settings size={18} />,        label: 'Settings'        },
]

const volunteerNav: NavItem[] = [
  { to: '/volunteer',               icon: <LayoutDashboard size={18} />, label: 'Coordinator Home' },
  { to: '/volunteer/contributions',  icon: <IndianRupee size={18} />,     label: 'My Collections'   },
  { to: '/volunteer/members',        icon: <Users size={18} />,           label: 'My Volunteers'    },
  { to: '/volunteer/profile',        icon: <Settings size={18} />,        label: 'Profile'          },
]

const memberNav: NavItem[] = [
  { to: '/member',          icon: <LayoutDashboard size={18} />, label: 'Volunteer Home'  },
  { to: '/member/receipts', icon: <IndianRupee size={18} />,     label: 'My Collections'  },
  { to: '/member/profile',  icon: <Settings size={18} />,        label: 'Profile'         },
]

export default function Sidebar() {
  const { user, role, logout } = useAuth()
  const { festival }           = useFestival()
  const navigate               = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = role === 'admin' ? adminNav : role === 'volunteer' ? volunteerNav : memberNav

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-saffron-100">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="w-11 h-11 rounded-xl object-cover shadow-sm ring-1 ring-saffron-300"
          />
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 text-sm leading-tight truncate">
              {festival?.committeeName || 'Ganesh Committee'}
            </h1>
            <p className="text-xs text-saffron-600 font-medium">Ganesh Festival {festival?.festivalYear || '2026'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/volunteer' || item.to === '/member'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <ChevronRight size={14} className="opacity-40" />
          </NavLink>
        ))}
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen fixed top-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white shadow-lg border border-gray-200 text-gray-700"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={22} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl lg:hidden">
            <button
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
