import React, { useEffect, useState } from 'react'
import { Megaphone, IndianRupee, Plus, Receipt, HeartHandshake } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { getContributionsByFestival } from '../../services/contributionService'
import { getDepartmentsByFestival } from '../../services/departmentService'
import { subscribeToPublishedAnnouncements } from '../../services/announcementService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import AnnouncementCard from '../../components/shared/AnnouncementCard'
import ReceiptModal from '../../components/receipt/ReceiptModal'
import AddContributionModal from '../../components/contributions/AddContributionModal'
import GroupReceiptModal from '../../components/contributions/GroupReceiptModal'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { Contribution, Announcement, Department } from '../../types'

export default function MemberDashboard() {
  const { user } = useAuth()
  const { festival } = useFestival()
  const navigate = useNavigate()

  const [myContribs, setMyContribs] = useState<Contribution[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
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

  const loadContributions = async () => {
    if (!festival || !user) return
    try {
      const all = await getContributionsByFestival(festival.id)
      const mine = all.filter(c => 
        c.collectedByUid === user.uid ||
        c.createdBy === user.uid || 
        c.mobile === user.mobile
      )
      setMyContribs(mine)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadContributions()
    if (festival) {
      getDepartmentsByFestival(festival.id).then(setDepartments).catch(() => {})
      return subscribeToPublishedAnnouncements(festival.id, setAnnouncements)
    }
  }, [festival, user])

  const totalPaid = myContribs.filter(c => c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0)

  const handleAddSuccess = (
    createdList: Contribution[],
    isGroup: boolean,
    roomNo?: string,
    totalAmt?: number
  ) => {
    loadContributions()
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
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-saffron-500 via-saffron-600 to-gold-500 text-white rounded-2xl p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            🙏 Ganpati Bappa Morya 🙏
          </h1>
          <p className="text-saffron-100 mt-1 text-sm">
            Welcome, <span className="font-bold text-white">{user?.name}</span> • Department: {user?.departmentName || 'General Volunteer'}
          </p>
          <p className="text-xs text-saffron-200 mt-0.5">{festival?.committeeName} • {festival?.festivalYear}</p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          icon={<Plus size={16} />}
          className="bg-white !text-saffron-700 hover:!bg-saffron-50 font-bold shadow-md"
        >
          Record Collection
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="!bg-saffron-50 border border-saffron-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-saffron-800 uppercase tracking-wide">My Total Collection</p>
              <p className="text-3xl font-extrabold text-saffron-900 mt-1">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-saffron-700 mt-1">{myContribs.length} collection(s) recorded</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-saffron-200/80 flex items-center justify-center text-saffron-800">
              <IndianRupee size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Volunteer Info</p>
          <p className="font-bold text-gray-900 mt-1 text-base">{user?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">Mobile: {user?.mobile}</p>
          <div className="mt-2">
            <Badge variant="success" dot>Active Volunteer</Badge>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Action</p>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setAddModalOpen(true)}
            >
              Record Collection (Single / Room)
            </Button>
            <Button size="sm" variant="outline" icon={<Receipt size={14} />} onClick={() => navigate('/member/receipts')}>
              View All Collections ({myContribs.length})
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Contributions & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Receipt size={18} className="text-saffron-600" /> Recent Collections
            </h3>
            <Button size="sm" variant="ghost" onClick={() => navigate('/member/receipts')}>
              View All
            </Button>
          </div>

          {myContribs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-3">No collections recorded yet</p>
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setAddModalOpen(true)}
              >
                Record First Collection
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myContribs.slice(0, 5).map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-saffron-50/50 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.contributorName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.receiptNumber} • {formatDate(c.createdAt)} • {c.paymentMethod}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-green-700 text-base">{formatCurrency(c.amount)}</span>
                    <button
                      onClick={() => { setSelectedReceipt(c); setReceiptOpen(true) }}
                      className="p-1.5 rounded-lg text-saffron-600 hover:bg-saffron-100"
                      title="View Receipt"
                    >
                      <Receipt size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Megaphone size={18} className="text-saffron-600" /> Festival Announcements
          </h3>
          <div className="space-y-3">
            {announcements.slice(0, 4).map(a => (
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
