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
  Smartphone,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import UpiQrCode from '../shared/UpiQrCode'
import { createContribution } from '../../services/contributionService'
import { logActivity } from '../../services/activityService'
import { formatCurrency } from '../../utils/formatters'
import { playSuccessChime } from '../../utils/soundEffects'
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
  const [mode, setMode] = useState<'smart' | 'single' | 'group'>('smart')
  const [submitting, setSubmitting] = useState(false)

  // ==========================================
  // SMART AUTO-PAY STATE (DMart Auto-Bill)
  // ==========================================
  const [smartStep, setSmartStep] = useState<'input' | 'qr_scan' | 'paid_success'>('input')
  const [smartName, setSmartName] = useState('')
  const [smartMobile, setSmartMobile] = useState('')
  const [smartHouse, setSmartHouse] = useState('')
  const [smartAmount, setSmartAmount] = useState('')
  const [smartDeptId, setSmartDeptId] = useState('')
  const [smartDeptName, setSmartDeptName] = useState('')
  const [smartTxnRef, setSmartTxnRef] = useState('')
  const [smartTimer, setSmartTimer] = useState(300)
  const [copiedUPI, setCopiedUPI] = useState(false)
  const [isVerifyingSmart, setIsVerifyingSmart] = useState(false)
  const [createdSmartReceipt, setCreatedSmartReceipt] = useState<Contribution | null>(null)

  // ==========================================
  // SINGLE MANUAL FORM STATE
  // ==========================================
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
    upiUtr: '',
  })

  // ==========================================
  // GROUP MULTI-MEMBER FORM STATE
  // ==========================================
  const [roomNumber, setRoomNumber] = useState('')
  const [groupPaymentMethod, setGroupPaymentMethod] = useState<PaymentMethod>('UPI')
  const [groupPaymentStatus, setGroupPaymentStatus] = useState<PaymentStatus>('Paid')
  const [groupDepartmentId, setGroupDepartmentId] = useState('')
  const [groupDepartmentName, setGroupDepartmentName] = useState('')
  const [groupNotes, setGroupNotes] = useState('')
  const [groupUpiUtr, setGroupUpiUtr] = useState('')
  const [splitTotalInput, setSplitTotalInput] = useState('')

  const [members, setMembers] = useState<GroupMemberRow[]>([
    { id: '1', name: '', mobile: '', amount: '' },
    { id: '2', name: '', mobile: '', amount: '' },
    { id: '3', name: '', mobile: '', amount: '' },
    { id: '4', name: '', mobile: '', amount: '' },
  ])

  useEffect(() => {
    if (open) {
      setMode('smart')
      setSmartStep('input')
      setSmartName('')
      setSmartMobile('')
      setSmartHouse('')
      setSmartAmount('')
      setCreatedSmartReceipt(null)
      setIsVerifyingSmart(false)

      if (departments.length > 0) {
        setSmartDeptId(user?.departmentId || departments[0].id)
        setSmartDeptName(user?.departmentName || departments[0].name)
        setSingleForm((f) => ({
          ...f,
          departmentId: f.departmentId || user?.departmentId || departments[0].id,
          departmentName: f.departmentName || user?.departmentName || departments[0].name,
        }))
        setGroupDepartmentId(user?.departmentId || departments[0].id)
        setGroupDepartmentName(user?.departmentName || departments[0].name)
      }
    }
  }, [open, user, departments])

  // Timer countdown while scanning QR in Smart Mode
  useEffect(() => {
    if (mode !== 'smart' || smartStep !== 'qr_scan') return
    const timer = setInterval(() => {
      setSmartTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [mode, smartStep])

  const targetUpiId = festival?.upiId || 'jakkasivasubramanyamguptha@okaxis'
  const payeeName = festival?.upiPayeeName || festival?.committeeName || 'Sri Nageshwar Youth Committee'
  const numericSmartAmount = parseFloat(smartAmount) || 0

  const smartUpiUri = `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${numericSmartAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    'Ganesh Chanda 2026 - ' + (smartName || 'Devotee')
  )}&tr=${encodeURIComponent(smartTxnRef || 'GC' + Date.now().toString().slice(-6))}`

  const handleStartSmartPay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!smartName.trim()) {
      toast.error('Please enter devotee name')
      return
    }
    if (!smartMobile.trim() || smartMobile.replace(/\D/g, '').length < 10) {
      toast.error('Please enter valid 10-digit mobile number')
      return
    }
    if (numericSmartAmount <= 0) {
      toast.error('Please enter a valid donation amount')
      return
    }

    const generatedRef = `GC${Date.now().toString().slice(-6)}`
    setSmartTxnRef(generatedRef)
    setSmartTimer(300)
    setSmartStep('qr_scan')
  }

  const handleCompleteSmartBill = async (simulated = false) => {
    if (!festival || !user) return
    setIsVerifyingSmart(true)
    try {
      const selectedDept = departments.find((d) => d.id === smartDeptId)
      const contrib = await createContribution({
        festivalId: festival.id,
        festivalYear: festival.festivalYear || '2026',
        contributorName: smartName.trim(),
        mobile: smartMobile.trim(),
        houseNumber: smartHouse.trim() || undefined,
        amount: numericSmartAmount,
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        collectedBy: user.name,
        collectedByUid: user.uid,
        departmentId: smartDeptId || selectedDept?.id || 'general',
        departmentName: smartDeptName || selectedDept?.name || 'General',
        notes: `Smart Auto-Pay Dynamic QR (UTR: ${smartTxnRef})`,
        createdBy: user.uid,
      })

      playSuccessChime()

      await logActivity({
        festivalId: festival.id,
        userId: user.uid,
        userName: user.name,
        role: user.role,
        action: 'CONTRIBUTION_CREATED',
        entityType: 'contribution',
        entityId: contrib.id,
        description: `Smart Auto-Pay: ₹${numericSmartAmount} verified for ${smartName.trim()}`,
      })

      setCreatedSmartReceipt(contrib)
      setSmartStep('paid_success')
      toast.success(simulated ? '⚡ Bank Credit Verified! Bill Generated!' : 'Payment verified successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to finalize receipt')
    } finally {
      setIsVerifyingSmart(false)
    }
  }

  const handleOpenSmartReceipt = () => {
    if (createdSmartReceipt) {
      onSuccess([createdSmartReceipt], false)
      onClose()
    }
  }

  const handleEqualSplit = (customTotal) => {
    const totalToUse = customTotal !== undefined ? customTotal : splitTotalInput
    const total = parseFloat(totalToUse)
    if (!total || total <= 0 || members.length === 0) {
      toast.error('Please enter a valid total amount to divide')
      return
    }
    const perPerson = total / members.length
    const perPersonStr = perPerson % 1 === 0 ? perPerson.toString() : parseFloat(perPerson.toFixed(2)).toString()
    setMembers((prev) => prev.map((m) => ({ ...m, amount: perPersonStr })))
    toast.success(`Divided ₹${total} into ₹${perPersonStr} per member! ⚡`)
  }

  const handleMemberChange = (id, field, val) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    )
  }

  const addMemberRow = () => {
    const newId = Date.now().toString()
    setMembers((prev) => [...prev, { id: newId, name: '', mobile: '', amount: '' }])
  }

  const removeMemberRow = (id) => {
    if (members.length <= 1) {
      toast.error('At least 1 member is required')
      return
    }
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const setMemberCountPreset = (count) => {
    const newMembers = []
    for (let i = 0; i < count; i++) {
      newMembers.push({
        id: (i + 1).toString(),
        name: members[i]?.name || '',
        mobile: members[i]?.mobile || '',
        amount: members[i]?.amount || '',
      })
    }
    setMembers(newMembers)
  }

  const groupTotalAmount = members.reduce(
    (sum, m) => sum + (parseFloat(m.amount) || 0),
    0
  )

  const handleManualSubmit = async (e) => {
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
        const combinedNotes = [
          singleForm.upiUtr.trim() ? `UPI Ref/UTR: ${singleForm.upiUtr.trim()}` : '',
          singleForm.notes.trim(),
        ]
          .filter(Boolean)
          .join(' • ')

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
          notes: combinedNotes || undefined,
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
      } else if (mode === 'group') {
        const validMembers = members.filter(
          (m) => m.name.trim() !== '' && (parseFloat(m.amount) || 0) > 0
        )

        if (validMembers.length === 0) {
          toast.error('Please enter at least one member name and amount')
          setSubmitting(false)
          return
        }

        const dept = departments.find((d) => d.id === groupDepartmentId)
        const createdList = []

        for (const member of validMembers) {
          const amountNum = parseFloat(member.amount) || 0
          const noteText = [
            roomNumber ? `Room/Flat: ${roomNumber}` : '',
            groupUpiUtr.trim() ? `UPI Ref/UTR: ${groupUpiUtr.trim()}` : '',
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

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === 'smart'
          ? '⚡ Smart Auto-Pay & Instant Auto-Bill'
          : mode === 'single'
          ? 'Add Individual Contribution (Manual)'
          : 'Add Group / Room Contribution (Multi-Split)'
      }
      maxWidth="max-w-2xl"
      footer={
        mode !== 'smart' ? (
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleManualSubmit} loading={submitting}>
              {mode === 'single'
                ? 'Save & Generate Receipt'
                : `Save & Generate ${members.filter((m) => m.name.trim()).length || members.length} Receipts (${formatCurrency(groupTotalAmount)})`}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Unified 3-Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('smart')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              mode === 'smart'
                ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 bg-white/50'
            }`}
          >
            <Sparkles size={15} className={mode === 'smart' ? 'text-gold-200' : 'text-saffron-600'} />
            <span>⚡ Smart Auto-Pay</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              mode === 'single'
                ? 'bg-white text-saffron-800 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User size={15} />
            <span>Manual Single</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('group')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              mode === 'group'
                ? 'bg-white text-saffron-800 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={15} />
            <span>Room Multi-Split</span>
          </button>
        </div>

        {/* 1. SMART AUTO-PAY (DMART STYLE AUTO-BILL) */}
        {mode === 'smart' && (
          <div className="space-y-4">
            {smartStep === 'input' && (
              <form onSubmit={handleStartSmartPay} className="space-y-3.5">
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <Smartphone className="text-saffron-700 flex-shrink-0 mt-0.5" size={17} />
                  <div>
                    <p className="font-bold text-amber-950">DMart-Style Instant Auto-Bill:</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Enter devotee details below to show a <strong>Dynamic Amount-Locked QR</strong>. When devotee scans &amp; pays, the system verifies credit and automatically generates the verified receipt!
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Devotee Name *
                    </label>
                    <input
                      type="text"
                      value={smartName}
                      onChange={(e) => setSmartName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="input-field text-sm font-medium"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Mobile Number (for WhatsApp Receipt) *
                      </label>
                      <input
                        type="tel"
                        value={smartMobile}
                        onChange={(e) => setSmartMobile(e.target.value)}
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        className="input-field text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        House / Door / Room No (Optional)
                      </label>
                      <input
                        type="text"
                        value={smartHouse}
                        onChange={(e) => setSmartHouse(e.target.value)}
                        placeholder="e.g. Flat 302 / Room 12"
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Donation Amount (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-500 text-lg">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={smartAmount}
                        onChange={(e) => setSmartAmount(e.target.value)}
                        placeholder="e.g. 251"
                        className="input-field pl-8 text-xl font-black text-saffron-700"
                        required
                      />
                    </div>
                    {/* Quick Amount Chips */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {[51, 101, 251, 501, 1001, 2100].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSmartAmount(String(amt))}
                          className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-saffron-100 hover:text-saffron-800 text-gray-700 rounded-lg font-bold transition-colors"
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={smartDeptId}
                      onChange={(e) => {
                        setSmartDeptId(e.target.value)
                        const dept = departments.find((d) => d.id === e.target.value)
                        setSmartDeptName(dept?.name || '')
                      }}
                      className="input-field text-xs"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <Button variant="outline" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-saffron-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md transition-all active:scale-95"
                  >
                    <span>Generate Dynamic QR</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {smartStep === 'qr_scan' && (
              <div className="space-y-4 text-center">
                <div className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                    Devotee: <strong className="text-gray-900">{smartName}</strong> ({smartMobile})
                  </p>
                  <p className="text-3xl font-black text-amber-950 mt-1">
                    {formatCurrency(numericSmartAmount)}
                  </p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                    Exact Amount Locked in QR Code
                  </p>
                </div>

                <div className="relative inline-block p-4 bg-white rounded-3xl shadow-xl border-2 border-saffron-400">
                  <QRCodeSVG
                    value={smartUpiUri}
                    size={180}
                    level="H"
                    className="mx-auto"
                  />
                  <div className="mt-2 text-[11px] font-mono text-gray-500 font-bold">
                    Scan with GPay / PhonePe / Paytm
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">UPI ID:</span>
                  <span className="text-xs font-mono font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {targetUpiId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(targetUpiId)
                      setCopiedUPI(true)
                      setTimeout(() => setCopiedUPI(false), 2000)
                      toast.success('UPI ID copied!')
                    }}
                    className="text-xs p-1.5 rounded-lg border text-gray-600 hover:bg-gray-50"
                  >
                    {copiedUPI ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-saffron-400 opacity-75"></span>
                      <Loader2 size={18} className="animate-spin text-saffron-600 relative" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        Waiting for Bank Payment Confirmation...
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        Time: {formatTimer(smartTimer)} • Ref: {smartTxnRef}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCompleteSmartBill(true)}
                    disabled={isVerifyingSmart}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-all active:scale-98 text-sm"
                  >
                    {isVerifyingSmart ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying Bank Credit &amp; Generating Receipt...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>⚡ Confirm Bank Credit &amp; Auto-Generate Bill</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSmartStep('input')}
                    className="w-full text-xs text-gray-500 hover:text-gray-700 font-medium py-1"
                  >
                    ← Back to Edit Devotee Details
                  </button>
                </div>
              </div>
            )}

            {smartStep === 'paid_success' && (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-6 ring-green-50 animate-bounce-once">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                    <ShieldCheck size={14} className="text-green-600" />
                    100% Verified Bank Credit
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Payment Credited Successfully!
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {smartName} paid <strong className="text-green-700">{formatCurrency(numericSmartAmount)}</strong>
                  </p>
                  <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">
                    Receipt No: <span className="text-saffron-700">{createdSmartReceipt?.receiptNumber}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenSmartReceipt}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-saffron-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white font-black py-3 px-6 rounded-2xl shadow-xl transition-all active:scale-98 text-sm"
                >
                  <span>View &amp; Share Devotee Receipt</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. MANUAL SINGLE CONTRIBUTOR MODE */}
        {mode === 'single' && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
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

            {(singleForm.paymentMethod === 'UPI' || singleForm.paymentMethod === 'Online') && (
              <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl text-center space-y-2">
                <UpiQrCode
                  upiId={festival?.upiId || 'srinageshwaryouth@upi'}
                  payeeName={festival?.upiPayeeName || festival?.committeeName || 'Ganesh Committee'}
                  amount={singleForm.amount}
                  note={`VOL_${(user?.name || 'ADMIN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}_${singleForm.houseNumber ? 'RM' + singleForm.houseNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) : 'DEV'}`}
                  size={140}
                  showDetails={true}
                />
                <div className="text-left pt-1">
                  <Input
                    label="UPI Ref / UTR No (Optional)"
                    value={singleForm.upiUtr}
                    onChange={(e) => setSingleForm((f) => ({ ...f, upiUtr: e.target.value }))}
                    placeholder="e.g. 423819283192"
                    maxLength={12}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
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
                placeholder="Optional notes..."
                className="input-field resize-none text-xs"
                rows={2}
              />
            </div>
          </form>
        )}

        {/* 3. GROUP / ROOM MULTI-MEMBER MODE */}
        {mode === 'group' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-3.5 rounded-2xl space-y-2.5">
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
                  <Plus size={13} /> Add Member
                </button>
              </div>

              {/* ⚡ Equal Split Tool */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-950">⚡ Divide Total Amount:</span>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 251"
                      value={splitTotalInput}
                      onChange={(e) => setSplitTotalInput(e.target.value)}
                      className="input-field text-xs py-1 pl-6 font-bold text-gray-900"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEqualSplit()}
                  className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all"
                >
                  Divide Equally ({members.length} Members)
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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

                    <div className="relative w-28 flex-shrink-0">
                      <span className="absolute left-2 top-2 text-gray-400 text-xs">₹</span>
                      <input
                        type="number"
                        step="any"
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
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-saffron-50 via-amber-50 to-orange-50 border-2 border-saffron-300 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs font-bold text-saffron-900 uppercase tracking-wider">
                    Total Combined Collection
                  </p>
                  <p className="text-2xl font-black text-green-700">
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

              {(groupPaymentMethod === 'UPI' || groupPaymentMethod === 'Online') && (
                <div className="bg-white/90 p-3 rounded-2xl border border-amber-200 text-center shadow-xs space-y-1.5">
                  <UpiQrCode
                    upiId={festival?.upiId || 'srinageshwaryouth@upi'}
                    payeeName={festival?.upiPayeeName || festival?.committeeName || 'Ganesh Committee'}
                    amount={groupTotalAmount.toString()}
                    note={`VOL_${(user?.name || 'ADMIN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}_${roomNumber ? 'RM' + roomNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) : 'GRP'}`}
                    size={150}
                    showDetails={true}
                  />
                  <div className="text-left pt-1">
                    <Input
                      label="UPI Ref / UTR No (Optional)"
                      value={groupUpiUtr}
                      onChange={(e) => setGroupUpiUtr(e.target.value)}
                      placeholder="e.g. 423819283192"
                      maxLength={12}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              )}
            </div>

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
          </form>
        )}
      </div>
    </Modal>
  )
}
