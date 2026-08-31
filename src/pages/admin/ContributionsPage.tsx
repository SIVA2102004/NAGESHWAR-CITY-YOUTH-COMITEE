import React, { useEffect, useState } from 'react'
import {
  Plus, Edit2, Trash2, Receipt, IndianRupee, Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import {
  subscribeToContributions,
  updateContribution, deleteContribution
} from '../../services/contributionService'
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
import SmartAutoPayModal from '../../components/contributions/SmartAutoPayModal'
import GroupReceiptModal from '../../components/contributions/GroupReceiptModal'
import { formatCurrency, formatDate, exportContributionsToCSV } from '../../utils/formatters'
import type { Contribution, Department, PaymentMethod, PaymentStatus } from '../../types'

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Online', 'UPI', 'Cheque']
const PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Partial']

const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'info'> = {
  Paid: 'success',
  Pending: 'warning',
  Partial: 'info',
}

export default function ContributionsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [filterDept, setFilterDept] = useState('')

  // Add & Group Modal State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [smartPayOpen, setSmartPayOpen] = useState(false)
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

  // Unique Collectors List
  const uniqueCollectors = Array.from(
    new Set(contributions.map(c => c.collectedBy).filter(Boolean))
  ).sort()

  // Base list depending on scope and collector filter
  let baseList = filterCollector === 'mine' ? myContributions : contributions
  if (filterCollectorName) {
    baseList = baseList.filter(c => (c.collectedBy || '').toLowerCase() === filterCollectorName.toLowerCase())
  }

  // Payment Method Breakdown for current view
  const methodStats = {
    UPI: baseList.filter(c => c.paymentMethod === 'UPI' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Cash: baseList.filter(c => c.paymentMethod === 'Cash' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Online: baseList.filter(c => c.paymentMethod === 'Online' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
    Cheque: baseList.filter(c => c.paymentMethod === 'Cheque' && c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0),
  }

  const filtered = baseList.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.contributorName.toLowerCase().includes(q) ||
      c.mobile.includes(q) || c.receiptNumber.toLowerCase().includes(q)
    const matchStatus = !filterStatus || c.paymentStatus === filterStatus
    const matchMethod = !filterMethod || c.paymentMethod === filterMethod
    const matchDept = !filterDept || c.departmentId === filterDept
    return matchSearch && matchStatus && matchMethod && matchDept
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
            Calculated by Payment Method {filterCollector === 'mine' ? '(My Collections)' : '(All Collections)'}:
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
          <p className="text-sm text-saffron-600">{filterCollector === 'mine' ? 'My Collected' : 'Total Collected'}</p>
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
        placeholder="Search by name, mobile, receipt..."
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
          message="Try adjusting your filters or add a new contribution."
          action={{ label: 'Add Contribution', onClick: openAdd }} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Receipt','Name','Mobile','Amount','Method','Status','Department','Collector','Date','Actions']
                  .map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-saffron-700 font-bold">{c.receiptNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.contributorName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.mobile}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.paymentMethod}</td>
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
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
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

      {/* Smart Auto-Pay (Auto-Bill) Modal */}
      <SmartAutoPayModal
        open={smartPayOpen}
        onClose={() => setSmartPayOpen(false)}
        festival={festival}
        user={user}
        departments={departments}
        onSuccess={(createdList) => {
          setSingleReceiptContrib(createdList[0])
          setSingleReceiptOpen(true)
        }}
      />

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
