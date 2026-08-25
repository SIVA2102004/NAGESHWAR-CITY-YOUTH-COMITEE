import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, UserCheck, Users, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

type RoleTab = 'admin' | 'volunteer' | 'member'

export default function LoginPage() {
  const { login, logout, resetPwd } = useAuth()
  const { selectFestival } = useFestival()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleTab>('admin')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      toast.error('Please enter email and password')
      return
    }
    setSubmitting(true)
    try {
      const user = await login(cleanEmail, password)

      // Strict Role Validation Check: User must match the selected tab
      if (selectedRole === 'admin' && user.role !== 'admin') {
        await logout()
        const actualRoleTitle = user.role === 'volunteer' ? 'Coordinator' : 'Volunteer'
        toast.error(
          `🚫 Access Denied: This account is registered as a ${actualRoleTitle}, not an Admin. Please select the "${actualRoleTitle}" tab to log in.`,
          { duration: 6000 }
        )
        return
      }

      if (selectedRole === 'volunteer' && user.role !== 'volunteer') {
        await logout()
        const actualRoleTitle = user.role === 'admin' ? 'Administrator' : 'Volunteer'
        toast.error(
          `🚫 Access Denied: This account is registered as an ${actualRoleTitle}, not a Coordinator. Please select the "${actualRoleTitle}" tab to log in.`,
          { duration: 6000 }
        )
        return
      }

      if (selectedRole === 'member' && user.role !== 'member') {
        await logout()
        const actualRoleTitle = user.role === 'admin' ? 'Administrator' : 'Coordinator'
        toast.error(
          `🚫 Access Denied: This account is registered as an ${actualRoleTitle}, not a Volunteer. Please select the "${actualRoleTitle}" tab to log in.`,
          { duration: 6000 }
        )
        return
      }

      // Immediately switch festival context to user's assigned committee
      if (user.festivalId) {
        await selectFestival(user.festivalId)
      }

      toast.success(`Welcome back, ${user.name}! 🙏`)
      const route = user.role === 'admin' ? '/admin' : user.role === 'volunteer' ? '/volunteer' : '/member'
      navigate(route, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      if (
        msg.includes('user-not-found') ||
        msg.includes('wrong-password') ||
        msg.includes('invalid-credential') ||
        msg.includes('INVALID_LOGIN_CREDENTIALS')
      ) {
        toast.error('Invalid email or password. Please verify your credentials or join using an Invite Code first.', {
          duration: 5000,
        })
      } else if (msg.includes('too-many-requests')) {
        toast.error('Too many attempts. Please wait a moment and try again.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) { toast.error('Enter your email'); return }
    setSubmitting(true)
    try {
      await resetPwd(resetEmail)
      setResetSent(true)
      toast.success('Password reset email sent!')
    } catch {
      toast.error('Could not send reset email. Check your email address.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-saffron-50 via-gold-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/logo.jpg"
            alt="Ganesh Committee Logo"
            className="w-24 h-24 mx-auto mb-3 rounded-full object-cover shadow-lg ring-4 ring-gold-400/50"
          />
          <h1 className="text-3xl font-extrabold text-gray-900">Ganesh Committee</h1>
          <p className="text-saffron-700 font-semibold mt-1">🙏 Ganpati Bappa Morya 🙏</p>
          <p className="text-gray-500 text-sm mt-0.5">Ganesh Festival 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card-hover p-6 sm:p-8">
          {!resetMode ? (
            <>
              {/* Role Indicator Pills */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
                  Select Role or Sign In Directly
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedRole === 'admin'
                        ? 'border-saffron-500 bg-saffron-50 text-saffron-800 ring-2 ring-saffron-400'
                        : 'border-gray-200 hover:border-saffron-300 text-gray-600 bg-gray-50/50'
                    }`}
                  >
                    <ShieldCheck size={18} className="text-saffron-600 mb-1" />
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('volunteer')}
                    className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedRole === 'volunteer'
                        ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-400'
                        : 'border-gray-200 hover:border-blue-300 text-gray-600 bg-gray-50/50'
                    }`}
                  >
                    <UserCheck size={18} className="text-blue-600 mb-1" />
                    <span>Coordinator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('member')}
                    className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedRole === 'member'
                        ? 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-400'
                        : 'border-gray-200 hover:border-purple-300 text-gray-600 bg-gray-50/50'
                    }`}
                  >
                    <Users size={18} className="text-purple-600 mb-1" />
                    <span>Volunteer</span>
                  </button>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    selectedRole === 'admin'
                      ? 'admin@example.com'
                      : selectedRole === 'volunteer'
                      ? 'coordinator@example.com'
                      : selectedRole === 'member'
                      ? 'volunteer@example.com'
                      : 'name@example.com'
                  }
                  icon={<Mail size={16} />}
                  required
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  icon={<Lock size={16} />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  required
                  autoComplete="current-password"
                />

                <div className="pt-1">
                  <Button type="submit" fullWidth loading={submitting}>
                    Sign In {selectedRole === 'admin' ? 'as Admin' : selectedRole === 'volunteer' ? 'as Coordinator' : selectedRole === 'member' ? 'as Volunteer' : ''}
                  </Button>
                </div>

                <div className="flex justify-between items-center text-sm pt-1">
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-saffron-600 hover:text-saffron-800 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>

              {/* Create Account Section */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                <div className="bg-gradient-to-r from-saffron-50 to-gold-50 border border-saffron-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">New Co-Admin, Coordinator, or Volunteer?</p>
                      <p className="text-xs text-gray-600 mt-0.5">Activate your account with an invite code from the committee</p>
                    </div>
                    <Link
                      to="/join"
                      className="inline-flex items-center gap-1 bg-saffron-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-saffron-700 transition-colors shadow-sm"
                    >
                      Join Now <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-400">
                  First time setting up the festival?{' '}
                  <Link to="/setup" className="text-saffron-600 font-semibold hover:underline">
                    Create Festival (Admin)
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h2>
              {!resetSent ? (
                <form onSubmit={handleReset} className="space-y-4 mt-4">
                  <p className="text-sm text-gray-500">Enter your email and we will send you a reset link.</p>
                  <Input
                    label="Email Address"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    icon={<Mail size={16} />}
                    required
                  />
                  <Button type="submit" fullWidth loading={submitting}>Send Reset Link</Button>
                  <button
                    type="button"
                    onClick={() => setResetMode(false)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    Back to Login
                  </button>
                </form>
              ) : (
                <div className="text-center mt-6">
                  <div className="text-4xl mb-3">??</div>
                  <p className="text-gray-700">Check your inbox for a password reset link.</p>
                  <button
                    onClick={() => { setResetMode(false); setResetSent(false) }}
                    className="mt-4 text-saffron-600 font-semibold hover:underline text-sm"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ganesh Chanda Pro � {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
