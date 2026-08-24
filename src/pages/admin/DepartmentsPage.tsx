import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Building2, RefreshCw, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import {
  getDepartmentsByFestival, createDepartment,
  updateDepartment, deleteDepartment
} from '../../services/departmentService'
import {
  createInviteCode, getInviteCodesByDepartment, disableCode
} from '../../services/inviteCodeService'
import { logActivity } from '../../services/activityService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import InviteCodeCard from '../../components/shared/InviteCodeCard'
import type { Department, InviteCode } from '../../types'

export default function DepartmentsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [deleteDept, setDeleteDept] = useState<Department | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const [codesDept, setCodesDept] = useState<Department | null>(null)
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [genType, setGenType] = useState<'VOLUNTEER_INVITE' | 'MEMBER_INVITE'>('VOLUNTEER_INVITE')
  const [genLoading, setGenLoading] = useState(false)
  const [maxUses, setMaxUses] = useState('10')
  const [expDays, setExpDays] = useState('30')

  const [form, setForm] = useState({ name: '', description: '' })

  const load = async () => {
    if (!festival) return
    setLoading(true)
    try {
      const depts = await getDepartmentsByFestival(festival.id)
      setDepartments(depts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [festival])

  const openCodes = async (dept: Department) => {
    setCodesDept(dept)
    const c = await getInviteCodesByDepartment(dept.id)
    setCodes(c)
  }

  const handleGenCode = async () => {
    if (!codesDept || !user || !festival) return
    setGenLoading(true)
    try {
      const ic = await createInviteCode({
        type: genType,
        festivalId: festival.id,
        departmentId: codesDept.id,
        departmentName: codesDept.name,
        createdBy: user.uid,
        createdByName: user.name,
        maxUses: parseInt(maxUses) || 0,
        expiresInDays: parseInt(expDays) || undefined,
      })
      setCodes(prev => [ic, ...prev])
      toast.success('Invite code generated!')
      await logActivity({
        festivalId: festival.id,
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: 'INVITE_CODE_CREATED',
        entityType: 'inviteCode',
        entityId: ic.id,
        description: `Invite code ${ic.code} created for ${codesDept.name}`,
      })
    } catch { toast.error('Failed to generate code') } finally { setGenLoading(false) }
  }

  const handleDisableCode = async (id: string) => {
    await disableCode(id)
    setCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'disabled' } : c))
    toast.success('Code disabled')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !festival || !user) return
    setSaving(true)
    try {
      if (editDept) {
        await updateDepartment(editDept.id, { name: form.name, description: form.description })
        toast.success('Department updated')
        await logActivity({
          festivalId: festival.id,
          userId: user.uid, userName: user.name, role: 'admin',
          action: 'DEPARTMENT_UPDATED', entityType: 'department', entityId: editDept.id,
          description: `Department "${form.name}" updated`,
        })
      } else {
        const id = await createDepartment({ name: form.name, description: form.description, festivalId: festival.id, createdBy: user.uid })
        toast.success('Department created!')
        await logActivity({
          festivalId: festival.id,
          userId: user.uid, userName: user.name, role: 'admin',
          action: 'DEPARTMENT_CREATED', entityType: 'department', entityId: id,
          description: `Department "${form.name}" created`,
        })
      }
      setAddOpen(false)
      setEditDept(null)
      setForm({ name: '', description: '' })
      await load()
    } catch (err: unknown) {
      console.error('Save department error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save department')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteDept || !festival || !user) return
    setDeleting(true)
    try {
      await deleteDepartment(deleteDept.id)
      toast.success('Department deleted')
      await logActivity({
        festivalId: festival.id,
        userId: user.uid, userName: user.name, role: 'admin',
        action: 'DEPARTMENT_DELETED', entityType: 'department',
        description: `Department "${deleteDept.name}" deleted`,
      })
      setDeleteDept(null)
      await load()
    } catch (err: unknown) {
      console.error('Delete department error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Departments</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage festival departments and invite codes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<RefreshCw size={15} />} onClick={load}>Refresh</Button>
          <Button icon={<Plus size={15} />} onClick={() => { setForm({ name: '', description: '' }); setEditDept(null); setAddOpen(true) }}>
            Add Department
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={<Building2 size={32} />}
          title="No departments yet"
          message="Create departments to organize your volunteers and members."
          action={{ label: 'Create Department', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments.map(dept => (
            <Card key={dept.id} hover>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-saffron-100 flex items-center justify-center">
                      <Building2 size={16} className="text-saffron-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 truncate">{dept.name}</h3>
                  </div>
                  {dept.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{dept.description}</p>
                  )}
                  <Badge variant={dept.status === 'active' ? 'success' : 'default'} dot>
                    {dept.status}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-4 border-t border-gray-100 pt-4">
                <Button size="sm" variant="outline" icon={<Key size={13} />} onClick={() => openCodes(dept)}>
                  Codes
                </Button>
                <Button size="sm" variant="ghost" icon={<Edit2 size={13} />}
                  onClick={() => { setEditDept(dept); setForm({ name: dept.name, description: dept.description || '' }); setAddOpen(true) }}
                >Edit</Button>
                <Button size="sm" variant="ghost" icon={<Trash2 size={13} />}
                  onClick={() => setDeleteDept(dept)}
                  className="text-red-600 hover:bg-red-50"
                >Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditDept(null) }}
        title={editDept ? 'Edit Department' : 'Add Department'}
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditDept(null) }}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editDept ? 'Update' : 'Create'}</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Department Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Decoration" required />
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field mt-1 resize-none"
              rows={3}
              placeholder="What does this department do?"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!codesDept}
        onClose={() => setCodesDept(null)}
        title={`Invite Codes � ${codesDept?.name}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="bg-saffron-50 rounded-xl p-4 border border-saffron-100">
            <h4 className="font-semibold text-gray-900 mb-3">Generate New Code</h4>
            <div className="flex gap-3 flex-wrap">
              <select
                value={genType}
                onChange={e => setGenType(e.target.value as typeof genType)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white flex-1"
              >
                <option value="VOLUNTEER_INVITE">Coordinator Invite</option>
                <option value="MEMBER_INVITE">Volunteer Invite</option>
              </select>
              <Input
                label="Max Uses"
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                className="w-32"
              />
              <Input
                label="Expires (days)"
                type="number"
                value={expDays}
                onChange={e => setExpDays(e.target.value)}
                className="w-28"
              />
            </div>
            <Button className="mt-3" icon={<Key size={14} />} onClick={handleGenCode} loading={genLoading}>
              Generate Code
            </Button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {codes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No codes generated yet</p>
            ) : (
              codes.map(c => (
                <InviteCodeCard key={c.id} code={c} onDisable={handleDisableCode} />
              ))
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteDept}
        onClose={() => setDeleteDept(null)}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteDept?.name}"? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  )
}
