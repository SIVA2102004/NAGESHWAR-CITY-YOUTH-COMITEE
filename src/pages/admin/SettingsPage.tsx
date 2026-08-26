import React, { useState, useEffect } from 'react'
import { Building2, User, Save, RefreshCw, QrCode, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { updateUserProfile } from '../../services/userService'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../firebase/config'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import UpiQrCode from '../../components/shared/UpiQrCode'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { festival, updateSettings } = useFestival()

  const [logo, setLogo] = useState<string>(festival?.logo || '/logo.jpg')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [festForm, setFestForm] = useState({
    name: festival?.name || '',
    committeeName: festival?.committeeName || '',
    festivalYear: festival?.festivalYear || '',
    address: festival?.address || '',
    contactNumber: festival?.contactNumber || '',
    email: festival?.email || '',
    targetAmount: String(festival?.targetAmount || ''),
    upiId: festival?.upiId || 'srinageshwaryouth@upi',
    upiPayeeName: festival?.upiPayeeName || festival?.committeeName || 'Sri Nageshwar Youth',
  })

  useEffect(() => {
    if (festival) {
      setLogo(festival.logo || '/logo.jpg')
      setFestForm({
        name: festival.name || '',
        committeeName: festival.committeeName || '',
        festivalYear: festival.festivalYear || '',
        address: festival.address || '',
        contactNumber: festival.contactNumber || '',
        email: festival.email || '',
        targetAmount: String(festival.targetAmount || ''),
        upiId: festival.upiId || 'srinageshwaryouth@upi',
        upiPayeeName: festival.upiPayeeName || festival.committeeName || 'Sri Nageshwar Youth',
      })
    }
  }, [festival])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 300
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          const compressed = canvas.toDataURL('image/jpeg', 0.85)
          setLogo(compressed)
          toast.success('Logo uploaded! Click Save to apply. 🖼️')
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

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
        logo: logo !== '/logo.jpg' ? logo : undefined,
        upiId: festForm.upiId.trim(),
        upiPayeeName: festForm.upiPayeeName.trim(),
      })
      toast.success('Festival, Logo, and UPI settings updated successfully!')
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
        <p className="text-gray-500 text-sm">Manage festival, UPI payment, and account settings</p>
      </div>

      {/* UPI Payment Configuration Card (Admin Only) */}
      <Card className="border-2 border-gold-300 bg-gradient-to-br from-white to-gold-50/30 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <QrCode size={22} className="text-saffron-600" />
            Committee UPI Payment Settings (Admin Only)
          </h2>
          <span className="text-[11px] font-bold bg-green-100 text-green-800 px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck size={13} /> Admin Managed
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
          Configure your official Committee UPI ID. All dynamic QR codes generated across Volunteer &amp; Coordinator portals will automatically deposit directly into this bank account with <strong>0% gateway fees</strong>. Volunteers only see the QR scanner and cannot edit this ID.
        </p>

        <form onSubmit={handleFestSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <Input
                label="Official Committee UPI ID *"
                value={festForm.upiId}
                onChange={e => setFestForm(f => ({ ...f, upiId: e.target.value }))}
                placeholder="e.g. srinageshwar@okaxis, 9876543210@paytm"
                hint="Supports any GPay, PhonePe, Paytm, or BHIM VPA"
                required
              />
              <Input
                label="Payee Account Name *"
                value={festForm.upiPayeeName}
                onChange={e => setFestForm(f => ({ ...f, upiPayeeName: e.target.value }))}
                placeholder="e.g. Sri Nageshwar Youth Committee"
                hint="Name shown to devotees when they scan"
                required
              />
              <Button type="submit" icon={<Save size={15} />} loading={festSaving}>
                Save UPI Configuration
              </Button>
            </div>

            {/* Live QR Test Preview */}
            <div className="bg-white rounded-2xl p-4 border border-gold-300 shadow-sm text-center">
              <p className="text-xs font-bold text-saffron-800 uppercase tracking-wider mb-2">Live Test QR Code</p>
              <UpiQrCode
                upiId={festForm.upiId || 'srinageshwaryouth@upi'}
                payeeName={festForm.upiPayeeName || 'Sri Nageshwar Youth'}
                amount={501}
                size={160}
                showDetails={true}
              />
            </div>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-saffron-600" /> Festival Settings
        </h2>
        <form onSubmit={handleFestSave} className="space-y-4">
          {/* Logo Management Box */}
          <div className="bg-gradient-to-r from-saffron-50 to-amber-50 border border-saffron-200 rounded-2xl p-4">
            <label className="text-xs font-bold text-saffron-900 uppercase tracking-wider block mb-2">
              Official Committee Logo
            </label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative group">
                <img
                  src={logo}
                  alt="Committee Logo"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md bg-white"
                />
                {logo !== '/logo.jpg' && (
                  <button
                    type="button"
                    onClick={() => setLogo('/logo.jpg')}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700"
                    title="Reset to default logo"
                  >
                    <span className="text-[10px] font-bold px-1">✕</span>
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white"
                >
                  Upload New Logo
                </Button>
                <p className="text-[11px] text-gray-500">
                  PNG or JPG (Max 5MB). Automatically synchronized with devotee receipts and UPI screens.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Committee Name" value={festForm.committeeName}
              onChange={e => setFestForm(f=>({...f,committeeName:e.target.value}))} />
            <Input label="Festival Name" value={festForm.name}
              onChange={e => setFestForm(f=>({...f,name:e.target.value}))} />
            <Input label="Festival Year" value={festForm.festivalYear}
              onChange={e => setFestForm(f=>({...f,festivalYear:e.target.value}))} />
            <Input label="Target Amount (₹)" type="number" value={festForm.targetAmount}
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
            <p className="text-green-600 text-sm font-medium">✓ Reset email sent to {user?.email}</p>
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
