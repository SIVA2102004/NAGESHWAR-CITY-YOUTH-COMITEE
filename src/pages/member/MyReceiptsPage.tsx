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
import GroupReceiptModal from '../../components/contributions/GroupReceiptModal'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { Contribution, Department } from '../../types'

export default function MyReceiptsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)

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

  const filtered = contributions.filter(c => {
    const q = search.toLowerCase()
    return (
      !q ||
      c.contributorName.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      c.receiptNumber.toLowerCase().includes(q)
    )
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
          <p className="text-gray-500 text-sm">Contributions collected by you from members &amp; devotees</p>
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={() => setAddModalOpen(true)}
        >
          Record Collection (Single / Room)
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
            onClick: () => setAddModalOpen(true),
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
