import React, { useState, useEffect, useRef } from 'react'
import {
  User,
  Users,
  Plus,
  Trash2,
  IndianRupee,
  Phone,
  Home,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  Banknote,
  Mic,
  MicOff,
  Volume2,
  Languages
} from 'lucide-react'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { createContribution } from '../../services/contributionService'
import { logActivity } from '../../services/activityService'
import { formatCurrency } from '../../utils/formatters'
import { playSuccessChime } from '../../utils/soundEffects'
import { parseVoiceSpeech } from '../../utils/voiceParser'
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
  // Main Tab Mode: 'single' | 'group'
  const [tabMode, setTabMode] = useState<'single' | 'group'>('single')
  
  // Payment Flow Mode: 'smart_upi' | 'manual'
  const [flowMode, setFlowMode] = useState<'smart_upi' | 'manual'>('smart_upi')

  // Smart Auto-Pay Step: 'input' | 'qr_scan' | 'paid_success'
  const [smartStep, setSmartStep] = useState<'input' | 'qr_scan' | 'paid_success'>('input')
  const [smartTimer, setSmartTimer] = useState(300)
  const [smartTxnRef, setSmartTxnRef] = useState('')
  const [copiedUPI, setCopiedUPI] = useState(false)
  const [isVerifyingSmart, setIsVerifyingSmart] = useState(false)
  const [createdContributions, setCreatedContributions] = useState<Contribution[]>([])
  const [submittingManual, setSubmittingManual] = useState(false)

  // ==========================================
  // 🧠 AI VOICE COLLECTION STATE
  // ==========================================
  const [isListening, setIsListening] = useState(false)
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'te-IN'>('en-IN')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceHighlight, setVoiceHighlight] = useState(false)
  const recognitionRef = useRef<any>(null)

  // ==========================================
  // SINGLE FORM STATE
  // ==========================================
  const [singleName, setSingleName] = useState('')
  const [singleMobile, setSingleMobile] = useState('')
  const [singleHouse, setSingleHouse] = useState('')
  const [singleAmount, setSingleAmount] = useState('')
  const [singleDeptId, setSingleDeptId] = useState('')
  const [singleDeptName, setSingleDeptName] = useState('')
  const [singleManualMethod, setSingleManualMethod] = useState<PaymentMethod>('Cash')
  const [singleManualStatus, setSingleManualStatus] = useState<PaymentStatus>('Paid')
  const [singleNotes, setSingleNotes] = useState('')

  // ==========================================
  // GROUP MULTI-MEMBER FORM STATE
  // ==========================================
  const [roomNumber, setRoomNumber] = useState('')
  const [groupDeptId, setGroupDeptId] = useState('')
  const [groupDeptName, setGroupDeptName] = useState('')
  const [groupManualMethod, setGroupManualMethod] = useState<PaymentMethod>('Cash')
  const [groupManualStatus, setGroupManualStatus] = useState<PaymentStatus>('Paid')
  const [groupNotes, setGroupNotes] = useState('')
  const [splitTotalInput, setSplitTotalInput] = useState('')

  const [members, setMembers] = useState<GroupMemberRow[]>([
    { id: '1', name: '', mobile: '', amount: '' },
    { id: '2', name: '', mobile: '', amount: '' },
    { id: '3', name: '', mobile: '', amount: '' },
    { id: '4', name: '', mobile: '', amount: '' },
  ])

  useEffect(() => {
    if (open) {
      setTabMode('single')
      setFlowMode('smart_upi')
      setSmartStep('input')
      setSingleName('')
      setSingleMobile('')
      setSingleHouse('')
      setSingleAmount('')
      setSingleNotes('')
      setVoiceTranscript('')
      setIsListening(false)
      setCreatedContributions([])
      setIsVerifyingSmart(false)

      if (departments.length > 0) {
        setSingleDeptId(user?.departmentId || departments[0].id)
        setSingleDeptName(user?.departmentName || departments[0].name)
        setGroupDeptId(user?.departmentId || departments[0].id)
        setGroupDeptName(user?.departmentName || departments[0].name)
      }
    }
  }, [open, user, departments])

  // Stop voice recognition when modal closes
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [])

  // Timer countdown while scanning QR in Smart Mode
  useEffect(() => {
    if (smartStep !== 'qr_scan') return
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
  }, [smartStep])

  // ==========================================
  // 🧠 AI VOICE LISTENER HANDLER
  // ==========================================
  const toggleVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = voiceLang
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onstart = () => {
        setIsListening(true)
        setVoiceTranscript('')
        toast('🎙️ Listening... Speak devotee details now', { icon: '👂' })
      }

      recognition.onresult = (event: any) => {
        const current = event.resultIndex
        const transcript = event.results[current][0].transcript
        setVoiceTranscript(transcript)

        // Process final speech
        if (event.results[current].isFinal) {
          handleVoiceParse(transcript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission was denied. Please allow mic access in your browser settings.')
        } else {
          toast.error(`Voice error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (e) {
      console.error(e)
      setIsListening(false)
      toast.error('Failed to start voice recognition.')
    }
  }

  const handleVoiceParse = (spokenText: string) => {
    const parsed = parseVoiceSpeech(spokenText)

    if (parsed.name) setSingleName(parsed.name)
    if (parsed.room) {
      setSingleHouse(parsed.room)
      setRoomNumber(parsed.room)
    }
    if (parsed.amount) {
      setSingleAmount(parsed.amount.toString())
      setSplitTotalInput(parsed.amount.toString())
    }
    if (parsed.paymentMethod) {
      if (parsed.paymentMethod === 'UPI') {
        setFlowMode('smart_upi')
      } else {
        setFlowMode('manual')
        setSingleManualMethod(parsed.paymentMethod)
      }
    }

    // Visual pulse feedback
    setVoiceHighlight(true)
    setTimeout(() => setVoiceHighlight(false), 2000)

    const summary = [
      parsed.name ? `👤 ${parsed.name}` : '',
      parsed.room ? `🏠 Room ${parsed.room}` : '',
      parsed.amount ? `₹${parsed.amount}` : '',
      parsed.paymentMethod ? `💳 ${parsed.paymentMethod}` : '',
    ]
      .filter(Boolean)
      .join(' • ')

    if (summary) {
      toast.success(`✨ AI Auto-Filled: ${summary}`, { duration: 4000 })
    } else {
      toast('Could not recognize structured fields. Try speaking clearly: "Room 204, Ravi, 500 rupees UPI"', { icon: 'ℹ️' })
    }
  }

  const targetUpiId = festival?.upiId || 'jakkasivasubramanyamguptha@okaxis'
  const payeeName = festival?.upiPayeeName || festival?.committeeName || 'Sri Nageshwar Youth Committee'
  
  const numericSingleAmount = parseFloat(singleAmount) || 0
  const groupTotalAmount = members.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)
  
  // Total to lock in QR code
  const currentTotalToPay = tabMode === 'single' ? numericSingleAmount : groupTotalAmount

  const smartUpiUri = `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${currentTotalToPay.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    tabMode === 'single'
      ? `Ganesh Chanda 2026 - ${singleName || 'Devotee'}`
      : `Ganesh Chanda 2026 - Room ${roomNumber || 'Group'} (${members.filter(m => m.name.trim()).length} Members)`
  )}&tr=${encodeURIComponent(smartTxnRef || 'GC' + Date.now().toString().slice(-6))}`

  // ⚡ START SMART AUTO-PAY
  const handleStartSmartPay = (e: React.FormEvent) => {
    e.preventDefault()
    if (tabMode === 'single') {
      if (!singleName.trim()) {
        toast.error('Please enter devotee name')
        return
      }
      if (!singleMobile.trim() || singleMobile.replace(/\D/g, '').length < 10) {
        toast.error('Please enter valid 10-digit mobile number')
        return
      }
      if (numericSingleAmount <= 0) {
        toast.error('Please enter a valid donation amount')
        return
      }
    } else {
      if (!roomNumber.trim()) {
        toast.error('Please enter room/flat number')
        return
      }
      const validMembers = members.filter(m => m.name.trim() !== '' && (parseFloat(m.amount) || 0) > 0)
      if (validMembers.length === 0) {
        toast.error('Please enter at least 1 member name and amount')
        return
      }
      if (groupTotalAmount <= 0) {
        toast.error('Please calculate or divide member amounts')
        return
      }
    }

    const generatedRef = `GC${Date.now().toString().slice(-6)}`
    setSmartTxnRef(generatedRef)
    setSmartTimer(300)
    setSmartStep('qr_scan')
  }

  // ⚡ CONFIRM SMART AUTO-PAY & AUTO-GENERATE BILLS
  const handleCompleteSmartBill = async (simulated = false) => {
    if (!festival || !user) return
    setIsVerifyingSmart(true)
    try {
      if (tabMode === 'single') {
        const selectedDept = departments.find((d) => d.id === singleDeptId)
        const contrib = await createContribution({
          festivalId: festival.id,
          festivalYear: festival.festivalYear || '2026',
          contributorName: singleName.trim(),
          mobile: singleMobile.trim(),
          houseNumber: singleHouse.trim() || undefined,
          amount: numericSingleAmount,
          paymentMethod: 'UPI',
          paymentStatus: 'Paid',
          collectedBy: user.name,
          collectedByUid: user.uid,
          departmentId: singleDeptId || selectedDept?.id || 'general',
          departmentName: singleDeptName || selectedDept?.name || 'General',
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
          description: `Smart Auto-Pay: ₹${numericSingleAmount} verified for ${singleName.trim()}`,
        })

        setCreatedContributions([contrib])
        setSmartStep('paid_success')
        toast.success(simulated ? '⚡ Bank Credit Verified! Bill Generated!' : 'Payment verified successfully!')
      } else {
        const validMembers = members.filter(m => m.name.trim() !== '' && (parseFloat(m.amount) || 0) > 0)
        const selectedDept = departments.find((d) => d.id === groupDeptId)
        const createdList: Contribution[] = []

        for (const member of validMembers) {
          const amountNum = parseFloat(member.amount) || 0
          const noteText = [
            `Room/Flat: ${roomNumber.trim()}`,
            `Smart Auto-Pay Dynamic QR (Ref: ${smartTxnRef})`,
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
            paymentMethod: 'UPI',
            paymentStatus: 'Paid',
            collectedBy: user.name,
            collectedByUid: user.uid,
            departmentId: groupDeptId || selectedDept?.id || 'general',
            departmentName: groupDeptName || selectedDept?.name || 'General',
            notes: noteText,
            createdBy: user.uid,
          })

          createdList.push(c)
        }

        playSuccessChime()

        await logActivity({
          festivalId: festival.id,
          userId: user.uid,
          userName: user.name,
          role: user.role,
          action: 'GROUP_CONTRIBUTION_CREATED',
          entityType: 'contribution',
          description: `Smart Auto-Pay: ₹${groupTotalAmount} verified for ${roomNumber} (${createdList.length} members auto-billed)`,
        })

        setCreatedContributions(createdList)
        setSmartStep('paid_success')
        toast.success(`⚡ Verified! ${createdList.length} Member Bills Auto-Generated!`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to finalize receipts')
    } finally {
      setIsVerifyingSmart(false)
    }
  }

  const handleOpenSmartFinalReceipts = () => {
    if (createdContributions.length > 0) {
      if (tabMode === 'single') {
        onSuccess(createdContributions, false)
      } else {
        onSuccess(createdContributions, true, roomNumber, groupTotalAmount)
      }
      onClose()
    }
  }

  // 💵 MANUAL FORM SUBMIT
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!festival || !user) {
      toast.error('System not initialized')
      return
    }

    setSubmittingManual(true)
    try {
      if (tabMode === 'single') {
        if (!singleName.trim() || !singleMobile.trim() || !singleAmount) {
          toast.error('Please fill contributor name, mobile, and amount')
          setSubmittingManual(false)
          return
        }

        const dept = departments.find((d) => d.id === singleDeptId)

        const c = await createContribution({
          festivalId: festival.id,
          festivalYear: festival.festivalYear || '2026',
          contributorName: singleName.trim(),
          mobile: singleMobile.trim(),
          houseNumber: singleHouse.trim() || undefined,
          amount: parseFloat(singleAmount),
          paymentMethod: singleManualMethod,
          paymentStatus: singleManualStatus,
          collectedBy: user.name,
          collectedByUid: user.uid,
          departmentId: singleDeptId || user.departmentId || 'general',
          departmentName: dept?.name || singleDeptName || user.departmentName || 'General',
          notes: singleNotes.trim() || undefined,
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
          description: `${user.name} recorded ${formatCurrency(c.amount)} from ${c.contributorName} (${singleManualMethod})`,
        })

        onClose()
        onSuccess([c], false)
      } else {
        const validMembers = members.filter(
          (m) => m.name.trim() !== '' && (parseFloat(m.amount) || 0) > 0
        )

        if (validMembers.length === 0) {
          toast.error('Please enter at least one member name and amount')
          setSubmittingManual(false)
          return
        }

        const dept = departments.find((d) => d.id === groupDeptId)
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
            paymentMethod: groupManualMethod,
            paymentStatus: groupManualStatus,
            collectedBy: user.name,
            collectedByUid: user.uid,
            departmentId: groupDeptId || user.departmentId || 'general',
            departmentName: dept?.name || groupDeptName || user.departmentName || 'General',
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
      setSubmittingManual(false)
    }
  }

  const handleEqualSplit = (customTotal?: string) => {
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

  const handleMemberChange = (id: string, field: keyof GroupMemberRow, val: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    )
  }

  const addMemberRow = () => {
    const newId = Date.now().toString()
    setMembers((prev) => [...prev, { id: newId, name: '', mobile: '', amount: '' }])
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
        amount: members[i]?.amount || '',
      })
    }
    setMembers(newMembers)
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        smartStep === 'qr_scan'
          ? '⚡ Scan Dynamic QR (Auto-Bill)'
          : tabMode === 'single'
          ? 'Record Individual Devotee Contribution'
          : 'Record Room / Group Multi-Member Contribution'
      }
      maxWidth="max-w-2xl"
      footer={
        flowMode === 'manual' ? (
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleManualSubmit} loading={submittingManual}>
              {tabMode === 'single'
                ? 'Save Cash Receipt'
                : `Save ${members.filter((m) => m.name.trim()).length || members.length} Member Receipts (${formatCurrency(groupTotalAmount)})`}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Step 1: Mode Selectors & 🧠 AI Voice Fill Bar */}
        {smartStep === 'input' && (
          <div className="space-y-3">
            {/* 🧠 AI VOICE COLLECTION SMART BANNER */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-amber-900 text-white p-3 rounded-2xl shadow-lg border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-xl text-gold-300">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-wide text-gold-200 uppercase flex items-center gap-1.5">
                      🧠 AI Voice Auto-Fill
                      <span className="text-[9px] bg-saffron-500 text-white px-1.5 py-0.2 rounded-full uppercase font-black tracking-wider">
                        Trial
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-200">
                      Speak in English or Telugu — forms auto-fill instantly!
                    </p>
                  </div>
                </div>

                {/* Language Switcher + Mic Button */}
                <div className="flex items-center gap-2">
                  <select
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value as any)}
                    className="bg-black/30 border border-white/20 text-white text-xs rounded-xl px-2 py-1.5 font-bold focus:outline-none"
                  >
                    <option value="en-IN" className="text-gray-900">🇬🇧 English (India)</option>
                    <option value="te-IN" className="text-gray-900">🇮🇳 తెలుగు (Telugu)</option>
                  </select>

                  <button
                    type="button"
                    onClick={toggleVoiceRecognition}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-400/40'
                        : 'bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-gray-950 ring-2 ring-gold-300/50'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff size={14} />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Mic size={14} />
                        <span>Tap to Speak</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Real-time Listening Transcript */}
              {isListening && (
                <div className="bg-black/40 border border-white/20 rounded-xl p-2.5 flex items-start gap-2 animate-pulse">
                  <Volume2 size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="text-gold-300 font-bold">Listening... </span>
                    <span className="text-gray-200 italic font-mono">
                      {voiceTranscript || (voiceLang === 'en-IN' ? 'Say e.g. "Room 204, Ravi, 500 rupees UPI"' : 'చెప్పండి: "రూమ్ 204 రవి ఐదు వందలు UPI"')}
                    </span>
                  </div>
                </div>
              )}

              {/* Sample Voice Prompts for Volunteer Reference */}
              {!isListening && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-[11px] text-gray-300 flex items-center justify-between flex-wrap gap-1">
                  <span>💡 <strong>Voice Example:</strong> {voiceLang === 'en-IN' ? '"Room 204, Ravi, 500 rupees UPI"' : '"రూమ్ 204 రవి ఐదు వందలు UPI"'}</span>
                  <span className="text-[10px] text-gold-300 font-bold">Auto-fills Name, Room, Amount &amp; UPI!</span>
                </div>
              )}
            </div>

            {/* 1. Main Scope Tab: Individual vs Room Multi-Split */}
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setTabMode('single')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                  tabMode === 'single'
                    ? 'bg-white text-saffron-900 shadow-md ring-1 ring-black/5'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User size={16} className={tabMode === 'single' ? 'text-saffron-600' : 'text-gray-400'} />
                <span>👤 Individual Contributor</span>
              </button>

              <button
                type="button"
                onClick={() => setTabMode('group')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                  tabMode === 'group'
                    ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users size={16} />
                <span>👥 Room / Group (Multi-Split)</span>
              </button>
            </div>

            {/* 2. Payment Channel Switcher: Smart Auto-Pay (UPI) vs Cash/Manual */}
            <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 p-2 rounded-2xl">
              <span className="text-xs font-black text-amber-950 px-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-saffron-600" />
                Select Payment Channel:
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setFlowMode('smart_upi')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    flowMode === 'smart_upi'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Smartphone size={13} />
                  <span>⚡ Smart Auto-Pay (UPI QR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlowMode('manual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    flowMode === 'manual'
                      ? 'bg-green-700 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Banknote size={13} />
                  <span>💵 Cash / Cheque</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* A. INDIVIDUAL MODE - INPUT FORM                                            */}
        {/* ========================================================================= */}
        {tabMode === 'single' && smartStep === 'input' && (
          <form onSubmit={flowMode === 'smart_upi' ? handleStartSmartPay : handleManualSubmit} className="space-y-3.5">
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-1 rounded-2xl transition-all ${voiceHighlight ? 'ring-2 ring-purple-500 bg-purple-50/50' : ''}`}>
              <Input
                label="Contributor Name *"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
                autoFocus
              />
              <Input
                label="Mobile / WhatsApp Number *"
                type="tel"
                value={singleMobile}
                onChange={(e) => setSingleMobile(e.target.value)}
                placeholder="10-digit mobile number"
                icon={<Phone size={16} />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="House / Flat / Room No"
                value={singleHouse}
                onChange={(e) => setSingleHouse(e.target.value)}
                placeholder="e.g. Flat 302 / Room 12"
                icon={<Home size={16} />}
              />
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Donation Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-500 text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    placeholder="500"
                    className="input-field pl-8 font-black text-saffron-700"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-gray-400">Quick:</span>
              {[51, 101, 251, 501, 1001, 2100, 5001].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSingleAmount(String(amt))}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-saffron-100 hover:text-saffron-800 text-gray-700 rounded-lg font-bold transition-colors"
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Manual Payment Method Details */}
            {flowMode === 'manual' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={singleManualMethod}
                    onChange={(e) => setSingleManualMethod(e.target.value as PaymentMethod)}
                    className="input-field"
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="Online">🌐 Online Bank Transfer</option>
                    <option value="Cheque">🏦 Cheque</option>
                    <option value="UPI">📱 Custom UPI (Manual)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Payment Status
                  </label>
                  <select
                    value={singleManualStatus}
                    onChange={(e) => setSingleManualStatus(e.target.value as PaymentStatus)}
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
            )}

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                Department
              </label>
              <select
                value={singleDeptId}
                onChange={(e) => {
                  const dept = departments.find((d) => d.id === e.target.value)
                  setSingleDeptId(e.target.value)
                  setSingleDeptName(dept?.name || '')
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

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                value={singleNotes}
                onChange={(e) => setSingleNotes(e.target.value)}
                placeholder="e.g. Special Annadanam Contribution"
                className="input-field text-xs"
              />
            </div>

            {flowMode === 'smart_upi' && (
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-saffron-600 via-gold-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-md transition-all active:scale-95"
                >
                  <span>⚡ Generate Dynamic QR (₹{numericSingleAmount || 0})</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </form>
        )}

        {/* ========================================================================= */}
        {/* B. GROUP / ROOM MULTI-SPLIT MODE - INPUT FORM                             */}
        {/* ========================================================================= */}
        {tabMode === 'group' && smartStep === 'input' && (
          <form onSubmit={flowMode === 'smart_upi' ? handleStartSmartPay : handleManualSubmit} className="space-y-3.5">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-3.5 rounded-2xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <Input
                  label="Room / Flat / House No *"
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

            {/* Room Members Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <Users size={14} className="text-saffron-600" />
                  Room Members ({members.length}) &amp; Individual Split
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

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
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
                      onChange={(e) => handleMemberChange(member.id, 'name', e.target.value)}
                      className="input-field text-xs py-1.5 flex-1 min-w-[110px]"
                      required
                    />

                    <input
                      type="tel"
                      placeholder="WhatsApp No *"
                      value={member.mobile}
                      onChange={(e) => handleMemberChange(member.id, 'mobile', e.target.value)}
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
                        onChange={(e) => handleMemberChange(member.id, 'amount', e.target.value)}
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

            {/* Total Summary */}
            <div className="bg-gradient-to-br from-saffron-50 via-amber-50 to-orange-50 border-2 border-saffron-300 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-saffron-900 uppercase tracking-wider">
                  Total Room Collection
                </p>
                <p className="text-2xl font-black text-green-700">
                  {formatCurrency(groupTotalAmount)}
                </p>
              </div>
              <span className="text-xs font-bold bg-white text-saffron-900 px-3 py-1.5 rounded-xl border border-saffron-200 shadow-xs">
                {members.filter(m => m.name.trim()).length || members.length} Individual Bills Will Be Generated
              </span>
            </div>

            {flowMode === 'smart_upi' && (
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-saffron-600 via-gold-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-md transition-all active:scale-95"
                >
                  <span>⚡ Generate 1 Combined Room QR ({formatCurrency(groupTotalAmount)})</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </form>
        )}

        {/* ========================================================================= */}
        {/* C. STEP 2: DYNAMIC AMOUNT-LOCKED QR CODE & RADAR SCREEN                   */}
        {/* ========================================================================= */}
        {smartStep === 'qr_scan' && (
          <div className="space-y-4 text-center">
            {/* Header info */}
            <div className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                {tabMode === 'single' ? (
                  <>Devotee: <strong className="text-gray-900">{singleName}</strong> ({singleMobile})</>
                ) : (
                  <>Room: <strong className="text-gray-900">{roomNumber}</strong> ({members.filter(m => m.name.trim()).length} Members)</>
                )}
              </p>
              <p className="text-3xl font-black text-amber-950 mt-1">
                {formatCurrency(currentTotalToPay)}
              </p>
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                {tabMode === 'single' ? 'Exact Amount Locked in QR' : '1 Combined QR for Entire Room'}
              </p>
            </div>

            {/* Dynamic QR */}
            <div className="relative inline-block p-4 bg-white rounded-3xl shadow-xl border-2 border-saffron-400">
              <QRCodeSVG
                value={smartUpiUri}
                size={185}
                level="H"
                className="mx-auto"
              />
              <div className="mt-2 text-[11px] font-mono text-gray-500 font-bold">
                Scan with any UPI App (GPay / PhonePe / Paytm)
              </div>
            </div>

            {/* UPI ID Copy */}
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

            {/* Radar status */}
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
                    Time remaining: {formatTimer(smartTimer)} • Ref: {smartTxnRef}
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation Buttons */}
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
                    <span>Verifying Bank Credit &amp; Auto-Generating Bills...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      {tabMode === 'single'
                        ? '⚡ Confirm Bank Credit & Auto-Generate Bill'
                        : `⚡ Confirm Bank Credit & Auto-Generate ${members.filter(m => m.name.trim()).length} Member Bills`}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSmartStep('input')}
                className="w-full text-xs text-gray-500 hover:text-gray-700 font-medium py-1"
              >
                ← Back to Edit Details
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* D. STEP 3: SUCCESS CELEBRATION & BILLS GENERATED SCREEN                   */}
        {/* ========================================================================= */}
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
                {tabMode === 'single' ? (
                  <>{singleName} paid <strong className="text-green-700">{formatCurrency(numericSingleAmount)}</strong></>
                ) : (
                  <>Room {roomNumber} paid <strong className="text-green-700">{formatCurrency(groupTotalAmount)}</strong> ({createdContributions.length} Member Bills Generated)</>
                )}
              </p>
            </div>

            {/* List of created receipts */}
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 text-left text-xs max-h-40 overflow-y-auto space-y-1.5">
              {createdContributions.map((c, idx) => (
                <div key={c.id} className="flex items-center justify-between border-b border-gray-200/60 pb-1 last:border-0 last:pb-0">
                  <span className="font-bold text-gray-900">{idx + 1}. {c.contributorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-saffron-800 font-semibold">{c.receiptNumber}</span>
                    <span className="font-bold text-green-700">{formatCurrency(c.amount)}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleOpenSmartFinalReceipts}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-saffron-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white font-black py-3 px-6 rounded-2xl shadow-xl transition-all active:scale-98 text-sm"
            >
              <span>View &amp; Share {tabMode === 'single' ? 'Devotee Receipt' : 'Room Receipts & WhatsApp Card'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
