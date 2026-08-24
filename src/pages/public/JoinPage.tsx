import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hash, User, Mail, Lock, Phone, Eye, EyeOff, CheckCircle, UserCheck, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateInviteCode } from '../../services/inviteCodeService'
import { getDefaultFestival } from '../../services/festivalService'
import { registerWithInviteCode } from '../../services/authService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import type { InviteCode } from '../../types'

type Step = 'code' | 'details' | 'success'

export default function JoinPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null)
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    address: '',
  })

  const typeLabel: Record<string, string> = {
    ADMIN_INVITE: 'Administrator',
    VOLUNTEER_INVITE: 'Coordinator',
    MEMBER_INVITE: 'Volunteer',
  }

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { toast.error('Enter an invite code'); return }
    setValidating(true)
    try {
      const festival = await getDefaultFestival()
      if (!festival) { toast.error('No festival configured. Contact admin.'); return }
      const result = await validateInviteCode(code.trim().toUpperCase(), festival.id)
      if (!result.valid) { toast.error(result.error || 'Invalid code'); return }
      setInviteCode(result.inviteCode!)
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
      await registerWithInviteCode({
        code: code.toUpperCase(),
        name: form.name,
        email: form.email,
        password: form.password,
        mobile: form.mobile,
        address: form.address,
      })
      setStep('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      if (msg.includes('email-already-in-use')) {
        toast.error('This email is already registered. Please login.')
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
            alt="Sri Nageshwar Youth Logo"
            className="w-20 h-20 mx-auto mb-3 rounded-full object-cover shadow-lg ring-4 ring-gold-400/50"
          />
          <h1 className="text-3xl font-extrabold text-gray-900">Create Account</h1>
          <p className="text-saffron-700 font-semibold mt-1">Coordinator &amp; Volunteer Registration</p>
          <p className="text-gray-500 text-sm mt-0.5">Sri Nageshwar Youth • Marwadi University</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card-hover p-6 sm:p-8">
          {step === 'code' && (
            <div className="space-y-5">
              <div className="flex gap-2 p-3 bg-saffron-50 rounded-xl border border-saffron-200 text-xs text-saffron-900 leading-relaxed">
                <span>??</span>
                <span>
                  Volunteers and Members require an <strong>Invite Code</strong> issued by the Festival Admin to join a department and start collecting or tracking contributions.
                </span>
              </div>

              <form onSubmit={handleValidateCode} className="space-y-4">
                <Input
                  label="Enter 6-Character Invite Code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GAN7K2"
                  icon={<Hash size={16} />}
                  maxLength={6}
                  style={{ fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 700 }}
                  required
                  autoFocus
                />
                <Button type="submit" fullWidth loading={validating}>
                  Verify &amp; Continue
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-saffron-600 font-semibold hover:underline">
                    Sign In here
                  </Link>
                </p>
                <p className="text-xs text-gray-400">
                  Don't have an invite code? Contact your festival administrator to get one.
                </p>
              </div>
            </div>
          )}

          {step === 'details' && inviteCode && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="bg-saffron-50 border border-saffron-200 rounded-xl p-4 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {inviteCode.type === 'VOLUNTEER_INVITE' ? (
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <UserCheck size={18} />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                        <Users size={18} />
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Registering as</p>
                      <p className="font-bold text-gray-900 text-sm">{typeLabel[inviteCode.type]}</p>
                    </div>
                  </div>
                  {inviteCode.departmentName && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="font-bold text-saffron-700 text-sm">{inviteCode.departmentName}</p>
                    </div>
                  )}
                </div>
                <div className="mt-2.5 pt-2 border-t border-saffron-200/60 flex items-center justify-between">
                  <Badge variant="success" dot>Code Validated</Badge>
                  <span className="font-mono text-xs font-bold text-saffron-800">{inviteCode.code}</span>
                </div>
              </div>

              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ramesh Patil"
                icon={<User size={16} />}
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="ramesh@example.com"
                icon={<Mail size={16} />}
                required
              />
              <Input
                label="Password"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 6 characters"
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
                label="Address (Optional)"
                value={form.address}
                onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="House / Flat / Area"
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
            <div className="text-center py-4">
              <CheckCircle className="text-green-500 mx-auto mb-3" size={48} />
              <h2 className="text-xl font-bold text-gray-900">Account Created Successfully!</h2>
              <p className="text-gray-500 text-sm mt-2">
                Welcome to the festival committee. You can now sign in with your email and password.
              </p>
              <Button
                className="mt-6"
                fullWidth
                onClick={() => navigate('/login')}
              >
                Go to Sign In
              </Button>
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
