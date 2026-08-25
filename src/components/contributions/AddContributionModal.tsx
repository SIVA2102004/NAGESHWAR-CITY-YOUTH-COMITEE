import React, { useState, useEffect } from 'react'
import {
  User,
  Users,
  Plus,
  Trash2,
  IndianRupee,
  Phone,
  Home,
  QrCode,
  Sparkles,
  Building,
  CreditCard
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import UpiQrCode from '../shared/UpiQrCode'
import { createContribution } from '../../services/contributionService'
import { logActivity } from '../../services/activityService'
import { formatCurrency } from '../../utils/formatters'
import type { Contribution, Department, Festival, PaymentMethod, PaymentStatus } from '../../types'

const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Cash', 'Online', 'Cheque']
const PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Partial']

interface GroupMemberRow {
  id: string
  name: string
  mobile: string
  amount: string
}

interface AddContributionModalProps {
  open: boolean
  onClose: () => void
  festival: Festival | null
  user: { uid: string; name: string; role: 'admin' | 'volunteer' | 'member'; departmentId?: string; departmentName?: string } | null
  departments: Department[]
  onSuccess: (contributions: Contribution[], isGroup: boolean, roomNumber?: string, totalAmount?: number) => void
}

export default function AddContributionModal({
  open,
  onClose,
  festival,
  user,
  departments,
  onSuccess,
}: AddContributionModalProps) {
  const [mode, setMode] = useState<'single' | 'group'>('single')
  const [submitting, setSubmitting] = useState(false)

  // Single Form State
  const [singleForm, setSingleForm] = useState({
    contributorName: '',
    mobile: '',
    houseNumber: '',
    amount: '',
    paymentMethod: 'UPI' as PaymentMethod,
    paymentStatus: 'Paid' as PaymentStatus,
    departmentId: '',
    departmentName: '',
    notes: '',
  })

  // Group Form State
  const [roomNumber, setRoomNumber] = useState('')
  const [groupPaymentMethod, setGroupPaymentMethod] = useState<PaymentMethod>('UPI')
  const [groupPaymentStatus, setGroupPaymentStatus] = useState<PaymentStatus>('Paid')
  const [groupDepartmentId, setGroupDepartmentId] = useState('')
  const [groupDepartmentName, setGroupDepartmentName] = useState('')
  const [groupNotes, setGroupNotes] = useState('')

  const [members, setMembers] = useState<GroupMemberRow[]>([
    { id: '1', name: '', mobile: '', amount: '200' },
    { id: '2', name: '', mobile: '', amount: '200' },
    { id: '3', name: '', mobile: '', amount: '200' },
    { id: '4', name: '', mobile: '', amount: '200' },
  ])

  useEffect(() => {
    if (departments.length > 0) {
      setSingleForm((f) => ({
        ...f,
        departmentId: f.departmentId || departments[0].id,
        departmentName: f.departmentName || departments[0].name,
      }))
      setGroupDepartmentId(departments[0].id)
      setGroupDepartmentName(departments[0].name)
    }
  }, [departments])

  const handleMemberChange = (id: string, field: keyof GroupMemberRow, val: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    )
  }

  const addMemberRow = () => {
    const newId = Date.now().toString()
    setMembers((prev) => [...prev, { id: newId, name: '', mobile: '', amount: '200' }])
  }

  const removeMemberRow = (id: string) => {
    if (members.length <= 1) {
      toast.error('At least 1 member is required')
      return
    }
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const setMemberCountPreset = (count: number) => {
    const newMembers: GroupMemberRow[] = []
    for (let i = 0; i < count; i++) {
      newMembers.push({
        id: (i + 1).toString(),
        name: members[i]?.name || '',
        mobile: members[i]?.mobile || '',
        amount: members[i]?.amount || '200',
      })
    }
    setMembers(newMembers)
  }

  // Calculate live total for group
  const groupTotalAmount = members.reduce(
    (sum, m) => sum + (parseFloat(m.amount) || 0),
    0
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!festival || !user) {
      toast.error('System not initialized')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'single') {
        if (!singleForm.contributorName.trim() || !singleForm.mobile.trim() || !singleForm.amount) {
          toast.error('Please fill contributor name, mobile, and amount')
          setSubmitting(false)
          return
        }

        const dept = departments.find((d) => d.id === singleForm.departmentId)
        const c = await createContribution({
          festivalId: festival.id,
          festivalYear: festival.festivalYear || '2026',
          contributorName: singleForm.contributorName.trim(),
          mobile: singleForm.mobile.trim(),
          houseNumber: singleForm.houseNumber.trim() || undefined,
          amount: parseFloat(singleForm.amount),
          paymentMethod: singleForm.paymentMethod,
          paymentStatus: singleForm.paymentStatus,
          collectedBy: user.name,
          collectedByUid: user.uid,
          departmentId: singleForm.departmentId || user.departmentId || 'general',
          departmentName: dept?.name || singleForm.departmentName || user.departmentName || 'General',
          notes: singleForm.notes.trim() || undefined,
          createdBy: user.uid,
        })

        toast.success(`Contribution of ${formatCurrency(c.amount)} saved!`)
        await logActivity({
          festivalId: festival.id,
          userId: user.uid,
          userName: user.name,
          role: user.role,
          action: 'CONTRIBUTION_CREATED',
          entityType: 'contribution',
          entityId: c.id,
          description: `${user.name} recorded ${formatCurrency(c.amount)} from ${c.contributorName}`,
        })

        onClose()
        onSuccess([c], false)
      } else {
        // Group Mode validation
        const validMembers = members.filter(
          (m) => m.name.trim() !== '' && (parseFloat(m.amount) || 0) > 0
        )

        if (validMembers.length === 0) {
          toast.error('Please enter at least one member name and amount')
          setSubmitting(false)
          return
        }

        const dept = departments.find((d) => d.id === groupDepartmentId)
        const createdList: Contribution[] = []

        for (const member of validMembers) {
          const amountNum = parseFloat(member.amount) || 0
          const noteText = [
            roomNumber ? `Room/Flat: ${roomNumber}` : '',
            `Group Contribution (${validMembers.length} Members)`,
            groupNotes.trim(),
          ]
            .filter(Boolean)
            .join(' • ')

          const c = await createContribution({
            festivalId: festival.id,
            festivalYear: festival.festivalYear || '2026',
            contributorName: member.name.trim(),
            mobile: member.mobile.trim() || '0000000000',
            houseNumber: roomNumber.trim() || undefined,
            amount: amountNum,
            paymentMethod: groupPaymentMethod,
            paymentStatus: groupPaymentStatus,
            collectedBy: user.name,
            collectedByUid: user.uid,
            departmentId: groupDepartmentId || user.departmentId || 'general',
            departmentName: dept?.name || groupDepartmentName || user.departmentName || 'General',
            notes: noteText,
            createdBy: user.uid,
          })

          createdList.push(c)
        }

        toast.success(
          `🎉 Recorded ${createdList.length} member contributions! Total: ${formatCurrency(groupTotalAmount)}`
        )

        await logActivity({
          festivalId: festival.id,
          userId: user.uid,
          userName: user.name,
          role: user.role,
          action: 'GROUP_CONTRIBUTION_CREATED',
          entityType: 'contribution',
          description: `${user.name} recorded Group collection for ${roomNumber || 'Room'} (${createdList.length} members, Total: ${formatCurrency(groupTotalAmount)})`,
        })

        onClose()
        onSuccess(createdList, true, roomNumber, groupTotalAmount)
      }
    } catch {
      toast.error('Failed to save contribution. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'single' ? 'Add Individual Contribution' : 'Add Group / Room Contribution'}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {mode === 'single'
              ? 'Save & Generate Receipt'
              : `Save & Generate ${members.filter((m) => m.name.trim()).length || members.length} Receipts (${formatCurrency(groupTotalAmount)})`}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              mode === 'single'
                ? 'bg-white text-saffron-800 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User size={16} />
            <span>Single Contributor</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('group')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              mode === 'group'
                ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={16} />
            <span>Room / Group Members</span>
            <span className="bg-white/20 text-[10px] uppercase px-1.5 py-0.5 rounded-full font-black">
              Multi-Split
            </span>
          </button>
        </div>

        {/* SINGLE MODE */}
        {mode === 'single' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Contributor Name *"
                value={singleForm.contributorName}
                onChange={(e) =>
                  setSingleForm((f) => ({ ...f, contributorName: e.target.value }))
                }
                placeholder="e.g. Rahul Sharma"
                required
                autoFocus
              />
              <Input
                label="Mobile / WhatsApp Number *"
                type="tel"
                value={singleForm.mobile}
                onChange={(e) =>
                  setSingleForm((f) => ({ ...f, mobile: e.target.value }))
                }
                placeholder="10-digit mobile number"
                icon={<Phone size={16} />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Room / Flat / House No"
                value={singleForm.houseNumber}
                onChange={(e) =>
                  setSingleForm((f) => ({ ...f, houseNumber: e.target.value }))
                }
                placeholder="e.g. Room 302 / Flat 4B"
                icon={<Home size={16} />}
              />
              <Input
                label="Amount (₹) *"
                type="number"
                value={singleForm.amount}
                onChange={(e) =>
                  setSingleForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="500"
                icon={<IndianRupee size={16} />}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                  Payment Method
                </label>
                <select
                  value={singleForm.paymentMethod}
                  onChange={(e) =>
                    setSingleForm((f) => ({
                      ...f,
                      paymentMethod: e.target.value as PaymentMethod,
                    }))
                  }
                  className="input-field"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                  Payment Status
                </label>
                <select
                  value={singleForm.paymentStatus}
                  onChange={(e) =>
                    setSingleForm((f) => ({
                      ...f,
                      paymentStatus: e.target.value as PaymentStatus,
                    }))
                  }
                  className="input-field"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic UPI QR for Single */}
            {(singleForm.paymentMethod === 'UPI' || singleForm.paymentMethod === 'Online') && (
              <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl text-center">
                <p className="text-xs font-black text-amber-900 mb-1">Devotee Instant Scan &amp; Pay</p>
                <UpiQrCode
                  upiId={festival?.upiId || 'srinageshwaryouth@upi'}
                  payeeName={festival?.upiPayeeName || festival?.committeeName || 'Ganesh Committee'}
                  amount={singleForm.amount}
                  note={`Ganesh Chanda - ${singleForm.contributorName || 'Devotee'}`}
                  size={150}
                  showDetails={true}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                Department
              </label>
              <select
                value={singleForm.departmentId}
                onChange={(e) => {
                  const dept = departments.find((d) => d.id === e.target.value)
                  setSingleForm((f) => ({
                    ...f,
                    departmentId: e.target.value,
                    departmentName: dept?.name || '',
                  }))
                }}
                className="input-field"
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                Notes
              </label>
              <textarea
                value={singleForm.notes}
                onChange={(e) =>
                  setSingleForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Optional notes or blessings..."
                className="input-field resize-none text-xs"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* GROUP / ROOM MULTI-MEMBER MODE */}
        {mode === 'group' && (
          <div className="space-y-4">
            {/* Room Number & Presets */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <Input
                  label="Room / Flat / Hostel House No *"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. Room 402 or Flat 3B"
                  icon={<Home size={16} />}
                  required
                  autoFocus
                />

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Quick Select Member Count
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMemberCountPreset(num)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          members.length === num
                            ? 'bg-saffron-600 text-white border-saffron-600 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-saffron-300'
                        }`}
                      >
                        {num} People
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Room Members Table / Rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <Users size={14} className="text-saffron-600" />
                  Room Members &amp; Amount Breakdown ({members.length})
                </span>
                <button
                  type="button"
                  onClick={addMemberRow}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-saffron-700 hover:text-saffron-800 bg-saffron-50 px-2.5 py-1 rounded-xl border border-saffron-200"
                >
                  <Plus size={13} /> Add Another Member
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {members.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 bg-gray-50/80 p-2 rounded-2xl border border-gray-200 focus-within:border-saffron-400 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-saffron-100 text-saffron-800 text-xs font-black flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>

                    <input
                      type="text"
                      placeholder={`Member ${index + 1} Name *`}
                      value={member.name}
                      onChange={(e) =>
                        handleMemberChange(member.id, 'name', e.target.value)
                      }
                      className="input-field text-xs py-1.5 flex-1 min-w-[110px]"
                      required
                    />

                    <input
                      type="tel"
                      placeholder="WhatsApp No *"
                      value={member.mobile}
                      onChange={(e) =>
                        handleMemberChange(member.id, 'mobile', e.target.value)
                      }
                      className="input-field text-xs py-1.5 flex-1 min-w-[110px]"
                      required
                    />

                    <div className="relative w-24 flex-shrink-0">
                      <span className="absolute left-2 top-2 text-gray-400 text-xs">₹</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={member.amount}
                        onChange={(e) =>
                          handleMemberChange(member.id, 'amount', e.target.value)
                        }
                        className="input-field text-xs py-1.5 pl-5 pr-1 font-bold text-gray-900"
                        required
                      />
                    </div>

                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMemberRow(member.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
                        title="Remove Member"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total Calculation & Payment Mode */}
            <div className="bg-gradient-to-br from-saffron-50 via-amber-50 to-orange-50 border-2 border-saffron-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs font-bold text-saffron-900 uppercase tracking-wider">
                    Total Combined Collection
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-green-700">
                    {formatCurrency(groupTotalAmount)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={groupPaymentMethod}
                    onChange={(e) => setGroupPaymentMethod(e.target.value as PaymentMethod)}
                    className="input-field text-xs py-1.5 font-bold"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={groupPaymentStatus}
                    onChange={(e) => setGroupPaymentStatus(e.target.value as PaymentStatus)}
                    className="input-field text-xs py-1.5 font-bold"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Combined QR Code for Group */}
              {(groupPaymentMethod === 'UPI' || groupPaymentMethod === 'Online') && (
                <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-200 text-center shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-900 flex items-center gap-1">
                      <QrCode size={14} className="text-saffron-600" />
                      1 Combined UPI QR Code for Entire Room
                    </span>
                    <span className="text-[11px] font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Pay Total {formatCurrency(groupTotalAmount)}
                    </span>
                  </div>

                  <UpiQrCode
                    upiId={festival?.upiId || 'srinageshwaryouth@upi'}
                    payeeName={festival?.upiPayeeName || festival?.committeeName || 'Ganesh Committee'}
                    amount={groupTotalAmount.toString()}
                    note={`Ganesh Chanda - ${roomNumber ? `Room ${roomNumber}` : 'Room'} (${members.length} Members)`}
                    size={170}
                    showDetails={true}
                  />

                  <p className="text-[11px] text-gray-500 mt-2">
                    Any 1 person from the room can scan this single QR to pay the combined ₹{groupTotalAmount}.
                    Individual receipts will be automatically sent to all {members.length} members!
                  </p>
                </div>
              )}
            </div>

            {/* Department Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                  Department
                </label>
                <select
                  value={groupDepartmentId}
                  onChange={(e) => {
                    const dept = departments.find((d) => d.id === e.target.value)
                    setGroupDepartmentId(e.target.value)
                    setGroupDepartmentName(dept?.name || '')
                  }}
                  className="input-field text-xs"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                  Optional Notes
                </label>
                <input
                  type="text"
                  value={groupNotes}
                  onChange={(e) => setGroupNotes(e.target.value)}
                  placeholder="e.g. Paid by Siva on behalf of Room"
                  className="input-field text-xs py-2"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
