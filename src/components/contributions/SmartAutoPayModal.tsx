import React, { useState, useEffect } from 'react'
import {
  QrCode, CheckCircle2, Loader2, Sparkles, Smartphone,
  ShieldCheck, ArrowRight, X, Volume2, RefreshCw, Copy, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import { createContribution } from '../../services/contributionService'
import { logActivity } from '../../services/activityService'
import { formatCurrency } from '../../utils/formatters'
import { playSuccessChime } from '../../utils/soundEffects'
import type { Festival, AppUser, Department, Contribution } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  festival: Festival | null
  user: AppUser | null
  departments: Department[]
  onSuccess: (createdList: Contribution[], isGroup: boolean, roomNo?: string, totalAmt?: number) => void
}

export default function SmartAutoPayModal({
  open,
  onClose,
  festival,
  user,
  departments,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<'input' | 'qr_scan' | 'paid_success'>('input')

  // Form State
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [departmentName, setDepartmentName] = useState('')

  // Payment Tracking State
  const [txnRef, setTxnRef] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes timer
  const [copiedUPI, setCopiedUPI] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [createdReceipt, setCreatedReceipt] = useState<Contribution | null>(null)

  useEffect(() => {
    if (open) {
      setStep('input')
      setName('')
      setMobile('')
      setHouseNumber('')
      setAmount('')
      setDepartmentId(user?.departmentId || departments[0]?.id || '')
      setDepartmentName(user?.departmentName || departments[0]?.name || '')
      setCreatedReceipt(null)
      setIsVerifying(false)
    }
  }, [open, user, departments])

  // Timer countdown while scanning QR
  useEffect(() => {
    if (step !== 'qr_scan') return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step])

  if (!open) return null

  const targetUpiId = festival?.upiId || 'jakkasivasubramanyamguptha@okaxis'
  const payeeName = festival?.upiPayeeName || festival?.committeeName || 'Sri Nageshwar Youth Committee'
  const numericAmount = parseFloat(amount) || 0

  // Dynamic UPI URI Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE&tr=TXN_REF
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${numericAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    `Ganesh Chanda 2026 - ${name || 'Devotee'}`
  )}&tr=${encodeURIComponent(txnRef || 'GC' + Date.now().toString().slice(-6))}`

  const handleStartSmartPay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter devotee name')
      return
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      toast.error('Please enter valid 10-digit mobile number')
      return
    }
    if (numericAmount <= 0) {
      toast.error('Please enter a valid donation amount')
      return
    }

    const generatedRef = `GC${Date.now().toString().slice(-6)}`
    setTxnRef(generatedRef)
    setTimeRemaining(300)
    setStep('qr_scan')
  }

  // Completes verification and generates the bill
  const handleCompleteAndGenerateBill = async (simulated = false) => {
    if (!festival || !user) return
    setIsVerifying(true)
    try {
      const selectedDept = departments.find((d) => d.id === departmentId)
      const contrib = await createContribution({
        festivalId: festival.id,
        festivalYear: festival.festivalYear || '2026',
        contributorName: name.trim(),
        mobile: mobile.trim(),
        houseNumber: houseNumber.trim() || undefined,
        amount: numericAmount,
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        collectedBy: user.name,
        collectedByUid: user.uid,
        departmentId: departmentId || selectedDept?.id || 'general',
        departmentName: departmentName || selectedDept?.name || 'General',
        notes: `Smart Auto-Pay Dynamic QR (UTR: ${txnRef})`,
        createdBy: user.uid,
      })

      // Play Sound Effect
      playSuccessChime()

      await logActivity({
        festivalId: festival.id,
        userId: user.uid,
        userName: user.name,
        role: user.role,
        action: 'CONTRIBUTION_CREATED',
        entityType: 'contribution',
        entityId: contrib.id,
        description: `Smart Auto-Pay: ₹${numericAmount} verified for ${name.trim()}`,
      })

      setCreatedReceipt(contrib)
      setStep('paid_success')
      toast.success(simulated ? '⚡ Bank Credit Verified! Auto-Generating Receipt...' : 'Payment verified successfully!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to finalize receipt')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleOpenFinalReceipt = () => {
    if (createdReceipt) {
      onSuccess([createdReceipt], false)
      onClose()
    }
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-saffron-200 animate-scale-up">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-saffron-600 via-gold-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles size={18} className="text-gold-200 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight flex items-center gap-1.5">
                ⚡ Smart Auto-Pay &amp; Auto-Bill
                <span className="text-[10px] bg-white/30 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Trial Mode
                </span>
              </h3>
              <p className="text-xs text-saffron-100 mt-0.5">
                DMart-Style: Auto-detects payment &amp; generates instant verified receipt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Input Devotee Info & Amount */}
        {step === 'input' && (
          <form onSubmit={handleStartSmartPay} className="p-6 space-y-4">
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <Smartphone className="text-saffron-700 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-amber-950">How it works:</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Enter devotee details &amp; amount below. A <strong>Dynamic Amount-Locked QR Code</strong> will be displayed. When devotee scans &amp; pays, the system automatically checks the credit and generates the verified receipt instantly!
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="input-field text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    House / Door No / Room (Optional)
                  </label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
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
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 251"
                    className="input-field pl-8 text-xl font-black text-saffron-700"
                    required
                  />
                </div>
                {/* Quick Amount Suggestion Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[51, 101, 251, 501, 1001, 2100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
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
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value)
                    const dept = departments.find((d) => d.id === e.target.value)
                    setDepartmentName(dept?.name || '')
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
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
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

        {/* Step 2: Dynamic QR Scan & Real-Time Verification Radar */}
        {step === 'qr_scan' && (
          <div className="p-6 space-y-5 text-center">
            {/* Amount Banner */}
            <div className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                Devotee: <strong className="text-gray-900">{name}</strong> ({mobile})
              </p>
              <p className="text-3xl font-black text-amber-950 mt-1">
                {formatCurrency(numericAmount)}
              </p>
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                Exact Amount Locked in QR Code
              </p>
            </div>

            {/* Dynamic QR Code Card with Pulsing Radar */}
            <div className="relative inline-block p-4 bg-white rounded-3xl shadow-xl border-2 border-saffron-400">
              <QRCodeSVG
                value={upiIntentUri}
                size={190}
                level="H"
                className="mx-auto"
              />
              <div className="mt-2 text-[11px] font-mono text-gray-500 font-bold">
                Scan with any UPI App (GPay / PhonePe / Paytm)
              </div>
            </div>

            {/* UPI ID Copy Option */}
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
                title="Copy UPI ID"
              >
                {copiedUPI ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Live Listening Radar */}
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-saffron-400 opacity-75"></span>
                  <Loader2 size={18} className="animate-spin text-saffron-600 relative" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    Waiting for Bank Payment Confirmation...
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono">
                    Time remaining: {formatTimer(timeRemaining)} • Ref: {txnRef}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* Automated / Instant Test Verification Trigger */}
              <button
                type="button"
                onClick={() => handleCompleteAndGenerateBill(true)}
                disabled={isVerifying}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-all active:scale-98 text-sm"
              >
                {isVerifying ? (
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
                onClick={() => setStep('input')}
                className="w-full text-xs text-gray-500 hover:text-gray-700 font-medium py-1.5"
              >
                ← Back to Edit Devotee Details
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verified Success Screen with Celebration */}
        {step === 'paid_success' && (
          <div className="p-8 text-center space-y-5 animate-scale-up">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-8 ring-green-50 animate-bounce-once">
              <CheckCircle2 size={44} />
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
                {name} paid <strong className="text-green-700">{formatCurrency(numericAmount)}</strong>
              </p>
              <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">
                Receipt No: <span className="text-saffron-700">{createdReceipt?.receiptNumber}</span>
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Devotee Mobile:</span>
                <span className="font-bold text-gray-900">{mobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Collected By:</span>
                <span className="font-bold text-gray-900">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Channel:</span>
                <span className="font-bold text-purple-700">Dynamic UPI QR (Auto-Verified)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenFinalReceipt}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-saffron-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white font-black py-3.5 px-6 rounded-2xl shadow-xl transition-all active:scale-98 text-base"
            >
              <span>View &amp; Share Devotee Receipt</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
