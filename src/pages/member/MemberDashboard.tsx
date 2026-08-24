import React, { useEffect, useState } from 'react'
import { Megaphone, IndianRupee, Plus, Receipt, HeartHandshake } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { getContributionsByFestival, createContribution } from '../../services/contributionService'
import { subscribeToPublishedAnnouncements } from '../../services/announcementService'
import { logActivity } from '../../services/activityService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import AnnouncementCard from '../../components/shared/AnnouncementCard'
import ReceiptModal from '../../components/receipt/ReceiptModal'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { Contribution, Announcement, PaymentMethod, PaymentStatus } from '../../types'

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Online', 'UPI', 'Cheque']
const PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Partial']

export default function MemberDashboard() {
  const { user } = useAuth()
  const { festival } = useFestival()
  const navigate = useNavigate()

  const [myContribs, setMyContribs] = useState<Contribution[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Contribution | null>(null)

  const [form, setForm] = useState({
    contributorName: '',
    mobile: '',
    houseNumber: '',
    amount: '',
    paymentMethod: 'Cash' as PaymentMethod,
    paymentStatus: 'Paid' as PaymentStatus,
    notes: '',
  })

  const loadContributions = async () => {
    if (!festival || !user) return
    try {
      const all = await getContributionsByFestival(festival.id)
      const mine = all.filter(c => 
        c.collectedByUid === user.uid ||
        c.createdBy === user.uid || 
        c.mobile === user.mobile
      )
      setMyContribs(mine)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadContributions()
    if (festival) {
      return subscribeToPublishedAnnouncements(festival.id, setAnnouncements)
    }
  }, [festival, user])

  const totalPaid = myContribs.filter(c => c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0)

  const handleRecordContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contributorName.trim() || !form.mobile.trim() || !form.amount || !festival || !user) {
      toast.error('Please fill all required fields')
      return
    }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setSaving(true)
    try {
      const c = await createContribution({
        festivalId: festival.id,
        festivalYear: festival.festivalYear,
        contributorName: form.contributorName.trim(),
        mobile: form.mobile.trim(),
        houseNumber: form.houseNumber.trim() || undefined,
        amount: amt,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
        collectedBy: user.name,
        collectedByUid: user.uid,
        departmentId: user.departmentId || 'general',
        departmentName: user.departmentName || 'General Volunteer',
        notes: form.notes.trim() || undefined,
        createdBy: user.uid,
      })

      toast.success('Contribution recorded successfully! 🙏')
      await logActivity({
        festivalId: festival.id,
        userId: user.uid,
        userName: user.name,
        role: 'member',
        action: 'CONTRIBUTION_CREATED',
        entityType: 'contribution',
        entityId: c.id,
        description: `Volunteer ${user.name} recorded ${formatCurrency(amt)} from ${form.contributorName}`,
      })

      setModalOpen(false)
      setForm({
        contributorName: '',
        mobile: '',
        houseNumber: '',
        amount: '',
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        notes: '',
      })
      await loadContributions()
      setSelectedReceipt(c)
      setReceiptOpen(true)
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to record contribution')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-saffron-500 via-saffron-600 to-gold-500 text-white rounded-2xl p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            🙏 Ganpati Bappa Morya 🙏
          </h1>
          <p className="text-saffron-100 mt-1 text-sm">
            Welcome, <span className="font-bold text-white">{user?.name}</span> • Department: {user?.departmentName || 'General Volunteer'}
          </p>
          <p className="text-xs text-saffron-200 mt-0.5">{festival?.committeeName} • {festival?.festivalYear}</p>
        </div>

        <Button
          onClick={() => {
            setForm({ contributorName: '', mobile: '', houseNumber: '', amount: '', paymentMethod: 'Cash', paymentStatus: 'Paid', notes: '' })
            setModalOpen(true)
          }}
          icon={<Plus size={16} />}
          className="bg-white !text-saffron-700 hover:!bg-saffron-50 font-bold shadow-md"
        >
          Record Collection
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="!bg-saffron-50 border border-saffron-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-saffron-800 uppercase tracking-wide">My Total Collection</p>
              <p className="text-3xl font-extrabold text-saffron-900 mt-1">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-saffron-700 mt-1">{myContribs.length} collection(s) recorded</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-saffron-200/80 flex items-center justify-center text-saffron-800">
              <IndianRupee size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Volunteer Info</p>
          <p className="font-bold text-gray-900 mt-1 text-base">{user?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">Mobile: {user?.mobile}</p>
          <div className="mt-2">
            <Badge variant="success" dot>Active Volunteer</Badge>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Action</p>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                setForm({ contributorName: '', mobile: '', houseNumber: '', amount: '', paymentMethod: 'Cash', paymentStatus: 'Paid', notes: '' })
                setModalOpen(true)
              }}
            >
              Record Collection
            </Button>
            <Button size="sm" variant="outline" icon={<Receipt size={14} />} onClick={() => navigate('/member/receipts')}>
              View All Collections ({myContribs.length})
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Contributions & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Receipt size={18} className="text-saffron-600" /> Recent Collections
            </h3>
            <Button size="sm" variant="ghost" onClick={() => navigate('/member/receipts')}>
              View All
            </Button>
          </div>

          {myContribs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-3">No collections recorded yet</p>
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  setForm({ contributorName: '', mobile: '', houseNumber: '', amount: '', paymentMethod: 'Cash', paymentStatus: 'Paid', notes: '' })
                  setModalOpen(true)
                }}
              >
                Record First Collection
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myContribs.slice(0, 5).map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-saffron-50/50 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.contributorName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.receiptNumber} • {formatDate(c.createdAt)} • {c.paymentMethod}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-green-700 text-base">{formatCurrency(c.amount)}</span>
                    <button
                      onClick={() => { setSelectedReceipt(c); setReceiptOpen(true) }}
                      className="p-1.5 rounded-lg text-saffron-600 hover:bg-saffron-100"
                      title="View Receipt"
                    >
                      <Receipt size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Megaphone size={18} className="text-saffron-600" /> Festival Announcements
          </h3>
          <div className="space-y-3">
            {announcements.slice(0, 4).map(a => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
            {announcements.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No announcements right now</p>
            )}
          </div>
        </Card>
      </div>

      {/* Record New Contribution Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record New Contribution"
        maxWidth="max-w-lg"
        footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleRecordContribution} loading={saving}>Save &amp; Generate Receipt</Button>
        </>}
      >
        <form onSubmit={handleRecordContribution} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contributor Name *"
              value={form.contributorName}
              onChange={(e) => setForm(f => ({ ...f, contributorName: e.target.value }))}
              placeholder="e.g. Ramesh Kumar"
              required
              autoFocus
            />
            <Input
              label="Mobile *"
              type="tel"
              value={form.mobile}
              onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))}
              placeholder="10-digit mobile"
              required
            />
            <Input
              label="House Number"
              value={form.houseNumber}
              onChange={(e) => setForm(f => ({ ...f, houseNumber: e.target.value }))}
              placeholder="Flat 101 / Door No"
            />
            <Input
              label="Amount (₹) *"
              type="number"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 501, 1001"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                className="input-field mt-1"
              >
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Status</label>
              <select
                value={form.paymentStatus}
                onChange={(e) => setForm(f => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))}
                className="input-field mt-1"
              >
                {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field mt-1 resize-none"
              rows={2}
              placeholder="Optional notes or blessings"
            />
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        contribution={selectedReceipt}
        festival={festival}
      />
    </div>
  )
}
