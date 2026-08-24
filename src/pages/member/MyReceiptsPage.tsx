import React, { useEffect, useState } from 'react'
import { Plus, Receipt, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import {
  subscribeToVolunteerContributions,
  createContribution,
} from '../../services/contributionService'
import { logActivity } from '../../services/activityService'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import SearchFilter from '../../components/ui/SearchFilter'
import ReceiptModal from '../../components/receipt/ReceiptModal'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { Contribution, PaymentMethod, PaymentStatus } from '../../types'

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Online', 'UPI', 'Cheque']
const PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Partial']

export default function MyReceiptsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Contribution | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    contributorName: '',
    mobile: '',
    houseNumber: '',
    amount: '',
    paymentMethod: 'Cash' as PaymentMethod,
    paymentStatus: 'Paid' as PaymentStatus,
    notes: '',
  })

  useEffect(() => {
    if (!festival || !user) return
    return subscribeToVolunteerContributions(festival.id, user.uid, setContributions)
  }, [festival, user])

  const filtered = contributions.filter(c => {
    const q = search.toLowerCase()
    return (
      !q ||
      c.contributorName.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      c.receiptNumber.toLowerCase().includes(q)
    )
  })

  const handleSave = async (e: React.FormEvent) => {
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
      setSelectedReceipt(c)
      setReceiptOpen(true)
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to save contribution')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Collections</h1>
          <p className="text-gray-500 text-sm">Contributions collected by you from members &amp; devotees</p>
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={() => {
            setForm({
              contributorName: '',
              mobile: '',
              houseNumber: '',
              amount: '',
              paymentMethod: 'Cash',
              paymentStatus: 'Paid',
              notes: '',
            })
            setModalOpen(true)
          }}
        >
          Record Collection
        </Button>
      </div>

      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search by name, mobile, receipt..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IndianRupee size={32} />}
          title="No collections yet"
          message="Start recording chanda contributions from devotees in your area."
          action={{
            label: 'Record Collection',
            onClick: () => setModalOpen(true),
          }}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Receipt', 'Name', 'Mobile', 'Amount', 'Method', 'Status', 'Date', 'Receipt'].map(
                  h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-saffron-700 font-bold">
                    {c.receiptNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.contributorName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.mobile}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {formatCurrency(c.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        c.paymentStatus === 'Paid'
                          ? 'success'
                          : c.paymentStatus === 'Pending'
                          ? 'warning'
                          : 'info'
                      }
                      dot
                    >
                      {c.paymentStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedReceipt(c)
                        setReceiptOpen(true)
                      }}
                      className="p-1.5 rounded-lg text-saffron-600 hover:bg-saffron-50"
                      title="View Receipt"
                    >
                      <Receipt size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record New Contribution Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record New Contribution"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save &amp; Generate Receipt
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contributor Name *"
              value={form.contributorName}
              onChange={e => setForm(f => ({ ...f, contributorName: e.target.value }))}
              placeholder="e.g. Ramesh Kumar"
              required
              autoFocus
            />
            <Input
              label="Mobile *"
              type="tel"
              value={form.mobile}
              onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
              placeholder="10-digit mobile"
              required
            />
            <Input
              label="House Number"
              value={form.houseNumber}
              onChange={e => setForm(f => ({ ...f, houseNumber: e.target.value }))}
              placeholder="Flat 101 / Door No"
            />
            <Input
              label="Amount (₹) *"
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 501, 1001"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={e =>
                  setForm(f => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))
                }
                className="input-field mt-1"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Status</label>
              <select
                value={form.paymentStatus}
                onChange={e =>
                  setForm(f => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))
                }
                className="input-field mt-1"
              >
                {PAYMENT_STATUSES.map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field mt-1 resize-none"
              rows={2}
              placeholder="Optional notes or blessings"
            />
          </div>
        </form>
      </Modal>

      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        contribution={selectedReceipt}
        festival={festival}
      />
    </div>
  )
}
