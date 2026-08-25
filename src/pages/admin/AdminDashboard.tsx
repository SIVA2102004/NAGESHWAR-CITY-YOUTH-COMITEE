import React, { useEffect, useState } from 'react'
import {
  IndianRupee, Users, UserCheck, Building2,
  TrendingUp, Clock, CreditCard, Download, FileText, Key, ShieldCheck, Plus, Copy, Check, Share2
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
import { createInviteCode, getInviteCodesByFestival } from '../../services/inviteCodeService'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import ActivityFeed from '../../components/shared/ActivityFeed'
import AnnouncementCard from '../../components/shared/AnnouncementCard'
import InviteCodeCard from '../../components/shared/InviteCodeCard'
import CollectionChart from '../../components/charts/CollectionChart'
import PaymentMethodChart from '../../components/charts/PaymentMethodChart'
import ExpenseCategoryChart from '../../components/charts/ExpenseCategoryChart'
import AddContributionModal from '../../components/contributions/AddContributionModal'
import GroupReceiptModal from '../../components/contributions/GroupReceiptModal'
import ReceiptModal from '../../components/receipt/ReceiptModal'
import { formatCurrency, formatDate, exportContributionsToCSV } from '../../utils/formatters'
import type { Contribution, Expense, ActivityLog, Announcement, Department, InviteCode, InviteCodeType } from '../../types'
import { format } from 'date-fns'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [volunteerCount, setVolunteerCount] = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [deptCount, setDeptCount] = useState(0)

  // Add Contribution Modal State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [singleReceiptOpen, setSingleReceiptOpen] = useState(false)
  const [singleReceiptContrib, setSingleReceiptContrib] = useState<Contribution | null>(null)
  const [groupReceiptOpen, setGroupReceiptOpen] = useState(false)
  const [groupReceiptList, setGroupReceiptList] = useState<Contribution[]>([])
  const [groupRoomNumber, setGroupRoomNumber] = useState('')
  const [groupTotalAmount, setGroupTotalAmount] = useState(0)

  // Invite Codes State
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [recentCodes, setRecentCodes] = useState<InviteCode[]>([])
  const [inviteRole, setInviteRole] = useState<InviteCodeType>('ADMIN_INVITE')
  const [inviteDeptId, setInviteDeptId] = useState('')
  const [inviteMaxUses, setInviteMaxUses] = useState('1')
  const [inviteExpDays, setInviteExpDays] = useState('30')
  const [genLoading, setGenLoading] = useState(false)

  useEffect(() => {
    if (!festival) return
    const fid = festival.id

    const unsub1 = subscribeToContributions(fid, setContributions)
    const unsub2 = subscribeToExpenses(fid, setExpenses)
    const unsub3 = subscribeToActivityLogs(fid, setActivityLogs)
    const unsub4 = subscribeToPublishedAnnouncements(fid, setAnnouncements)

    getUsersByRole(fid, 'volunteer').then(v => setVolunteerCount(v.length)).catch(() => {})
    getUsersByRole(fid, 'member').then(m => setMemberCount(m.length)).catch(() => {})
    getDepartmentsByFestival(fid).then(d => { setDepartments(d); setDeptCount(d.length) }).catch(() => {})
    getInviteCodesByFestival(fid).then(setRecentCodes).catch(() => {})

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
            icon={<Plus size={15} />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Contribution
          </Button>
          <Button
            variant="outline"
            icon={<Key size={15} />}
            onClick={() => setInviteModalOpen(true)}
          >
            Invite Team &amp; Admins
          </Button>
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

      {/* Invite Team & Admins Modal with Admin-Controlled Max Uses */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Team Members &amp; Co-Admins"
        maxWidth="max-w-xl"
        footer={
          <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-saffron-50 via-gold-50 to-orange-50 border border-saffron-200 rounded-2xl p-4">
            <h4 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
              <Key size={16} className="text-saffron-600" />
              Generate Official Invite Code
            </h4>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Create a 6-character secure invite code with <strong>custom Max Uses decided by you</strong>. Send the code to your team to let them join with their own password.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Select Role *</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as InviteCodeType)}
                    className="input-field text-sm font-semibold"
                  >
                    <option value="ADMIN_INVITE">Administrator (Co-Admin)</option>
                    <option value="VOLUNTEER_INVITE">Coordinator (Dept Lead)</option>
                    <option value="MEMBER_INVITE">Volunteer (Ground Worker)</option>
                  </select>
                </div>

                {inviteRole !== 'ADMIN_INVITE' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Department</label>
                    <select
                      value={inviteDeptId}
                      onChange={e => setInviteDeptId(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">-- General / No Dept --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Max Uses Configured by Admin */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Max Allowed Registrations (Max Uses decided by Admin)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="number"
                    min="0"
                    value={inviteMaxUses}
                    onChange={e => setInviteMaxUses(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-28 text-center font-bold"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { label: '1 (Single-Use)', val: '1' },
                      { label: '5 People', val: '5' },
                      { label: '10 People', val: '10' },
                      { label: '25 People', val: '25' },
                      { label: '∞ Unlimited', val: '0' },
                    ].map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setInviteMaxUses(p.val)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                          inviteMaxUses === p.val
                            ? 'bg-saffron-600 text-white border-saffron-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {inviteMaxUses === '1'
                    ? '🔒 Recommended for Admins: The code burns and disables automatically after 1 use.'
                    : inviteMaxUses === '0'
                    ? '♾️ Unlimited uses until you manually disable the code.'
                    : `Allows exactly ${inviteMaxUses} people to register.`}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-medium">Expires in:</span>
                  <select
                    value={inviteExpDays}
                    onChange={e => setInviteExpDays(e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="0">Never</option>
                  </select>
                </div>

                <Button
                  icon={<Key size={14} />}
                  onClick={async () => {
                    if (!user || !festival) return
                    setGenLoading(true)
                    try {
                      const selectedDept = departments.find(d => d.id === inviteDeptId)
                      const ic = await createInviteCode({
                        type: inviteRole,
                        festivalId: festival.id,
                        departmentId: selectedDept?.id,
                        departmentName: selectedDept?.name,
                        createdBy: user.uid,
                        createdByName: user.name,
                        maxUses: parseInt(inviteMaxUses) || 0,
                        expiresInDays: parseInt(inviteExpDays) || undefined,
                      })
                      setRecentCodes(prev => [ic, ...prev])
                      toast.success(`Invite Code ${ic.code} generated!`)
                    } catch {
                      toast.error('Failed to generate invite code')
                    } finally {
                      setGenLoading(false)
                    }
                  }}
                  loading={genLoading}
                >
                  Generate Invite Code
                </Button>
              </div>
            </div>
          </div>

          {/* List of Generated Codes with Inline Max Uses Editor */}
          <div>
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">
              Active Committee Invite Codes (Edit limit anytime)
            </h4>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {recentCodes.map(c => (
                <InviteCodeCard
                  key={c.id}
                  code={c}
                  onUpdated={updated => {
                    setRecentCodes(prev => prev.map(item => item.id === updated.id ? { ...updated } : item))
                  }}
                  onDisable={async (id) => {
                    setRecentCodes(prev => prev.map(item => item.id === id ? { ...item, status: 'disabled' } : item))
                    toast.success('Invite code disabled')
                  }}
                />
              ))}
              {recentCodes.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Click "Generate Invite Code" to create your first code.
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Main Add / Group Contribution Modal */}
      <AddContributionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        festival={festival}
        user={user}
        departments={departments}
        onSuccess={(createdList, isGroup, roomNo, totalAmt) => {
          if (isGroup) {
            setGroupReceiptList(createdList)
            setGroupRoomNumber(roomNo || '')
            setGroupTotalAmount(totalAmt || 0)
            setGroupReceiptOpen(true)
          } else {
            setSingleReceiptContrib(createdList[0])
            setSingleReceiptOpen(true)
          }
        }}
      />

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
    </div>
  )
}
