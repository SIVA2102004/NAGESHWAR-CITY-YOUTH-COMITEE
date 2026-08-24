import React, { useState } from 'react'
import { Building2, User, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { updateUserProfile } from '../../services/userService'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../firebase/config'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { festival, updateSettings } = useFestival()

  const [festForm, setFestForm] = useState({
    name: festival?.name || '',
    committeeName: festival?.committeeName || '',
    festivalYear: festival?.festivalYear || '',
    address: festival?.address || '',
    contactNumber: festival?.contactNumber || '',
    email: festival?.email || '',
    targetAmount: String(festival?.targetAmount || ''),
  })

  const [userForm, setUserForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
  })

  const [festSaving, setFestSaving] = useState(false)
  const [userSaving, setUserSaving] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleFestSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFestSaving(true)
    try {
      await updateSettings({
        name: festForm.name,
        committeeName: festForm.committeeName,
        festivalYear: festForm.festivalYear,
        address: festForm.address,
        contactNumber: festForm.contactNumber,
        email: festForm.email,
        targetAmount: parseFloat(festForm.targetAmount) || 0,
      })
      toast.success('Festival settings updated!')
    } catch { toast.error('Update failed') } finally { setFestSaving(false) }
  }

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setUserSaving(true)
    try {
      await updateUserProfile(user.uid, { name: userForm.name, mobile: userForm.mobile })
      await refreshUser()
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') } finally { setUserSaving(false) }
  }

  const handlePasswordReset = async () => {
    if (!user) return
    try {
      await sendPasswordResetEmail(auth, user.email)
      setResetSent(true)
      toast.success('Password reset email sent!')
    } catch { toast.error('Failed to send reset email') }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Manage festival and account settings</p>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-saffron-600" /> Festival Settings
        </h2>
        <form onSubmit={handleFestSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Committee Name" value={festForm.committeeName}
              onChange={e => setFestForm(f=>({...f,committeeName:e.target.value}))} />
            <Input label="Festival Name" value={festForm.name}
              onChange={e => setFestForm(f=>({...f,name:e.target.value}))} />
            <Input label="Festival Year" value={festForm.festivalYear}
              onChange={e => setFestForm(f=>({...f,festivalYear:e.target.value}))} />
            <Input label="Target Amount (?)" type="number" value={festForm.targetAmount}
              onChange={e => setFestForm(f=>({...f,targetAmount:e.target.value}))} />
            <Input label="Address" value={festForm.address}
              onChange={e => setFestForm(f=>({...f,address:e.target.value}))} />
            <Input label="Contact Number" value={festForm.contactNumber}
              onChange={e => setFestForm(f=>({...f,contactNumber:e.target.value}))} />
          </div>
          <Button type="submit" icon={<Save size={15} />} loading={festSaving}>
            Save Festival Settings
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User size={20} className="text-saffron-600" /> My Profile
        </h2>
        <form onSubmit={handleUserSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" value={userForm.name}
              onChange={e => setUserForm(f=>({...f,name:e.target.value}))} />
            <Input label="Mobile" value={userForm.mobile}
              onChange={e => setUserForm(f=>({...f,mobile:e.target.value}))} />
            <Input label="Email" value={user?.email || ''} disabled hint="Email cannot be changed" />
            <Input label="Role" value={user?.role || ''} disabled hint="Role is managed by admin" />
          </div>
          <Button type="submit" icon={<Save size={15} />} loading={userSaving}>
            Save Profile
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">Password</h3>
          <p className="text-sm text-gray-500 mb-3">We will send a reset link to your email address.</p>
          {resetSent ? (
            <p className="text-green-600 text-sm font-medium">? Reset email sent to {user?.email}</p>
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
