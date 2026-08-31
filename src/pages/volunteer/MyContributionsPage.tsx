import React, { useEffect, useState } from 'react'
import { Plus, Receipt, IndianRupee } from 'lucide-react'
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
import SmartAutoPayModal from '../../components/contributions/SmartAutoPayModal'
import GroupReceiptModal from '../../components/contributions/GroupReceiptModal'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { Contribution, Department } from '../../types'

export default function MyContributionsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [smartPayOpen, setSmartPayOpen] = useState(false)

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

  const [filterMethod, setFilterMethod] = useState('')

  const myTotalPaid = contributions
    .filter(c => c.paymentStatus === 'Paid')
    .reduce((s, c) => s + c.amount, 0)

  const methodStats = {
    UPI: contributions.filter(c => c.paymentMethod === 'UPI' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Cash: contributions.filter(c => c.paymentMethod === 'Cash' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Online: contributions.filter(c => c.paymentMethod === 'Online' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Cheque: contributions.filter(c => c.paymentMethod === 'Cheque' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
  }

  const filtered = contributions.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.contributorName.toLowerCase().includes(q) || c.mobile.includes(q) || c.receiptNumber.toLowerCase().includes(q)
    const matchMethod = !filterMethod || c.paymentMethod === filterMethod
    return matchSearch && matchMethod
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
            Total Collected by You: <strong className="text-saffron-700 font-black">{formatCurrency(myTotalPaid)}</strong> ({contributions.length} contributors)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSmartPayOpen(true)}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-saffron-600 via-gold-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 animate-pulse"
          >
            <span>⚡ Smart Auto-Pay (Auto-Bill)</span>
          </button>
          <Button icon={<Plus size={16} />} onClick={() => setAddModalOpen(true)}>
            Record Collection (Manual)
          </Button>
        </div>
      </div>

      {/* Payment Method Breakdown Tiles with 1-Click Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Calculated by Payment Method:
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
          message={filterMethod ? `No contributions found for ${filterMethod}.` : "Start recording chanda contributions from devotees or room groups."}
          action={{ label: 'Record Collection', onClick: () => setAddModalOpen(true) }}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Receipt','Name','Mobile','Amount','Method','Status','Date','Receipt'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-saffron-700 font-bold">{c.receiptNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.contributorName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.mobile}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.paymentMethod}</td>
                  <td className="px-4 py-3"><Badge variant={c.paymentStatus==='Paid'?'success':c.paymentStatus==='Pending'?'warning':'info'} dot>{c.paymentStatus}</Badge></td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
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

      {/* Smart Auto-Pay (Auto-Bill) Modal */}
      <SmartAutoPayModal
        open={smartPayOpen}
        onClose={() => setSmartPayOpen(false)}
        festival={festival}
        user={user}
        departments={departments}
        onSuccess={handleAddSuccess}
      />

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

      {/* Group Receipt Modal */}
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
