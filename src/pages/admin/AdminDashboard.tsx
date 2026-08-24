import React, { useEffect, useState } from 'react'
import {
  IndianRupee, Users, UserCheck, Building2,
  TrendingUp, Clock, CreditCard, Download, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { subscribeToContributions } from '../../services/contributionService'
import { subscribeToExpenses } from '../../services/expenseService'
import { subscribeToActivityLogs } from '../../services/activityService'
import { getUsersByRole } from '../../services/userService'
import { getDepartmentsByFestival } from '../../services/departmentService'
import { subscribeToPublishedAnnouncements } from '../../services/announcementService'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ActivityFeed from '../../components/shared/ActivityFeed'
import AnnouncementCard from '../../components/shared/AnnouncementCard'
import CollectionChart from '../../components/charts/CollectionChart'
import PaymentMethodChart from '../../components/charts/PaymentMethodChart'
import ExpenseCategoryChart from '../../components/charts/ExpenseCategoryChart'
import { formatCurrency, formatDate, exportContributionsToCSV } from '../../utils/formatters'
import type { Contribution, Expense, ActivityLog, Announcement, Department } from '../../types'
import { format } from 'date-fns'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [volunteerCount, setVolunteerCount] = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [deptCount, setDeptCount] = useState(0)

  useEffect(() => {
    if (!festival) return
    const fid = festival.id

    const unsub1 = subscribeToContributions(fid, setContributions)
    const unsub2 = subscribeToExpenses(fid, setExpenses)
    const unsub3 = subscribeToActivityLogs(fid, setActivityLogs)
    const unsub4 = subscribeToPublishedAnnouncements(fid, setAnnouncements)

    getUsersByRole(fid, 'volunteer').then(v => setVolunteerCount(v.length)).catch(() => {})
    getUsersByRole(fid, 'member').then(m => setMemberCount(m.length)).catch(() => {})
    getDepartmentsByFestival(fid).then(d => setDeptCount(d.length)).catch(() => {})

    return () => { unsub1(); unsub2(); unsub3(); unsub4() }
  }, [festival])

  const totalCollection = contributions.filter(c => c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const balance = totalCollection - totalExpenses
  const paidCount = contributions.filter(c => c.paymentStatus === 'Paid').length
  const pendingCount = contributions.filter(c => c.paymentStatus === 'Pending').length
  const partialCount = contributions.filter(c => c.paymentStatus === 'Partial').length
  const targetAmount = festival?.targetAmount || 0
  const progress = targetAmount > 0 ? Math.min((totalCollection / targetAmount) * 100, 100) : 0

  const paymentMethodData = ['Cash', 'Online', 'UPI', 'Cheque'].map(m => ({
    name: m,
    value: contributions.filter(c => c.paymentMethod === m && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
  }))

  const expenseCategoryData = [...new Set(expenses.map(e => e.category))].map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  }))

  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = format(d, 'dd MMM')
    const dateStr = format(d, 'yyyy-MM-dd')
    const amount = contributions
      .filter(c => c.paymentStatus === 'Paid' && format(c.createdAt, 'yyyy-MM-dd') === dateStr)
      .reduce((s, c) => s + c.amount, 0)
    return { name: label, amount }
  })

  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            🛕 {festival?.committeeName || 'Admin Dashboard'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.name} • {formatDate(new Date())}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            icon={<Download size={15} />}
            onClick={() => {
              try {
                exportContributionsToCSV(contributions, festival?.committeeName)
                toast.success('Contributors exported to CSV!')
              } catch (e: any) {
                toast.error(e.message || 'No contributions to export')
              }
            }}
          >
            Export Contributors
          </Button>
          <Button
            variant="secondary"
            icon={<FileText size={15} />}
            onClick={() => navigate('/admin/reports')}
          >
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Collection" value={formatCurrency(totalCollection)} icon={<IndianRupee size={20} />} color="orange" />
        <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={<CreditCard size={20} />} color="red" />
        <StatCard title="Balance" value={formatCurrency(balance)} icon={<TrendingUp size={20} />} color={balance >= 0 ? 'green' : 'red'} />
        <StatCard title="Coordinators" value={volunteerCount} icon={<UserCheck size={20} />} color="blue" />
        <StatCard title="Volunteers" value={memberCount} icon={<Users size={20} />} color="purple" />
        <StatCard title="Departments" value={deptCount} icon={<Building2 size={20} />} color="teal" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{paidCount}</p>
          <p className="text-sm text-green-600 font-medium">Paid</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          <p className="text-sm text-yellow-600 font-medium">Pending</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{partialCount}</p>
          <p className="text-sm text-blue-600 font-medium">Partial</p>
        </div>
      </div>

      {targetAmount > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900">Collection Target</h3>
            <span className="text-sm font-semibold text-saffron-700">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-saffron-500 to-gold-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatCurrency(totalCollection)} raised</span>
            <span>Goal: {formatCurrency(targetAmount)}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Daily Collection (Last 7 Days)</h3>
          <CollectionChart data={dailyData} />
        </Card>
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Payment Method Distribution</h3>
          <PaymentMethodChart data={paymentMethodData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Expense Categories</h3>
          <ExpenseCategoryChart data={expenseCategoryData} />
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-saffron-600" /> Recent Activity
          </h3>
          <ActivityFeed logs={activityLogs} limit={8} />
        </Card>
      </div>

      {announcements.length > 0 && (
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Announcements</h3>
          <div className="space-y-3">
            {announcements.slice(0, 3).map(a => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
