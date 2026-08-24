import React, { useEffect, useState } from 'react'
import { ShieldCheck, Edit2, Ban, CheckCircle, Trash2, Key, UserPlus, RefreshCw, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { getUsersByRole, setUserStatus, deleteUserProfile, updateUserProfile } from '../../services/userService'
import { createInviteCode, getInviteCodesByFestival } from '../../services/inviteCodeService'
import { logActivity } from '../../services/activityService'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import SearchFilter from '../../components/ui/SearchFilter'
import InviteCodeCard from '../../components/shared/InviteCodeCard'
import { formatDate } from '../../utils/formatters'
import type { AppUser, UserStatus, InviteCode } from '../../types'

const statusVariant: Record<UserStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  pending: 'warning',
  blocked: 'danger',
}

export default function AdminsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [admins, setAdmins] = useState<AppUser[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)

  // Edit State
  const [editAdmin, setEditAdmin] = useState<AppUser | null>(null)
  const [delAdmin, setDelAdmin] = useState<AppUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [delLoad, setDelLoad] = useState(false)

  // Invite Code State
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [adminCodes, setAdminCodes] = useState<InviteCode[]>([])
  const [maxUses, setMaxUses] = useState('1')
  const [expDays, setExpDays] = useState('30')
  const [genLoading, setGenLoading] = useState(false)

  const load = async () => {
    if (!festival) return
    setLoading(true)
    try {
      const [admList, allCodes] = await Promise.all([
        getUsersByRole(festival.id, 'admin'),
        getInviteCodesByFestival(festival.id),
      ])
      setAdmins(admList)
      setAdminCodes(allCodes.filter(c => c.type === 'ADMIN_INVITE'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [festival])

  const filtered = admins.filter(a => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.mobile && a.mobile.includes(q))
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleToggleStatus = async (a: AppUser) => {
    if (a.uid === user?.uid) {
      toast.error('You cannot change your own status')
      return
    }
    const newStatus: UserStatus = a.status === 'active' ? 'blocked' : 'active'
    try {
      await setUserStatus(a.uid, newStatus)
      toast.success(`Admin ${a.name} ${newStatus === 'active' ? 'activated' : 'blocked'}`)
      await logActivity({
        festivalId: festival!.id,
        userId: user!.uid,
        userName: user!.name,
        role: 'admin',
        action: newStatus === 'active' ? 'USER_ACTIVATED' : 'USER_BLOCKED',
        entityType: 'user',
        entityId: a.uid,
        description: `Admin ${a.name} marked as ${newStatus}`,
      })
      await load()
    } catch {
      toast.error('Failed to change status')
    }
  }

  const handleDelete = async () => {
    if (!delAdmin || !festival || !user) return
    if (delAdmin.uid === user.uid) {
      toast.error('You cannot remove yourself')
      return
    }
    setDelLoad(true)
    try {
      await deleteUserProfile(delAdmin.uid)
      toast.success(`Admin ${delAdmin.name} removed`)
      await logActivity({
        festivalId: festival.id,
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: 'USER_DELETED',
        entityType: 'user',
        description: `Admin ${delAdmin.name} was removed`,
      })
      setDelAdmin(null)
      await load()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDelLoad(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editAdmin) return
    setSaving(true)
    try {
      await updateUserProfile(editAdmin.uid, {
        name: editAdmin.name,
        mobile: editAdmin.mobile,
        address: editAdmin.address,
      })
      toast.success('Admin details updated')
      setEditAdmin(null)
      await load()
    } catch {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleGenAdminCode = async () => {
    if (!festival || !user) return
    setGenLoading(true)
    try {
      const ic = await createInviteCode({
        type: 'ADMIN_INVITE',
        festivalId: festival.id,
        createdBy: user.uid,
        createdByName: user.name,
        maxUses: parseInt(maxUses) || 0,
        expiresInDays: parseInt(expDays) || undefined,
      })
      setAdminCodes(prev => [ic, ...prev])
      toast.success(`Admin Invite Code ${ic.code} generated!`)
    } catch {
      toast.error('Failed to generate invite code')
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-saffron-600" size={28} />
            Administrators &amp; Co-Admins
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {admins.length} committee leaders with full administrative access
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" icon={<RefreshCw size={15} />} onClick={load}>
            Refresh
          </Button>
          <Button icon={<UserPlus size={16} />} onClick={() => setInviteModalOpen(true)}>
            Invite Co-Admin
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search admins by name, email, mobile..."
        filters={[
          {
            key: 'status',
            label: 'All Status',
            value: filterStatus,
            onChange: setFilterStatus,
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Blocked', value: 'blocked' },
              { label: 'Pending', value: 'pending' },
            ],
          },
        ]}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading administrators...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={32} />}
          title="No administrators found"
          message="Invite co-admins to collaborate on managing the Ganesh Mahotsav festival."
          action={{ label: 'Invite Co-Admin', onClick: () => setInviteModalOpen(true) }}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Administrator', 'Email Address', 'Mobile Number', 'Role Badge', 'Status', 'Joined Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.uid} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-saffron-500 to-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 flex items-center gap-1.5">
                          {a.name}
                          {a.uid === user?.uid && (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                        </p>
                        {a.address && <p className="text-xs text-gray-400">{a.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{a.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">
                    {a.mobile ? (
                      <span className="flex items-center gap-1.5">
                        <Phone size={14} className="text-gray-400 flex-shrink-0" /> {a.mobile}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="saffron" dot>
                      Administrator
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={statusVariant[a.status]} dot>
                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditAdmin(a)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 size={14} />
                      </button>
                      {a.uid !== user?.uid && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(a)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              a.status === 'active'
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={a.status === 'active' ? 'Block Admin' : 'Activate Admin'}
                          >
                            {a.status === 'active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                          </button>
                          <button
                            onClick={() => setDelAdmin(a)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove Admin"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editAdmin && (
        <Modal
          open={!!editAdmin}
          onClose={() => setEditAdmin(null)}
          title={`Edit Administrator • ${editAdmin.name}`}
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditAdmin(null)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} loading={saving}>
                Update Details
              </Button>
            </>
          }
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <Input
              label="Full Name"
              value={editAdmin.name}
              onChange={e => setEditAdmin(u => (u ? { ...u, name: e.target.value } : u))}
              required
            />
            <Input
              label="Mobile Number"
              type="tel"
              value={editAdmin.mobile || ''}
              onChange={e => setEditAdmin(u => (u ? { ...u, mobile: e.target.value } : u))}
            />
            <Input
              label="Address / Area"
              value={editAdmin.address || ''}
              onChange={e => setEditAdmin(u => (u ? { ...u, address: e.target.value } : u))}
            />
          </form>
        </Modal>
      )}

      {/* Invite Co-Admin Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Co-Administrator"
        maxWidth="max-w-lg"
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
              Generate Admin Invite Code
            </h4>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Create a secure code for your committee co-leader. They can use it to register their account with their own password on the Join page.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Max Uses (Decided by Admin)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="number"
                    min="0"
                    value={maxUses}
                    onChange={e => setMaxUses(e.target.value)}
                    placeholder="1"
                    className="w-24 text-center font-bold"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { label: '1 (Single-Use)', val: '1' },
                      { label: '2 People', val: '2' },
                      { label: '5 People', val: '5' },
                    ].map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setMaxUses(p.val)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                          maxUses === p.val
                            ? 'bg-saffron-600 text-white border-saffron-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-medium">Expires in:</span>
                  <select
                    value={expDays}
                    onChange={e => setExpDays(e.target.value)}
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
                  onClick={handleGenAdminCode}
                  loading={genLoading}
                >
                  Generate Admin Code
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">
              Active Admin Invite Codes
            </h4>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {adminCodes.map(c => (
                <InviteCodeCard
                  key={c.id}
                  code={c}
                  onUpdated={updated => {
                    setAdminCodes(prev => prev.map(item => item.id === updated.id ? { ...updated } : item))
                  }}
                  onDisable={async (id) => {
                    setAdminCodes(prev => prev.map(item => item.id === id ? { ...item, status: 'disabled' } : item))
                    toast.success('Invite code disabled')
                  }}
                />
              ))}
              {adminCodes.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No active Admin codes. Click "Generate Admin Code" above.
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!delAdmin}
        onClose={() => setDelAdmin(null)}
        onConfirm={handleDelete}
        title="Remove Administrator"
        message={`Are you sure you want to remove ${delAdmin?.name} as an Administrator? They will lose access to the Admin Dashboard.`}
        confirmText="Remove Admin"
        loading={delLoad}
      />
    </div>
  )
}
