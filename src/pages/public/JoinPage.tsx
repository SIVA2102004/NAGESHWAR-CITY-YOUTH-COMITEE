import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hash, User, Mail, Lock, Phone, Eye, EyeOff, CheckCircle, UserCheck, Users, ShieldCheck, ArrowRight, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateInviteCode } from '../../services/inviteCodeService'
import { getFestival } from '../../services/festivalService'
import { registerWithInviteCode } from '../../services/authService'
import { useFestival } from '../../context/FestivalContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import type { InviteCode, Festival } from '../../types'

type Step = 'code' | 'details' | 'success'

export default function JoinPage() {
  const navigate = useNavigate()
  const { selectFestival } = useFestival()
  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null)
  const [targetFestival, setTargetFestival] = useState<Festival | null>(null)
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [registeredRole, setRegisteredRole] = useState<'admin' | 'volunteer' | 'member'>('member')

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    address: '',
  })

  const typeLabel: Record<string, string> = {
    ADMIN_INVITE: 'Administrator (Co-Admin)',
    VOLUNTEER_INVITE: 'Coordinator (Dept Lead)',
    MEMBER_INVITE: 'Volunteer (Ground Collector)',
  }

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { toast.error('Enter an invite code'); return }
    setValidating(true)
    try {
      const result = await validateInviteCode(code.trim().toUpperCase())
      if (!result.valid || !result.inviteCode) {
        toast.error(result.error || 'Invalid code')
        return
      }
      setInviteCode(result.inviteCode)

      // Fetch the committee info for this code
      if (result.inviteCode.festivalId) {
        const fest = await getFestival(result.inviteCode.festivalId)
        setTargetFestival(fest)
      }

      setStep('details')
    } catch {
      toast.error('Error validating code. Please try again.')
    } finally {
      setValidating(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.mobile) {
      toast.error('Please fill all required fields')
      return
    }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSubmitting(true)
    try {
      const user = await registerWithInviteCode({
        code: code.toUpperCase(),
        name: form.name,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        mobile: form.mobile.trim(),
        address: form.address,
      })

      // Immediately select the user's registered committee
      if (user.festivalId) {
        await selectFestival(user.festivalId)
      }

      setRegisteredRole(user.role)
      setStep('success')
      toast.success(`Account created as ${user.role}! 🎉`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      if (msg.includes('email-already-in-use')) {
        toast.error('This email is already registered. Please go to Login.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-saffron-50 via-gold-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img
            src="/logo.jpg"
            alt="Ganesh Committee Logo"
            className="w-20 h-20 mx-auto mb-3 rounded-full object-cover shadow-lg ring-4 ring-gold-400/50"
          />
          <h1 className="text-3xl font-extrabold text-gray-900">Join Committee</h1>
          <p className="text-saffron-700 font-semibold mt-1">Admin, Coordinator &amp; Volunteer Portal</p>
          <p className="text-gray-500 text-sm mt-0.5">Ganesh Committee • Ganesh Festival 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card-hover p-6 sm:p-8">
          {step === 'code' && (
            <div className="space-y-5">
              <div className="flex gap-2.5 p-3.5 bg-gradient-to-r from-saffron-50 to-gold-50 rounded-xl border border-saffron-200 text-xs text-saffron-950 leading-relaxed">
                <span className="text-base">🛕</span>
                <span>
                  Co-Admins, Coordinators, and Volunteers must enter an <strong>Invite Code</strong> issued by the Committee Admin to activate their account and set their password.
                </span>
              </div>

              <form onSubmit={handleValidateCode} className="space-y-4">
                <Input
                  label="Enter 6-Character Invite Code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ADM7K2"
                  icon={<Hash size={16} />}
                  maxLength={6}
                  style={{ fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 700 }}
                  required
                  autoFocus
                />
                <Button type="submit" fullWidth loading={validating}>
                  Verify Code &amp; Continue
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-center">
                <p className="text-sm text-gray-600">
                  Already registered?{' '}
                  <Link to="/login" className="text-saffron-600 font-bold hover:underline">
                    Sign In here
                  </Link>
                </p>
                <p className="text-xs text-gray-400">
                  Don't have an invite code? Ask your primary festival administrator for one.
                </p>
              </div>
            </div>
          )}

          {step === 'details' && inviteCode && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="bg-gradient-to-r from-saffron-50 via-gold-50 to-orange-50 border border-saffron-300 rounded-xl p-4 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {inviteCode.type === 'ADMIN_INVITE' ? (
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                        <ShieldCheck size={20} />
                      </div>
                    ) : inviteCode.type === 'VOLUNTEER_INVITE' ? (
                      <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md">
                        <UserCheck size={20} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-md">
                        <Users size={20} />
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Joining Role</p>
                      <p className="font-extrabold text-gray-900 text-sm">{typeLabel[inviteCode.type]}</p>
                    </div>
                  </div>
                  {inviteCode.departmentName && (
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Department</p>
                      <p className="font-bold text-saffron-800 text-sm">{inviteCode.departmentName}</p>
                    </div>
                  )}
                </div>
                <div className="mt-2.5 pt-2 border-t border-saffron-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-saffron-900 font-bold">
                    <Building size={14} className="text-saffron-600" />
                    <span>{targetFestival?.committeeName || 'Ganesh Committee'}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-saffron-800 tracking-wider bg-white/60 px-2 py-0.5 rounded border border-saffron-200">{inviteCode.code}</span>
                </div>
              </div>

              <Input
                label="Your Full Name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rahul Sharma"
                icon={<User size={16} />}
                required
              />
              <Input
                label="Email Address (Used for Sign In)"
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="rahul@example.com"
                icon={<Mail size={16} />}
                required
              />
              <Input
                label="Create Password (Min. 6 characters)"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Create a strong password"
                icon={<Lock size={16} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />
              <Input
                label="Mobile Number"
                type="tel"
                value={form.mobile}
                onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))}
                placeholder="10-digit mobile number"
                icon={<Phone size={16} />}
                required
              />
              <Input
                label="Address / Area (Optional)"
                value={form.address}
                onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Hostel / Flat / Area"
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep('code')} fullWidth>
                  Back
                </Button>
                <Button type="submit" fullWidth loading={submitting}>
                  Complete Registration
                </Button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle className="text-green-500 mx-auto" size={56} />
              <div>
                <h2 className="text-2xl font-black text-gray-900">Registration Complete! 🎉</h2>
                <p className="text-gray-600 text-sm mt-1">
                  You are now registered as <strong className="text-saffron-800 uppercase">{registeredRole}</strong> of <strong>{targetFestival?.committeeName || 'Ganesh Committee'}</strong>.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  fullWidth
                  icon={<ArrowRight size={16} />}
                  onClick={() => {
                    const dest = registeredRole === 'admin' ? '/admin' : registeredRole === 'volunteer' ? '/volunteer' : '/member'
                    navigate(dest, { replace: true })
                  }}
                >
                  Enter {registeredRole === 'admin' ? 'Admin Dashboard' : registeredRole === 'volunteer' ? 'Coordinator Portal' : 'Volunteer Portal'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ganesh Chanda Pro � {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
