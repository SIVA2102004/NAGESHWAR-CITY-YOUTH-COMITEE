import React, { useEffect, useState } from 'react'
import { Plus, Receipt, IndianRupee, Calendar, Clock, ArrowUpDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { subscribeToVolunteerContributions } from '../../services/contributionService'
import { getDepartmentsByFestival } from '../../services/departmentService'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import SearchFilter from '../../components/ui/SearchFilter'
import ReceiptModal from '../../components/receipt/ReceiptModal'
import AddContributionModal from '../../components/contributions/AddContributionModal'
import GroupReceiptModal from '../../components/contributions/GroupReceiptModal'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters'
import type { Contribution, Department } from '../../types'
import { format, isToday, isYesterday, subDays, isAfter, startOfDay } from 'date-fns'

type DateFilterRange = 'all' | 'today' | 'yesterday' | 'week' | 'custom'
type SortOrder = 'newest' | 'oldest' | 'amount_high' | 'amount_low'

export default function MyContributionsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)

  // 📅 Date Filtering & Sorting State
  const [dateFilter, setDateFilter] = useState<DateFilterRange>('all')
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [filterMethod, setFilterMethod] = useState('')

  // Single Receipt Modal
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Contribution | null>(null)

  // Group Receipt Modal
  const [groupReceiptOpen, setGroupReceiptOpen] = useState(false)
  const [groupReceiptList, setGroupReceiptList] = useState<Contribution[]>([])
  const [groupRoomNumber, setGroupRoomNumber] = useState('')
  const [groupTotalAmount, setGroupTotalAmount] = useState(0)

  useEffect(() => {
    if (!festival || !user) return
    getDepartmentsByFestival(festival.id).then(setDepartments).catch(() => {})
    return subscribeToVolunteerContributions(festival.id, user.uid, setContributions)
  }, [festival, user])

  const myTotalPaid = contributions
    .filter(c => c.paymentStatus === 'Paid')
    .reduce((s, c) => s + c.amount, 0)

  // 🌟 Calculate Today's Personal Collection
  const todayContributions = contributions.filter(
    c => c.createdAt && isToday(c.createdAt) && c.paymentStatus === 'Paid'
  )
  const todayTotal = todayContributions.reduce((s, c) => s + c.amount, 0)
  const todayUPI = todayContributions.filter(c => c.paymentMethod === 'UPI').reduce((s, c) => s + c.amount, 0)
  const todayCash = todayContributions.filter(c => c.paymentMethod === 'Cash').reduce((s, c) => s + c.amount, 0)
  const todayOnline = todayContributions.filter(c => c.paymentMethod === 'Online').reduce((s, c) => s + c.amount, 0)
  const todayCheque = todayContributions.filter(c => c.paymentMethod === 'Cheque').reduce((s, c) => s + c.amount, 0)

  // Filter base list by Date Range
  let baseList = contributions
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

  const methodStats = {
    UPI: baseList.filter(c => c.paymentMethod === 'UPI' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Cash: baseList.filter(c => c.paymentMethod === 'Cash' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Online: baseList.filter(c => c.paymentMethod === 'Online' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Cheque: baseList.filter(c => c.paymentMethod === 'Cheque' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
  }

  const filtered = baseList.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.contributorName.toLowerCase().includes(q) || c.mobile.includes(q) || c.receiptNumber.toLowerCase().includes(q)
    const matchMethod = !filterMethod || c.paymentMethod === filterMethod
    return matchSearch && matchMethod
  })

  // Sort filtered records
  filtered.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (sortOrder === 'newest') return timeB - timeA
    if (sortOrder === 'oldest') return timeA - timeB
    if (sortOrder === 'amount_high') return b.amount - a.amount
    if (sortOrder === 'amount_low') return a.amount - b.amount
    return 0
  })

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
      setSelectedReceipt(createdList[0])
      setReceiptOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Collections</h1>
          <p className="text-gray-500 text-sm">
            Total Collected by You: <strong className="text-saffron-700 font-black">{formatCurrency(myTotalPaid)}</strong> ({contributions.length} total • {filtered.length} shown)
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setAddModalOpen(true)}>
          Record Collection (Single / Room)
        </Button>
      </div>

      {/* 🌟 TODAY'S LIVE PERSONAL COLLECTION SUMMARY */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-gradient-to-br from-saffron-500 to-amber-600 text-white rounded-xl shadow-xs">
              <Calendar size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                My Collection Today ({format(new Date(), 'dd MMM yyyy')})
                <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">Live</span>
              </h3>
              <p className="text-xs text-amber-800">
                {todayContributions.length} personal collections recorded today
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-amber-900 uppercase">Today's Total</p>
            <p className="text-2xl font-black text-green-700">{formatCurrency(todayTotal)}</p>
          </div>
        </div>

        {/* Today's Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-white/90 p-2.5 rounded-xl border border-purple-200 text-purple-900 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>📱 Today's UPI</span>
              <span className="text-[10px] opacity-75">{todayContributions.filter(c => c.paymentMethod === 'UPI').length} txns</span>
            </div>
            <p className="text-lg font-black mt-0.5">{formatCurrency(todayUPI)}</p>
          </div>

          <div className="bg-white/90 p-2.5 rounded-xl border border-green-200 text-green-900 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>💵 Today's Cash</span>
              <span className="text-[10px] opacity-75">{todayContributions.filter(c => c.paymentMethod === 'Cash').length} txns</span>
            </div>
            <p className="text-lg font-black mt-0.5">{formatCurrency(todayCash)}</p>
          </div>

          <div className="bg-white/90 p-2.5 rounded-xl border border-blue-200 text-blue-900 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>🌐 Today's Online</span>
              <span className="text-[10px] opacity-75">{todayContributions.filter(c => c.paymentMethod === 'Online').length} txns</span>
            </div>
            <p className="text-lg font-black mt-0.5">{formatCurrency(todayOnline)}</p>
          </div>

          <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 text-amber-900 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>🏦 Today's Cheque</span>
              <span className="text-[10px] opacity-75">{todayContributions.filter(c => c.paymentMethod === 'Cheque').length} txns</span>
            </div>
            <p className="text-lg font-black mt-0.5">{formatCurrency(todayCheque)}</p>
          </div>
        </div>
      </div>

      {/* 📅 Date Filter Pills & Sort Selector */}
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

          {/* Custom Date Input */}
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

        {/* 🔄 Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpDown size={13} /> Sort By:
          </span>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
            className="text-xs py-1.5 px-3 border border-gray-300 rounded-xl font-bold bg-white text-gray-800 shadow-xs"
          >
            <option value="newest">📅 Newest Date First</option>
            <option value="oldest">📅 Oldest Date First</option>
            <option value="amount_high">💰 Highest Amount First</option>
            <option value="amount_low">💰 Lowest Amount First</option>
          </select>
        </div>
      </div>

      {/* Payment Method Breakdown Tiles with 1-Click Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Calculated by Payment Method ({dateFilter === 'today' ? "Today Only" : dateFilter}):
          </p>
          {filterMethod && (
            <button
              onClick={() => setFilterMethod('')}
              className="text-xs text-saffron-700 font-bold hover:underline"
            >
              Reset Filter
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
                className={`p-3 rounded-xl border text-left transition-all ${m.color} ${
                  isSelected ? 'ring-2 ring-saffron-500 scale-[1.02] shadow-md' : 'hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{m.label}</span>
                  {isSelected && <span className="text-[10px] bg-saffron-600 text-white px-1.5 py-0.5 rounded-full font-black">Active</span>}
                </div>
                <p className="text-base sm:text-lg font-black mt-1">{formatCurrency(m.amount)}</p>
              </button>
            )
          })}
        </div>
      </div>

      <SearchFilter value={search} onChange={setSearch} placeholder="Search by name, mobile, receipt..." />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IndianRupee size={32} />}
          title="No collections found"
          message={dateFilter === 'today' ? "No contributions recorded yet today." : filterMethod ? `No contributions found for ${filterMethod}.` : "Start recording chanda contributions from devotees or room groups."}
          action={{ label: 'Record Collection', onClick: () => setAddModalOpen(true) }}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Receipt','Name','Room / Flat','Mobile','Amount','Method','Status','Date & Time (Sorted)','Receipt'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
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
                  <td className="px-4 py-3"><Badge variant={c.paymentStatus==='Paid'?'success':c.paymentStatus==='Pending'?'warning':'info'} dot>{c.paymentStatus}</Badge></td>
                  <td className="px-4 py-3 text-gray-600 font-medium text-xs whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedReceipt(c); setReceiptOpen(true) }}
                      className="p-1.5 rounded-lg text-saffron-600 hover:bg-saffron-50" title="View Receipt">
                      <Receipt size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Group Contribution Modal */}
      <AddContributionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        festival={festival}
        user={user}
        departments={departments}
        onSuccess={handleAddSuccess}
      />

      {/* Single Receipt Modal */}
      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        contribution={selectedReceipt}
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
    </div>
  )
}
