import React, { useEffect, useState } from 'react'
import { Plus, Download, Edit2, Trash2, IndianRupee, Receipt, Calendar, ArrowUpDown, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { subscribeToContributions, updateContribution, deleteContribution } from '../../services/contributionService'
import { getDepartmentsByFestival } from '../../services/departmentService'
import { logActivity } from '../../services/activityService'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import SearchFilter from '../../components/ui/SearchFilter'
import ReceiptModal from '../../components/receipt/ReceiptModal'
import AddContributionModal from '../../components/contributions/AddContributionModal'
import GroupReceiptModal from '../../components/contributions/GroupReceiptModal'
import { formatCurrency, formatDate, formatDateTime, exportContributionsToCSV } from '../../utils/formatters'
import type { Contribution, Department, PaymentMethod, PaymentStatus } from '../../types'
import { format, isToday, isYesterday, subDays, isAfter, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Online', 'UPI', 'Cheque']
const PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Partial']

const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'info'> = {
  Paid: 'success',
  Pending: 'warning',
  Partial: 'info',
}

type DateFilterRange = 'all' | 'today' | 'yesterday' | 'week' | 'custom'
type SortOrder = 'newest' | 'oldest' | 'amount_high' | 'amount_low'

export default function ContributionsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [filterDept, setFilterDept] = useState('')

  // 📅 Date Filtering & Sorting State
  const [dateFilter, setDateFilter] = useState<DateFilterRange>('all')
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  // Add & Group Modal State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingModalOpen, setEditingModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contribution | null>(null)
  const [deleting, setDeleting] = useState<Contribution | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [delLoading, setDelLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Single Receipt Modal
  const [singleReceiptOpen, setSingleReceiptOpen] = useState(false)
  const [singleReceiptContrib, setSingleReceiptContrib] = useState<Contribution | null>(null)

  // Group Receipt Modal
  const [groupReceiptOpen, setGroupReceiptOpen] = useState(false)
  const [groupReceiptList, setGroupReceiptList] = useState<Contribution[]>([])
  const [groupRoomNumber, setGroupRoomNumber] = useState('')
  const [groupTotalAmount, setGroupTotalAmount] = useState(0)

  // Edit Form State
  const [editForm, setEditForm] = useState({
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

  useEffect(() => {
    if (!festival) return
    getDepartmentsByFestival(festival.id).then(setDepartments).catch(() => {})
    const unsub = subscribeToContributions(festival.id, setContributions)
    return unsub
  }, [festival])

  const [filterCollector, setFilterCollector] = useState<'all' | 'mine'>('all')
  const [filterCollectorName, setFilterCollectorName] = useState('')

  const myContributions = contributions.filter(
    c => c.collectedByUid === user?.uid || (user?.name && (c.collectedBy || '').toLowerCase() === user.name.toLowerCase())
  )
  const myTotalPaid = myContributions
    .filter(c => c.paymentStatus === 'Paid')
    .reduce((s, c) => s + c.amount, 0)

  const totalCollectedAll = contributions
    .filter(c => c.paymentStatus === 'Paid')
    .reduce((s, c) => s + c.amount, 0)

  // 🌟 Calculate Today's Real-Time Metrics
  const todayContributions = contributions.filter(
    c => c.createdAt && isToday(c.createdAt) && c.paymentStatus === 'Paid'
  )
  const todayTotal = todayContributions.reduce((s, c) => s + c.amount, 0)
  const todayUPI = todayContributions.filter(c => c.paymentMethod === 'UPI').reduce((s, c) => s + c.amount, 0)
  const todayCash = todayContributions.filter(c => c.paymentMethod === 'Cash').reduce((s, c) => s + c.amount, 0)
  const todayOnline = todayContributions.filter(c => c.paymentMethod === 'Online').reduce((s, c) => s + c.amount, 0)
  const todayCheque = todayContributions.filter(c => c.paymentMethod === 'Cheque').reduce((s, c) => s + c.amount, 0)

  // Unique Collectors List
  const uniqueCollectors = Array.from(
    new Set(contributions.map(c => c.collectedBy).filter(Boolean))
  ).sort()

  // Base list depending on scope and collector filter
  let baseList = filterCollector === 'mine' ? myContributions : contributions
  if (filterCollectorName) {
    baseList = baseList.filter(c => (c.collectedBy || '').toLowerCase() === filterCollectorName.toLowerCase())
  }

  // Filter by Date Range
  if (dateFilter === 'today') {
    baseList = baseList.filter(c => c.createdAt && isToday(c.createdAt))
  } else if (dateFilter === 'yesterday') {
    baseList = baseList.filter(c => c.createdAt && isYesterday(c.createdAt))
  } else if (dateFilter === 'week') {
    const sevenDaysAgo = subDays(startOfDay(new Date()), 7)
    baseList = baseList.filter(c => c.createdAt && isAfter(c.createdAt, sevenDaysAgo))
  } else if (dateFilter === 'custom' && customDate) {
    baseList = baseList.filter(c => c.createdAt && format(c.createdAt, 'yyyy-MM-dd') === customDate)
  }

  // Payment Method Breakdown for current view
  const methodStats = {
    UPI: baseList.filter(c => c.paymentMethod === 'UPI' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Cash: baseList.filter(c => c.paymentMethod === 'Cash' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Online: baseList.filter(c => c.paymentMethod === 'Online' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Cheque: baseList.filter(c => c.paymentMethod === 'Cheque' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
  }

  // Filter by Search, Status, Method, Dept
  const filtered = baseList.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.contributorName.toLowerCase().includes(q) ||
      c.mobile.includes(q) || c.receiptNumber.toLowerCase().includes(q)
    const matchStatus = !filterStatus || c.paymentStatus === filterStatus
    const matchMethod = !filterMethod || c.paymentMethod === filterMethod
    const matchDept = !filterDept || c.departmentId === filterDept
    return matchSearch && matchStatus && matchMethod && matchDept
  })

  // 🔄 Sort Data by Date / Time / Amount
  filtered.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (sortOrder === 'newest') return timeB - timeA
    if (sortOrder === 'oldest') return timeA - timeB
    if (sortOrder === 'amount_high') return b.amount - a.amount
    if (sortOrder === 'amount_low') return a.amount - b.amount
    return 0
  })

  const openAdd = () => {
    setAddModalOpen(true)
  }

  const openEdit = (c: Contribution) => {
    setEditForm({
      contributorName: c.contributorName,
      mobile: c.mobile,
      houseNumber: c.houseNumber || '',
      amount: String(c.amount),
      paymentMethod: c.paymentMethod,
      paymentStatus: c.paymentStatus,
      departmentId: c.departmentId,
      departmentName: c.departmentName,
      notes: c.notes || '',
    })
    setEditing(c)
    setEditingModalOpen(true)
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.contributorName || !editForm.mobile || !editForm.amount || !festival || !user || !editing) {
      toast.error('Fill all required fields')
      return
    }
    setSaving(true)
    try {
      await updateContribution(editing.id, {
        contributorName: editForm.contributorName,
        mobile: editForm.mobile,
        houseNumber: editForm.houseNumber,
        amount: parseFloat(editForm.amount),
        paymentMethod: editForm.paymentMethod,
        paymentStatus: editForm.paymentStatus,
        departmentId: editForm.departmentId,
        departmentName: editForm.departmentName,
        notes: editForm.notes,
      })
      toast.success('Contribution updated')
      await logActivity({
        festivalId: festival.id,
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: 'CONTRIBUTION_UPDATED',
        entityType: 'contribution',
        entityId: editing.id,
        description: `Updated contribution for ${editForm.contributorName}`
      })
      setEditingModalOpen(false)
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSuccess = (
    createdList: Contribution[],
    isGroup: boolean,
    roomNo?: string,
    totalAmt?: number
  ) => {
    if (isGroup) {
      setGroupReceiptList(createdList)
      setGroupRoomNumber(roomNo || '')
      setGroupTotalAmount(totalAmt || 0)
      setGroupReceiptOpen(true)
    } else {
      setSingleReceiptContrib(createdList[0])
      setSingleReceiptOpen(true)
    }
  }

  const handleDelete = async () => {
    if (!deleting || !festival || !user) return
    setDelLoading(true)
    try {
      await deleteContribution(deleting.id)
      toast.success('Deleted')
      await logActivity({ festivalId: festival.id, userId: user.uid, userName: user.name, role: 'admin',
        action: 'CONTRIBUTION_DELETED', entityType: 'contribution',
        description: `Deleted contribution for ${deleting.contributorName}` })
      setConfirmDel(false)
      setDeleting(null)
    } catch { toast.error('Delete failed') } finally { setDelLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Contributions</h1>
          <p className="text-gray-500 text-sm">
            {contributions.length} total • {filtered.length} shown
            {filterCollector === 'mine' && <span className="font-bold text-saffron-700"> (Showing My Collections)</span>}
            {dateFilter === 'today' && <span className="font-bold text-green-700"> • 📅 Filtered for Today</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            icon={<Download size={15} />}
            onClick={() => {
              try {
                exportContributionsToCSV(filtered.length > 0 ? filtered : contributions, festival?.committeeName)
                toast.success('Contributors exported to CSV successfully!')
              } catch (err: any) {
                toast.error(err.message || 'Export failed')
              }
            }}
          >
            Export Contributors
          </Button>
          <Button icon={<Plus size={15} />} onClick={openAdd}>Add Contribution</Button>
        </div>
      </div>

      {/* 🌟 TODAY'S REAL-TIME SUMMARY WIDGET */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Calendar size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                Today's Collection ({format(new Date(), 'dd MMMM yyyy')})
                <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">Live</span>
              </h3>
              <p className="text-xs text-amber-800">
                {todayContributions.length} collections recorded today
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-amber-900 uppercase">Today's Total</p>
            <p className="text-2xl font-black text-green-700">{formatCurrency(todayTotal)}</p>
          </div>
        </div>

        {/* Today's Breakdown by Payment Method */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-white/90 p-2.5 rounded-xl border border-purple-200 text-purple-900">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>📱 Today's UPI</span>
              <span className="text-[10px] opacity-75">{todayContributions.filter(c => c.paymentMethod === 'UPI').length} txns</span>
            </div>
            <p className="text-lg font-black mt-0.5">{formatCurrency(todayUPI)}</p>
          </div>

          <div className="bg-white/90 p-2.5 rounded-xl border border-green-200 text-green-900">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>💵 Today's Cash</span>
              <span className="text-[10px] opacity-75">{todayContributions.filter(c => c.paymentMethod === 'Cash').length} txns</span>
            </div>
            <p className="text-lg font-black mt-0.5">{formatCurrency(todayCash)}</p>
          </div>

          <div className="bg-white/90 p-2.5 rounded-xl border border-blue-200 text-blue-900">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>🌐 Today's Online</span>
              <span className="text-[10px] opacity-75">{todayContributions.filter(c => c.paymentMethod === 'Online').length} txns</span>
            </div>
            <p className="text-lg font-black mt-0.5">{formatCurrency(todayOnline)}</p>
          </div>

          <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 text-amber-900">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>🏦 Today's Cheque</span>
              <span className="text-[10px] opacity-75">{todayContributions.filter(c => c.paymentMethod === 'Cheque').length} txns</span>
            </div>
            <p className="text-lg font-black mt-0.5">{formatCurrency(todayCheque)}</p>
          </div>
        </div>
      </div>

      {/* 📅 Date Filter Pills & Sort Dropdown */}
      <div className="bg-white p-3 rounded-2xl shadow-card border border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Clock size={13} /> Filter Date:
          </span>
          {[
            { key: 'all', label: 'All Time' },
            { key: 'today', label: "⚡ Today's Collections" },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'week', label: 'Last 7 Days' },
          ].map(pill => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setDateFilter(pill.key as DateFilterRange)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all border ${
                dateFilter === pill.key
                  ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white border-saffron-600 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {pill.label}
            </button>
          ))}

          {/* Custom Date Picker */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={customDate}
              onChange={e => {
                setCustomDate(e.target.value)
                setDateFilter('custom')
              }}
              className="text-xs py-1 px-2 border border-gray-200 rounded-xl bg-gray-50 font-bold text-gray-700"
            />
          </div>
        </div>

        {/* 🔄 Sort by Date / Amount */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpDown size={13} /> Sort By:
          </span>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
            className="text-xs py-1.5 px-3 border border-gray-300 rounded-xl font-bold bg-white text-gray-800 shadow-xs"
          >
            <option value="newest">📅 Newest Date First (Default)</option>
            <option value="oldest">📅 Oldest Date First</option>
            <option value="amount_high">💰 Highest Amount First</option>
            <option value="amount_low">💰 Lowest Amount First</option>
          </select>
        </div>
      </div>

      {/* Scope Selector: All Committee vs My Personal Collection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-2 rounded-2xl shadow-card border border-gray-100">
        <button
          type="button"
          onClick={() => setFilterCollector('all')}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
            filterCollector === 'all'
              ? 'bg-saffron-50/80 border-saffron-300 ring-2 ring-saffron-400/30'
              : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">All Committee Collections</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">{formatCurrency(totalCollectedAll)}</p>
          </div>
          <span className="text-xs font-bold bg-white text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 shadow-xs">
            {contributions.length} Total
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterCollector('mine')}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
            filterCollector === 'mine'
              ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 ring-2 ring-amber-400/40'
              : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              👤 My Personal Collection ({user?.name || 'Admin'})
            </p>
            <p className="text-xl font-black text-amber-950 mt-0.5">{formatCurrency(myTotalPaid)}</p>
          </div>
          <span className="text-xs font-bold bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300 shadow-xs">
            {myContributions.length} Records
          </span>
        </button>
      </div>

      {/* Payment Method Breakdown Badges with 1-Click Filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Calculated for Current View ({dateFilter === 'today' ? 'Today Only' : dateFilter}):
          </p>
          {filterMethod && (
            <button
              onClick={() => setFilterMethod('')}
              className="text-xs text-saffron-700 font-bold hover:underline"
            >
              Reset Method Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { method: 'UPI', label: '📱 UPI', amount: methodStats.UPI, color: 'border-purple-200 bg-purple-50/70 text-purple-900' },
            { method: 'Cash', label: '💵 Cash', amount: methodStats.Cash, color: 'border-green-200 bg-green-50/70 text-green-900' },
            { method: 'Online', label: '🌐 Online', amount: methodStats.Online, color: 'border-blue-200 bg-blue-50/70 text-blue-900' },
            { method: 'Cheque', label: '🏦 Cheque', amount: methodStats.Cheque, color: 'border-amber-200 bg-amber-50/70 text-amber-900' },
          ].map(m => {
            const isSelected = filterMethod === m.method
            return (
              <button
                key={m.method}
                type="button"
                onClick={() => setFilterMethod(isSelected ? '' : m.method)}
                className={`p-3 rounded-2xl border text-left transition-all ${m.color} ${
                  isSelected ? 'ring-2 ring-saffron-500 scale-[1.02] shadow-md' : 'hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{m.label}</span>
                  {isSelected && <span className="text-[10px] bg-saffron-600 text-white px-1.5 py-0.5 rounded-full font-black">Filtered</span>}
                </div>
                <p className="text-base sm:text-lg font-black mt-1">{formatCurrency(m.amount)}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Paid','Pending','Partial'].map(s => (
          <div key={s} className="bg-white rounded-xl shadow-card p-4 text-center">
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(baseList.filter(c => c.paymentStatus === s).reduce((sum,c)=>sum+c.amount,0))}
            </p>
            <p className="text-sm text-gray-500">{s}</p>
          </div>
        ))}
        <div className="bg-saffron-50 rounded-xl shadow-card p-4 text-center">
          <p className="text-xl font-bold text-saffron-700">
            {formatCurrency(baseList.filter(c=>c.paymentStatus==='Paid').reduce((s,c)=>s+c.amount,0))}
          </p>
          <p className="text-sm text-saffron-600">{dateFilter === 'today' ? "Today's Total" : filterCollector === 'mine' ? 'My Collected' : 'Total Filtered'}</p>
        </div>
      </div>

      {/* Active Collector Banner if selected */}
      {filterCollectorName && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-900">
          <div className="flex items-center gap-2">
            <span className="text-base">👤</span>
            <span className="text-xs sm:text-sm font-bold">
              Showing all transactions collected by: <strong className="text-saffron-800">{filterCollectorName}</strong> ({filtered.length} donations • {formatCurrency(baseList.filter(c => c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0))} collected)
            </span>
          </div>
          <button
            onClick={() => setFilterCollectorName('')}
            className="text-xs font-bold bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2.5 py-1 rounded-lg transition-colors"
          >
            Clear Collector Filter
          </button>
        </div>
      )}

      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search by name, mobile, receipt, room..."
        filters={[
          { key: 'collector', label: 'All Collectors', value: filterCollectorName, onChange: setFilterCollectorName,
            options: uniqueCollectors.map(name => {
              const count = contributions.filter(c => (c.collectedBy || '').toLowerCase() === (name || '').toLowerCase()).length
              return { label: `👤 ${name} (${count})`, value: name }
            }) },
          { key: 'status', label: 'All Status', value: filterStatus, onChange: setFilterStatus,
            options: PAYMENT_STATUSES.map(s => ({ label: s, value: s })) },
          { key: 'method', label: 'All Methods', value: filterMethod, onChange: setFilterMethod,
            options: PAYMENT_METHODS.map(m => ({ label: m, value: m })) },
          { key: 'dept', label: 'All Depts', value: filterDept, onChange: setFilterDept,
            options: departments.map(d => ({ label: d.name, value: d.id })) },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={<IndianRupee size={32} />} title="No contributions found"
          message={dateFilter === 'today' ? "No contributions recorded yet today." : "Try adjusting your filters or add a new contribution."}
          action={{ label: 'Add Contribution', onClick: openAdd }} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Receipt','Name','Room / Flat','Mobile','Amount','Method','Status','Department','Collector','Date & Time (Sorted)','Actions']
                  .map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-saffron-700 font-bold">{c.receiptNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.contributorName}</td>
                  <td className="px-4 py-3 text-gray-700 font-semibold">{c.houseNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.mobile}</td>
                  <td className="px-4 py-3 font-black text-green-700 text-base">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-3 text-gray-700 font-bold">
                    <span className={`px-2 py-0.5 rounded-lg text-xs ${
                      c.paymentMethod === 'UPI' ? 'bg-purple-100 text-purple-900' :
                      c.paymentMethod === 'Cash' ? 'bg-green-100 text-green-900' :
                      c.paymentMethod === 'Online' ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {c.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[c.paymentStatus]} dot>{c.paymentStatus}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{c.departmentName}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setFilterCollectorName(c.collectedBy)}
                      title={`Filter by ${c.collectedBy}`}
                      className="text-xs text-saffron-700 hover:text-saffron-900 hover:underline font-bold text-left"
                    >
                      {c.collectedBy}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-medium text-xs whitespace-nowrap">
                    {formatDateTime(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setSingleReceiptContrib(c); setSingleReceiptOpen(true) }}
                        className="p-1.5 rounded-lg text-saffron-600 hover:bg-saffron-50" title="Receipt">
                        <Receipt size={14} />
                      </button>
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => { setDeleting(c); setConfirmDel(true) }}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Add / Group Contribution Modal */}
      <AddContributionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        festival={festival}
        user={user}
        departments={departments}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Single Contribution Modal */}
      <Modal
        open={editingModalOpen}
        onClose={() => setEditingModalOpen(false)}
        title="Edit Contribution"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} loading={saving}>Update</Button>
          </>
        }
      >
        <form onSubmit={handleEditSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contributor Name" value={editForm.contributorName} onChange={e => setEditForm(f=>({...f,contributorName:e.target.value}))} required />
            <Input label="Mobile" type="tel" value={editForm.mobile} onChange={e => setEditForm(f=>({...f,mobile:e.target.value}))} required />
            <Input label="House Number" value={editForm.houseNumber} onChange={e => setEditForm(f=>({...f,houseNumber:e.target.value}))} />
            <Input label="Amount (₹)" type="number" value={editForm.amount} onChange={e => setEditForm(f=>({...f,amount:e.target.value}))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Payment Method</label>
              <select value={editForm.paymentMethod} onChange={e => setEditForm(f=>({...f,paymentMethod:e.target.value as PaymentMethod}))}
                className="input-field">
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Payment Status</label>
              <select value={editForm.paymentStatus} onChange={e => setEditForm(f=>({...f,paymentStatus:e.target.value as PaymentStatus}))}
                className="input-field">
                {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Department</label>
            <select
              value={editForm.departmentId}
              onChange={e => {
                const dept = departments.find(d => d.id === e.target.value)
                setEditForm(f => ({ ...f, departmentId: e.target.value, departmentName: dept?.name || '' }))
              }}
              className="input-field"
            >
              <option value="">-- Select Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Notes</label>
            <textarea value={editForm.notes} onChange={e => setEditForm(f=>({...f,notes:e.target.value}))}
              className="input-field resize-none text-xs" rows={2} />
          </div>
        </form>
      </Modal>

      {/* Single Receipt Modal */}
      <ReceiptModal
        open={singleReceiptOpen}
        onClose={() => setSingleReceiptOpen(false)}
        contribution={singleReceiptContrib}
        festival={festival}
      />

      {/* Group / Room Receipt Modal */}
      <GroupReceiptModal
        open={groupReceiptOpen}
        onClose={() => setGroupReceiptOpen(false)}
        contributions={groupReceiptList}
        festival={festival}
        roomNumber={groupRoomNumber}
        totalAmount={groupTotalAmount}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmDel}
        onClose={() => { setConfirmDel(false); setDeleting(null) }}
        onConfirm={handleDelete}
        title="Delete Contribution"
        message={`Delete contribution from ${deleting?.contributorName}? Receipt ${deleting?.receiptNumber} will be removed permanently.`}
        confirmText="Delete"
        loading={delLoading}
      />
    </div>
  )
}
