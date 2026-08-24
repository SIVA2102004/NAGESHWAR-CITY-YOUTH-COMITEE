import React, { useEffect, useState } from 'react'
import { UserCheck, Ban, CheckCircle, Trash2, Edit2, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { getUsersByRole, setUserStatus, deleteUserProfile, updateUserProfile } from '../../services/userService'
import { getDepartmentsByFestival } from '../../services/departmentService'
import { getContributionsByCollector } from '../../services/contributionService'
import { createInviteCode } from '../../services/inviteCodeService'
import { logActivity } from '../../services/activityService'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import SearchFilter from '../../components/ui/SearchFilter'
import InviteCodeCard from '../../components/shared/InviteCodeCard'
import { formatDate, formatCurrency } from '../../utils/formatters'
import type { AppUser, Department, InviteCode, UserStatus } from '../../types'

const statusVariant: Record<UserStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success', pending: 'warning', blocked: 'danger'
}

export default function VolunteersPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [volunteers, setVolunteers] = useState<AppUser[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [loading, setLoading] = useState(true)

  const [editVol, setEditVol] = useState<AppUser | null>(null)
  const [delVol, setDelVol] = useState<AppUser | null>(null)
  const [codeVol, setCodeVol] = useState<AppUser | null>(null)
  const [volCodes, setVolCodes] = useState<InviteCode[]>([])
  const [genLoad, setGenLoad] = useState(false)
  const [saving, setSaving] = useState(false)
  const [delLoad, setDelLoad] = useState(false)
  const [collTotals, setCollTotals] = useState<Record<string, number>>({})

  const load = async () => {
    if (!festival) return
    setLoading(true)
    try {
      const [vols, depts] = await Promise.all([
        getUsersByRole(festival.id, 'volunteer'),
        getDepartmentsByFestival(festival.id),
      ])
      setVolunteers(vols)
      setDepartments(depts)
      const totals: Record<string, number> = {}
      await Promise.all(vols.map(async v => {
        const contribs = await getContributionsByCollector(festival.id, v.uid)
        totals[v.uid] = contribs.filter(c => c.paymentStatus === 'Paid').reduce((s, c) => s + c.amount, 0)
      }))
      setCollTotals(totals)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [festival])

  const filtered = volunteers.filter(v => {
    const q = search.toLowerCase()
    const matchSearch = !q || v.name.toLowerCase().includes(q) || v.email.toLowerCase().includes(q)
    const matchDept = !filterDept || v.departmentId === filterDept
    return matchSearch && matchDept
  })

  const handleToggle = async (v: AppUser) => {
    const ns: UserStatus = v.status === 'active' ? 'blocked' : 'active'
    try {
      await setUserStatus(v.uid, ns)
      toast.success(`Volunteer ${ns}`)
      await logActivity({ festivalId: festival!.id, userId: user!.uid, userName: user!.name, role: 'admin',
        action: ns === 'active' ? 'USER_ACTIVATED' : 'USER_BLOCKED', entityType: 'user', entityId: v.uid,
        description: `Volunteer ${v.name} ${ns}` })
      await load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async () => {
    if (!delVol || !festival || !user) return
    setDelLoad(true)
    try {
      await deleteUserProfile(delVol.uid)
      toast.success('Volunteer removed')
      setDelVol(null)
      await load()
    } catch { toast.error('Delete failed') } finally { setDelLoad(false) }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editVol) return
    setSaving(true)
    try {
      await updateUserProfile(editVol.uid, { name: editVol.name, mobile: editVol.mobile })
      toast.success('Updated')
      setEditVol(null)
      await load()
    } catch { toast.error('Update failed') } finally { setSaving(false) }
  }

  const openCodes = async (v: AppUser) => {
    setCodeVol(v)
    setVolCodes([])
  }

  const handleGenCode = async () => {
    if (!codeVol || !user || !festival) return
    setGenLoad(true)
    try {
      const ic = await createInviteCode({
        type: 'MEMBER_INVITE',
        festivalId: festival.id,
        departmentId: codeVol.departmentId,
        departmentName: codeVol.departmentName,
        createdBy: user.uid,
        createdByName: user.name,
        maxUses: 20,
        expiresInDays: 30,
      })
      setVolCodes(prev => [ic, ...prev])
      toast.success('Member invite code generated!')
    } catch { toast.error('Failed') } finally { setGenLoad(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Coordinators</h1>
          <p className="text-gray-500 text-sm">{volunteers.length} total coordinators</p>
        </div>
      </div>

      <SearchFilter
        value={search} onChange={setSearch} placeholder="Search coordinators..."
        filters={[{ key:'dept', label:'All Depts', value:filterDept, onChange:setFilterDept,
          options: departments.map(d=>({label:d.name,value:d.id})) }]}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<UserCheck size={32} />} title="No coordinators yet"
          message="Coordinators join using department coordinator invite codes." />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name','Email','Mobile','Department','Collected','Status','Joined','Actions']
                  .map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.uid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {v.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{v.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.email}</td>
                  <td className="px-4 py-3 text-gray-600">{v.mobile}</td>
                  <td className="px-4 py-3 text-gray-600">{v.departmentName || '�'}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(collTotals[v.uid] || 0)}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[v.status]} dot>{v.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(v.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openCodes(v)} className="p-1.5 rounded text-saffron-600 hover:bg-saffron-50" title="Member codes"><Key size={14} /></button>
                      <button onClick={() => setEditVol(v)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => handleToggle(v)}
                        className={`p-1.5 rounded ${v.status==='active'?'text-red-500 hover:bg-red-50':'text-green-500 hover:bg-green-50'}`}>
                        {v.status==='active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </button>
                      <button onClick={() => setDelVol(v)} className="p-1.5 rounded text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editVol && (
        <Modal open={!!editVol} onClose={() => setEditVol(null)} title="Edit Volunteer"
          footer={<>
            <Button variant="outline" onClick={() => setEditVol(null)}>Cancel</Button>
            <Button onClick={handleEdit} loading={saving}>Update</Button>
          </>}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Input label="Name" value={editVol.name} onChange={e => setEditVol(u => u ? {...u, name:e.target.value} : u)} required />
            <Input label="Mobile" value={editVol.mobile} onChange={e => setEditVol(u => u ? {...u, mobile:e.target.value} : u)} />
          </form>
        </Modal>
      )}

      {codeVol && (
        <Modal open={!!codeVol} onClose={() => setCodeVol(null)} title={`Member Invite Codes � ${codeVol.name}`} maxWidth="max-w-lg">
          <div className="space-y-4">
            <div className="bg-saffron-50 rounded-xl p-4 border border-saffron-100">
              <p className="text-sm text-gray-600 mb-3">Generate a member invite code for {codeVol.name}'s department ({codeVol.departmentName})</p>
              <Button icon={<Key size={14} />} onClick={handleGenCode} loading={genLoad}>Generate Code</Button>
            </div>
            <div className="space-y-3">
              {volCodes.map(c => <InviteCodeCard key={c.id} code={c} />)}
              {volCodes.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Click generate to create a code</p>}
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog open={!!delVol} onClose={() => setDelVol(null)} onConfirm={handleDelete}
        title="Remove Volunteer" message={`Remove volunteer ${delVol?.name}?`}
        confirmText="Remove" loading={delLoad} />
    </div>
  )
}
