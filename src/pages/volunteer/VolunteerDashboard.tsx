import React, { useEffect, useState } from 'react'
import { IndianRupee, Users, Clock, Plus, Calendar, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { subscribeToVolunteerContributions } from '../../services/contributionService'
import { getUsersByVolunteer } from '../../services/userService'
import { getDepartmentsByFestival } from '../../services/departmentService'
import { subscribeToPublishedAnnouncements } from '../../services/announcementService'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import AnnouncementCard from '../../components/shared/AnnouncementCard'
import ReceiptModal from '../../components/receipt/ReceiptModal'
import AddContributionModal from '../../components/contributions/AddContributionModal'
import GroupReceiptModal from '../../components/contributions/GroupReceiptModal'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters'
import type { Contribution, AppUser, Announcement, Department } from '../../types'
import { format, isToday } from 'date-fns'

export default function VolunteerDashboard() {
  const { user } = useAuth()
  const { festival } = useFestival()
  const navigate = useNavigate()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
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
    const unsub1 = subscribeToVolunteerContributions(festival.id, user.uid, setContributions)
    const unsub2 = subscribeToPublishedAnnouncements(festival.id, setAnnouncements)
    getUsersByVolunteer(user.uid).then(setMembers).catch(() => {})
    return () => { unsub1(); unsub2() }
  }, [festival, user])

  const myTotal = contributions.filter(c => c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0)
  const pendingCount = contributions.filter(c => c.paymentStatus === 'Pending').length

  // 🌟 Calculate Today's Personal Collection
  const todayContributions = contributions.filter(
    c => c.createdAt && isToday(c.createdAt) && c.paymentStatus === 'Paid'
  )
  const todayTotal = todayContributions.reduce((s, c) => s + c.amount, 0)
  const todayUPI = todayContributions.filter(c => c.paymentMethod === 'UPI').reduce((s, c) => s + c.amount, 0)
  const todayCash = todayContributions.filter(c => c.paymentMethod === 'Cash').reduce((s, c) => s + c.amount, 0)
  const todayOnline = todayContributions.filter(c => c.paymentMethod === 'Online').reduce((s, c) => s + c.amount, 0)
  const todayCheque = todayContributions.filter(c => c.paymentMethod === 'Cheque').reduce((s, c) => s + c.amount, 0)

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
          <h1 className="text-2xl font-extrabold text-gray-900">
            🛕 Coordinator Portal
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {user?.name} • Department: <span className="font-semibold text-saffron-700">{user?.departmentName || 'Assigned'}</span>
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setAddModalOpen(true)}>
          Record Collection (Single / Room)
        </Button>
      </div>

      {/* 🌟 TODAY'S PERSONAL COLLECTION WIDGET */}
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
                {todayContributions.length} collections recorded by you today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-amber-900 uppercase">Today's Total</p>
              <p className="text-2xl font-black text-green-700">{formatCurrency(todayTotal)}</p>
            </div>
            <button
              onClick={() => navigate('/volunteer/contributions')}
              className="inline-flex items-center gap-1 bg-white hover:bg-amber-100 text-amber-950 font-bold text-xs px-3 py-2 rounded-xl border border-amber-300 shadow-xs transition-colors"
            >
              <span>View History</span>
              <ArrowRight size={13} />
            </button>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Collection" value={formatCurrency(myTotal)} icon={<IndianRupee size={20} />} color="orange" />
        <StatCard title="My Contributors" value={contributions.length} icon={<Users size={20} />} color="blue" />
        <StatCard title="Assigned Volunteers" value={members.length} icon={<Users size={20} />} color="purple" />
        <StatCard title="Pending Chanda" value={pendingCount} icon={<Clock size={20} />} color="red" />
      </div>

      {/* Payment Method Breakdown for Coordinator */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
            All-Time Collection Calculated by Payment Method
          </h3>
          <span className="text-xs font-bold text-gray-500">
            Total: {formatCurrency(myTotal)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'UPI', label: '📱 UPI', color: 'bg-purple-50 border-purple-200 text-purple-900', barColor: 'bg-purple-500' },
            { name: 'Cash', label: '💵 Cash', color: 'bg-green-50 border-green-200 text-green-900', barColor: 'bg-green-500' },
            { name: 'Online', label: '🌐 Online', color: 'bg-blue-50 border-blue-200 text-blue-900', barColor: 'bg-blue-500' },
            { name: 'Cheque', label: '🏦 Cheque', color: 'bg-amber-50 border-amber-200 text-amber-900', barColor: 'bg-amber-500' },
          ].map(m => {
            const val = contributions.filter(c => c.paymentMethod === m.name && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0)
            const count = contributions.filter(c => c.paymentMethod === m.name && c.paymentStatus === 'Paid').length
            const pct = myTotal > 0 ? (val / myTotal) * 100 : 0
            return (
              <div key={m.name} className={`p-3 rounded-xl border ${m.color} space-y-1`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{m.label}</span>
                  <span className="text-[11px] opacity-75">{count} txns</span>
                </div>
                <p className="text-base sm:text-lg font-black">{formatCurrency(val)}</p>
                <div className="w-full bg-black/10 rounded-full h-1 overflow-hidden">
                  <div className={`h-full ${m.barColor} rounded-full`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Recent Collections (Sorted by Date)</h3>
            <Button size="sm" variant="outline" onClick={() => navigate('/volunteer/contributions')}>View All</Button>
          </div>
          {contributions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No contributions recorded yet</p>
          ) : (
            <div className="space-y-3">
              {contributions.slice(0, 6).map(c => (
                <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.contributorName} {c.houseNumber ? `(Room ${c.houseNumber})` : ''}</p>
                    <p className="text-xs text-gray-400">{c.receiptNumber} • {c.paymentMethod} • {formatDateTime(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-700">{formatCurrency(c.amount)}</span>
                    <button
                      onClick={() => { setSelectedReceipt(c); setReceiptOpen(true) }}
                      className="p-1 text-saffron-600 hover:bg-saffron-50 rounded font-semibold text-xs"
                      title="View Receipt"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Announcements</h3>
          <div className="space-y-3">
            {announcements.slice(0, 3).map(a => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
            {announcements.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No announcements right now</p>
            )}
          </div>
        </Card>
      </div>

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
