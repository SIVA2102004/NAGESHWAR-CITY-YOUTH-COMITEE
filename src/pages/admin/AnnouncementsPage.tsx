import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Megaphone, Globe, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../services/announcementService'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import { formatDate } from '../../utils/formatters'
import type { Announcement } from '../../types'

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)
  const [delLoad, setDelLoad] = useState(false)

  const [form, setForm] = useState({ title: '', content: '', status: 'published' as 'published' | 'draft' })

  const load = async () => {
    if (!festival) return
    setLoading(true)
    try {
      setAnnouncements(await getAllAnnouncements(festival.id))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [festival])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.content || !festival || !user) { toast.error('Fill all fields'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateAnnouncement(editing.id, form)
        toast.success('Updated')
      } else {
        await createAnnouncement({ ...form, festivalId: festival.id, createdBy: user.uid, createdByName: user.name })
        toast.success('Announcement published!')
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDelLoad(true)
    try {
      await deleteAnnouncement(deleting.id)
      toast.success('Deleted')
      setDeleting(null)
      await load()
    } catch { toast.error('Delete failed') } finally { setDelLoad(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm">Broadcast to all members and volunteers</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => { setForm({title:'',content:'',status:'published'}); setEditing(null); setModalOpen(true) }}>
          New Announcement
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : announcements.length === 0 ? (
        <EmptyState icon={<Megaphone size={32} />} title="No announcements yet"
          action={{ label: 'Create Announcement', onClick: () => setModalOpen(true) }} />
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="bg-white rounded-2xl shadow-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{a.title}</h3>
                    <Badge variant={a.status === 'published' ? 'success' : 'default'} dot>{a.status}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(a.createdAt)} � {a.createdByName}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="ghost" icon={<Edit2 size={13} />}
                    onClick={() => { setForm({title:a.title,content:a.content,status:a.status}); setEditing(a); setModalOpen(true) }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={13} />}
                    onClick={() => setDeleting(a)} className="text-red-600 hover:bg-red-50">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Edit Announcement' : 'New Announcement'} maxWidth="max-w-lg"
        footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Publish'}</Button>
        </>}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} required placeholder="Announcement title" />
          <div>
            <label className="text-sm font-medium text-gray-700">Content <span className="text-red-500">*</span></label>
            <textarea
              value={form.content}
              onChange={e => setForm(f=>({...f,content:e.target.value}))}
              className="input-field mt-1 resize-none"
              rows={5}
              placeholder="Announcement details..."
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="flex gap-3 mt-2">
              {(['published','draft']).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f=>({...f,status:s as 'published' | 'draft'}))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.status === s ? 'bg-saffron-100 border-saffron-300 text-saffron-800' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {s === 'published' ? <Globe size={14} /> : <FileText size={14} />}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Delete Announcement" message={`Delete "${deleting?.title}"?`}
        confirmText="Delete" loading={delLoad} />
    </div>
  )
}
