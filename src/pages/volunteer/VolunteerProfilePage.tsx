import React, { useState } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { updateUserProfile } from '../../services/userService'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../firebase/config'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function VolunteerProfilePage() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', mobile: user?.mobile || '' })
  const [saving, setSaving] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      await updateUserProfile(user.uid, form)
      await refreshUser()
      toast.success('Profile updated!')
    } catch {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user) return
    try {
      await sendPasswordResetEmail(auth, user.email)
      setResetSent(true)
      toast.success('Password reset email sent!')
    } catch {
      toast.error('Failed to send reset email')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm">Manage your volunteer profile details</p>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required />
          <Input label="Mobile Number" value={form.mobile} onChange={e => setForm(f=>({...f,mobile:e.target.value}))} required />
          <Input label="Email Address" value={user?.email || ''} disabled hint="Email is fixed" />
          <Input label="Assigned Department" value={user?.departmentName || 'General'} disabled hint="Managed by Admin" />
          <Button type="submit" icon={<Save size={15} />} loading={saving}>Save Profile</Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">Password Reset</h3>
          <p className="text-sm text-gray-500 mb-3">Send a password reset email to your inbox.</p>
          {resetSent ? (
            <p className="text-green-600 text-sm font-medium">? Reset email sent</p>
          ) : (
            <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={handlePasswordReset}>
              Send Password Reset Email
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
