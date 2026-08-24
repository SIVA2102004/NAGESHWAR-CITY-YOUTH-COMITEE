import React, { useEffect, useState } from 'react'
import { IndianRupee, Users, Clock, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { subscribeToVolunteerContributions } from '../../services/contributionService'
import { getUsersByVolunteer } from '../../services/userService'
import { subscribeToPublishedAnnouncements } from '../../services/announcementService'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import AnnouncementCard from '../../components/shared/AnnouncementCard'
import { formatCurrency } from '../../utils/formatters'
import type { Contribution, AppUser, Announcement } from '../../types'

export default function VolunteerDashboard() {
  const { user } = useAuth()
  const { festival } = useFestival()
  const navigate = useNavigate()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    if (!festival || !user) return
    const unsub1 = subscribeToVolunteerContributions(festival.id, user.uid, setContributions)
    const unsub2 = subscribeToPublishedAnnouncements(festival.id, setAnnouncements)
    getUsersByVolunteer(user.uid).then(setMembers).catch(() => {})
    return () => { unsub1(); unsub2() }
  }, [festival, user])

  const myTotal = contributions.filter(c => c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0)
  const pendingCount = contributions.filter(c => c.paymentStatus === 'Pending').length

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
        <Button icon={<Plus size={16} />} onClick={() => navigate('/volunteer/contributions')}>
          Record Collection
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="My Collection" value={formatCurrency(myTotal)} icon={<IndianRupee size={20} />} color="orange" />
        <StatCard title="My Contributors" value={contributions.length} icon={<Users size={20} />} color="blue" />
        <StatCard title="Assigned Volunteers" value={members.length} icon={<Users size={20} />} color="purple" />
        <StatCard title="Pending Chanda" value={pendingCount} icon={<Clock size={20} />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Recent Collections</h3>
            <Button size="sm" variant="outline" onClick={() => navigate('/volunteer/contributions')}>View All</Button>
          </div>
          {contributions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No contributions recorded yet</p>
          ) : (
            <div className="space-y-3">
              {contributions.slice(0, 5).map(c => (
                <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.contributorName}</p>
                    <p className="text-xs text-gray-400">{c.receiptNumber} � {c.paymentMethod}</p>
                  </div>
                  <span className="font-bold text-green-700">{formatCurrency(c.amount)}</span>
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
    </div>
  )
}
