import React, { useEffect, useState } from 'react'
import { Users, Edit2, Ban, CheckCircle, Trash2, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { getUsersByRole, setUserStatus, deleteUserProfile, updateUserProfile } from '../../services/userService'
import { getDepartmentsByFestival } from '../../services/departmentService'
import { createContribution } from '../../services/contributionService'
import { logActivity } from '../../services/activityService'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import SearchFilter from '../../components/ui/SearchFilter'
import ReceiptModal from '../../components/receipt/ReceiptModal'
import { formatDate, formatCurrency } from '../../utils/formatters'
import type { AppUser, Department, UserStatus, PaymentMethod, PaymentStatus, Contribution } from '../../types'

const statusVariant: Record<UserStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  pending: 'warning',
  blocked: 'danger',
}

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Online', 'UPI', 'Cheque']
const PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Partial']

export default function MembersPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [members, setMembers] = useState<AppUser[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus]= useState('')
  const [loading, setLoading] = useState(true)

  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [delUser, setDelUser] = useState<AppUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [delLoad, setDelLoad] = useState(false)

  // Record Chanda for member
  const [chandaMember, setChandaMember] = useState<AppUser | null>(null)
  const [chandaForm, setChandaForm] = useState({
    amount: '',
    paymentMethod: 'Cash' as PaymentMethod,
    paymentStatus: 'Paid' as PaymentStatus,
    notes: '',
  })
  const [chandaSaving, setChandaSaving] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Contribution | null>(null)

  const load = async () => {
    if (!festival) return
    setLoading(true)
    try {
      const [m, d] = await Promise.all([
        getUsersByRole(festival.id, 'member'),
        getDepartmentsByFestival(festival.id),
      ])
      setMembers(m)
      setDepartments(d)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [festival])

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q || m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) || m.mobile.includes(q)
    const matchDept = !filterDept || m.departmentId === filterDept
    const matchStatus = !filterStatus || m.status === filterStatus
    return matchSearch && matchDept && matchStatus
  })

  const handleToggleStatus = async (m: AppUser) => {
    const newStatus: UserStatus = m.status === 'active' ? 'blocked' : 'active'
    try {
      await setUserStatus(m.uid, newStatus)
      toast.success(`Member ${newStatus === 'active' ? 'activated' : 'blocked'}`)
      await logActivity({ festivalId: festival!.id, userId: user!.uid, userName: user!.name, role: 'admin',
        action: newStatus === 'active' ? 'USER_ACTIVATED' : 'USER_BLOCKED', entityType: 'user', entityId: m.uid,
        description: `Member ${m.name} ${newStatus}` })
      await load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async () => {
    if (!delUser || !festival || !user) return
    setDelLoad(true)
    try {
      await deleteUserProfile(delUser.uid)
      toast.success('Member removed')
      await logActivity({ festivalId: festival.id, userId: user.uid, userName: user.name, role: 'admin',
        action: 'USER_DELETED', entityType: 'user', description: `Member ${delUser.name} deleted` })
      setDelUser(null)
      await load()
    } catch { toast.error('Delete failed') } finally { setDelLoad(false) }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setSaving(true)
    try {
      await updateUserProfile(editUser.uid, {
        name: editUser.name, mobile: editUser.mobile, address: editUser.address
      })
      toast.success('Updated')
      setEditUser(null)
      await load()
    } catch { toast.error('Update failed') } finally { setSaving(false) }
  }

  const handleRecordChanda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chandaMember || !chandaForm.amount || !festival || !user) {
      toast.error('Enter valid amount')
      return
    }
    setChandaSaving(true)
    try {
      const c = await createContribution({
        festivalId: festival.id,
        festivalYear: festival.festivalYear,
        contributorName: chandaMember.name,
        mobile: chandaMember.mobile,
        houseNumber: chandaMember.address,
        amount: parseFloat(chandaForm.amount),
        paymentMethod: chandaForm.paymentMethod,
        paymentStatus: chandaForm.paymentStatus,
        collectedBy: user.name,
        collectedByUid: user.uid,
        departmentId: chandaMember.departmentId || 'general',
        departmentName: chandaMember.departmentName || 'General',
        notes: chandaForm.notes,
        createdBy: user.uid,
      })

      toast.success(`Contribution recorded for ${chandaMember.name}! ??`)
      await logActivity({
        festivalId: festival.id,
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: 'CONTRIBUTION_CREATED',
        entityType: 'contribution',
        entityId: c.id,
        description: `Admin recorded ${formatCurrency(parseFloat(chandaForm.amount))} for member ${chandaMember.name}`,
      })

      setChandaMember(null)
      setSelectedReceipt(c)
      setReceiptOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record contribution')
    } finally {
      setChandaSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Members</h1>
          <p className="text-gray-500 text-sm">{members.length} total registered members</p>
        </div>
      </div>

      <SearchFilter
        value={search} onChange={setSearch} placeholder="Search members by name, email, mobile..."
        filters={[
          { key:'dept', label:'All Depts', value:filterDept, onChange:setFilterDept,
            options: departments.map(d=>({label:d.name,value:d.id})) },
          { key:'status', label:'All Status', value:filterStatus, onChange:setFilterStatus,
            options: [{label:'Active',value:'active'},{label:'Blocked',value:'blocked'},{label:'Pending',value:'pending'}] },
        ]}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading members...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="No members found" message="Members join using invite codes from the join page." />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name','Email','Mobile','Department','Volunteer','Status','Joined','Actions']
                  .map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.uid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-700 font-bold text-sm">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.email}</td>
                  <td className="px-4 py-3 text-gray-600">{m.mobile}</td>
                  <td className="px-4 py-3 text-gray-600">{m.departmentName || '�'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.volunteerName || '�'}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[m.status]} dot>{m.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setChandaMember(m)
                          setChandaForm({ amount: '', paymentMethod: 'Cash', paymentStatus: 'Paid', notes: '' })
                        }}
                        className="px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 font-semibold text-xs flex items-center gap-1"
                        title="Record Chanda for this member"
                      >
                        <IndianRupee size={12} /> Chanda
                      </button>
                      <button onClick={() => setEditUser(m)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleToggleStatus(m)}
                        className={`p-1.5 rounded ${m.status==='active'?'text-red-500 hover:bg-red-50':'text-green-500 hover:bg-green-50'}`}
                        title={m.status==='active'?'Block':'Activate'}>
                        {m.status === 'active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </button>
                      <button onClick={() => setDelUser(m)} className="p-1.5 rounded text-red-600 hover:bg-red-50" title="Delete">
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

      {/* Record Chanda Modal */}
      {chandaMember && (
        <Modal
          open={!!chandaMember}
          onClose={() => setChandaMember(null)}
          title={`Record Chanda � ${chandaMember.name}`}
          maxWidth="max-w-md"
          footer={<>
            <Button variant="outline" onClick={() => setChandaMember(null)}>Cancel</Button>
            <Button onClick={handleRecordChanda} loading={chandaSaving}>Save &amp; Generate Receipt</Button>
          </>}
        >
          <form onSubmit={handleRecordChanda} className="space-y-3">
            <div className="p-3 bg-saffron-50 rounded-xl border border-saffron-100 text-xs text-saffron-900">
              Recording for: <strong>{chandaMember.name}</strong> ({chandaMember.mobile})
            </div>

            <Input
              label="Amount (?)"
              type="number"
              value={chandaForm.amount}
              onChange={e => setChandaForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 1001"
              required
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={chandaForm.paymentMethod}
                  onChange={e => setChandaForm(f => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                  className="input-field mt-1"
                >
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Payment Status</label>
                <select
                  value={chandaForm.paymentStatus}
                  onChange={e => setChandaForm(f => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))}
                  className="input-field mt-1"
                >
                  {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                value={chandaForm.notes}
                onChange={e => setChandaForm(f => ({ ...f, notes: e.target.value }))}
                className="input-field mt-1 resize-none"
                rows={2}
                placeholder="e.g. Received via cash at temple"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editUser && (
        <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit Member"
          footer={<>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEdit} loading={saving}>Update</Button>
          </>}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Input label="Name" value={editUser.name} onChange={e => setEditUser(u => u ? {...u, name: e.target.value} : u)} required />
            <Input label="Mobile" value={editUser.mobile} onChange={e => setEditUser(u => u ? {...u, mobile: e.target.value} : u)} />
            <Input label="Address" value={editUser.address || ''} onChange={e => setEditUser(u => u ? {...u, address: e.target.value} : u)} />
          </form>
        </Modal>
      )}

      <ConfirmDialog open={!!delUser} onClose={() => setDelUser(null)} onConfirm={handleDelete}
        title="Remove Member" message={`Remove member ${delUser?.name}? This cannot be undone.`}
        confirmText="Remove" loading={delLoad} />

      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        contribution={selectedReceipt}
        festival={festival}
      />
    </div>
  )
}
