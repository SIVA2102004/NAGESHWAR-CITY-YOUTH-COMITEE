import React, { useEffect, useState } from 'react'
import {
  Plus, Edit2, Trash2, Receipt, IndianRupee, Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import {
  subscribeToContributions, createContribution,
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
import UpiQrCode from '../../components/shared/UpiQrCode'
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

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contribution | null>(null)
  const [deleting, setDeleting] = useState<Contribution | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptContrib, setReceiptContrib] = useState<Contribution | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [delLoading, setDelLoading] = useState(false)

  const [form, setForm] = useState({
    contributorName: '',
    mobile: '',
    houseNumber: '',
    amount: '',
    paymentMethod: 'Cash' as PaymentMethod,
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

  const filtered = contributions.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.contributorName.toLowerCase().includes(q) ||
      c.mobile.includes(q) || c.receiptNumber.toLowerCase().includes(q)
    const matchStatus = !filterStatus || c.paymentStatus === filterStatus
    const matchMethod = !filterMethod || c.paymentMethod === filterMethod
    const matchDept = !filterDept || c.departmentId === filterDept
    return matchSearch && matchStatus && matchMethod && matchDept
  })

  const resetForm = () => setForm({
    contributorName: '', mobile: '', houseNumber: '', amount: '',
    paymentMethod: 'Cash', paymentStatus: 'Paid',
    departmentId: departments[0]?.id || '', departmentName: departments[0]?.name || '',
    notes: '',
  })

  const openAdd = () => { resetForm(); setEditing(null); setModalOpen(true) }

  const openEdit = (c: Contribution) => {
    setForm({
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
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contributorName || !form.mobile || !form.amount || !festival || !user) {
      toast.error('Fill all required fields')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateContribution(editing.id, {
          contributorName: form.contributorName,
          mobile: form.mobile,
          houseNumber: form.houseNumber,
          amount: parseFloat(form.amount),
          paymentMethod: form.paymentMethod,
          paymentStatus: form.paymentStatus,
          departmentId: form.departmentId,
          departmentName: form.departmentName,
          notes: form.notes,
        })
        toast.success('Contribution updated')
        await logActivity({ festivalId: festival.id, userId: user.uid, userName: user.name, role: 'admin',
          action: 'CONTRIBUTION_UPDATED', entityType: 'contribution', entityId: editing.id,
          description: `Updated contribution for ${form.contributorName}` })
      } else {
        const dept = departments.find(d => d.id === form.departmentId)
        const c = await createContribution({
          festivalId: festival.id,
          festivalYear: festival.festivalYear,
          contributorName: form.contributorName,
          mobile: form.mobile,
          houseNumber: form.houseNumber,
          amount: parseFloat(form.amount),
          paymentMethod: form.paymentMethod,
          paymentStatus: form.paymentStatus,
          collectedBy: user.name,
          collectedByUid: user.uid,
          departmentId: form.departmentId,
          departmentName: dept?.name || form.departmentName || 'General',
          notes: form.notes,
          createdBy: user.uid,
        })
        toast.success('Contribution saved!')
        await logActivity({ festivalId: festival.id, userId: user.uid, userName: user.name, role: 'admin',
          action: 'CONTRIBUTION_CREATED', entityType: 'contribution', entityId: c.id,
          description: `${form.contributorName} contributed ${formatCurrency(parseFloat(form.amount))}` })
      }
      setModalOpen(false)
    } catch { toast.error('Save failed') } finally { setSaving(false) }
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
          <p className="text-gray-500 text-sm">{contributions.length} total • {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Paid','Pending','Partial'].map(s => (
          <div key={s} className="bg-white rounded-xl shadow-card p-4 text-center">
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(contributions.filter(c => c.paymentStatus === s).reduce((sum,c)=>sum+c.amount,0))}
            </p>
            <p className="text-sm text-gray-500">{s}</p>
          </div>
        ))}
        <div className="bg-saffron-50 rounded-xl shadow-card p-4 text-center">
          <p className="text-xl font-bold text-saffron-700">
            {formatCurrency(contributions.filter(c=>c.paymentStatus==='Paid').reduce((s,c)=>s+c.amount,0))}
          </p>
          <p className="text-sm text-saffron-600">Total Collected</p>
        </div>
      </div>

      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search by name, mobile, receipt..."
        filters={[
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
                {['Receipt','Name','Mobile','Amount','Method','Status','Department','Date','Actions']
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
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setReceiptContrib(c); setReceiptOpen(true) }}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Contribution' : 'Add Contribution'}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contributor Name" value={form.contributorName} onChange={e => setForm(f=>({...f,contributorName:e.target.value}))} required />
            <Input label="Mobile" type="tel" value={form.mobile} onChange={e => setForm(f=>({...f,mobile:e.target.value}))} required />
            <Input label="House Number" value={form.houseNumber} onChange={e => setForm(f=>({...f,houseNumber:e.target.value}))} />
            <Input label="Amount (?)" type="number" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f=>({...f,paymentMethod:e.target.value as PaymentMethod}))}
                className="input-field mt-1">
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Status</label>
              <select value={form.paymentStatus} onChange={e => setForm(f=>({...f,paymentStatus:e.target.value as PaymentStatus}))}
                className="input-field mt-1">
                {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic UPI QR Code */}
          {(form.paymentMethod === 'UPI' || form.paymentMethod === 'Online') && (
            <div className="p-3 bg-orange-50/70 border-2 border-amber-300 rounded-2xl text-center">
              <p className="text-xs font-bold text-amber-900 mb-1.5">Devotee Instant Scan &amp; Pay</p>
              <UpiQrCode
                upiId={festival?.upiId || 'srinageshwaryouth@upi'}
                payeeName={festival?.upiPayeeName || festival?.committeeName || 'Sri Nageshwar Youth'}
                amount={form.amount}
                note={`Ganesh Chanda - ${form.contributorName || 'Devotee'}`}
                size={160}
                showDetails={true}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Department</label>
            <select
              value={form.departmentId}
              onChange={e => {
                const dept = departments.find(d => d.id === e.target.value)
                setForm(f => ({ ...f, departmentId: e.target.value, departmentName: dept?.name || '' }))
              }}
              className="input-field mt-1"
            >
              <option value="">-- Select Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
              className="input-field mt-1 resize-none" rows={2} />
          </div>
        </form>
      </Modal>

      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        contribution={receiptContrib}
        festival={festival}
      />

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
