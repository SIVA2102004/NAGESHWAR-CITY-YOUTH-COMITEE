import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, User, Mail, Lock, Phone, IndianRupee, Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createFestival } from '../../services/festivalService'
import { createFirstAdmin } from '../../services/authService'
import { logActivity } from '../../services/activityService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function SetupPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    committeeName: '',
    festivalName: '',
    festivalYear: new Date().getFullYear().toString(),
    targetAmount: '100000',
    address: '',
    contactNumber: '',
    email: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminMobile: '',
  })

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    const {
      committeeName, festivalName, festivalYear, targetAmount,
      address, contactNumber, email,
      adminName, adminEmail, adminPassword, adminMobile
    } = form

    if (!committeeName || !festivalName || !festivalYear || !adminName || !adminEmail || !adminPassword || !adminMobile) {
      toast.error('Please fill all required fields')
      return
    }
    if (adminPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }

    setSubmitting(true)
    try {
      const festivalId = await createFestival({
        name: festivalName,
        committeeName,
        festivalYear,
        address,
        contactNumber,
        email,
        targetAmount: parseFloat(targetAmount) || 0,
        createdBy: 'setup',
      })

      const admin = await createFirstAdmin({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        mobile: adminMobile,
        festivalId,
      })

      await logActivity({
        festivalId,
        userId: admin.uid,
        userName: adminName,
        role: 'admin',
        action: 'FESTIVAL_CREATED',
        entityType: 'festival',
        entityId: festivalId,
        description: `Festival ${festivalName} created by ${adminName}`,
      })

      setDone(true)
      toast.success('Festival setup complete! 🛕')
      setTimeout(() => navigate('/admin', { replace: true }), 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Setup failed'
      if (msg.includes('email-already-in-use')) {
        toast.error('This admin email is already in use.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-saffron-50 via-gold-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛕</div>
          <h1 className="text-3xl font-extrabold text-gray-900">Welcome to Ganesh Chanda Pro</h1>
          <p className="text-gray-500 mt-2">Let us set up your festival management system</p>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-card-hover p-10 text-center">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={56} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
            <p className="text-gray-500">Redirecting to Admin Dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSetup} className="bg-white rounded-2xl shadow-card-hover p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-saffron-600" /> Festival Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Committee Name" placeholder="Shree Ganesh Utsav Mandal" {...f('committeeName')} required />
                <Input label="Festival Name" placeholder="Ganesh Chaturthi 2026" {...f('festivalName')} required />
                <Input label="Festival Year" placeholder="2026" {...f('festivalYear')} required />
                <Input label="Target Collection (?)" type="number" placeholder="100000" icon={<IndianRupee size={16} />} {...f('targetAmount')} />
                <Input label="Address" placeholder="City, State" {...f('address')} />
                <Input label="Contact Number" placeholder="Festival helpline" {...f('contactNumber')} />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User size={20} className="text-saffron-600" /> Admin Account
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Admin Name" placeholder="Your full name" icon={<User size={16} />} {...f('adminName')} required />
                <Input label="Admin Email" type="email" placeholder="admin@example.com" icon={<Mail size={16} />} {...f('adminEmail')} required />
                <Input
                  label="Admin Password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  icon={<Lock size={16} />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  {...f('adminPassword')}
                  required
                />
                <Input label="Admin Mobile" type="tel" placeholder="10-digit mobile" icon={<Phone size={16} />} {...f('adminMobile')} required />
              </div>
            </div>

            <Button type="submit" fullWidth size="lg" loading={submitting}>
              Create Festival &amp; Admin Account
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
