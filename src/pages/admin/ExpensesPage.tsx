import React, { useEffect, useState, useRef } from 'react'
import { Plus, Edit2, Trash2, ReceiptText, Upload, Eye, X, FileText, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import {
  subscribeToExpenses, createExpense, updateExpense, deleteExpense
} from '../../services/expenseService'
import { logActivity } from '../../services/activityService'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import SearchFilter from '../../components/ui/SearchFilter'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { Expense, ExpenseCategory, PaymentMethod } from '../../types'

const CATEGORIES: ExpenseCategory[] = [
  'Pandal','Decoration','Prasad','Idol','Lighting','Sound',
  'Cultural Program','Cleaning','Security','Transportation','Other'
]
const METHODS: PaymentMethod[] = ['Cash','Online','UPI','Cheque']

/**
 * Utility to compress image to base64 data URL for easy Firestore storage
 */
async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 900
        let width = img.width
        let height = img.height

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(event.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.72)
        resolve(compressed)
      }
      img.onerror = () => resolve(event.target?.result as string)
    }
    reader.onerror = (err) => reject(err)
  })
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const { festival } = useFestival()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)
  const [delLoad, setDelLoad] = useState(false)

  // Bill viewing modal
  const [viewBillExpense, setViewBillExpense] = useState<Expense | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    category: 'Other' as ExpenseCategory,
    amount: '',
    description: '',
    paymentMethod: 'Cash' as PaymentMethod,
    date: new Date().toISOString().split('T')[0],
    billUrl: '' as string | undefined,
    billName: '' as string | undefined,
  })

  useEffect(() => {
    if (!festival) return
    return subscribeToExpenses(festival.id, setExpenses)
  }, [festival])

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    const matchCat = !filterCat || e.category === filterCat
    return matchSearch && matchCat
  })

  const openAdd = () => {
    setForm({
      title: '',
      category: 'Other',
      amount: '',
      description: '',
      paymentMethod: 'Cash',
      date: new Date().toISOString().split('T')[0],
      billUrl: '',
      billName: '',
    })
    setEditing(null)
    setModalOpen(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB')
      return
    }

    try {
      if (file.type.startsWith('image/')) {
        const compressedBase64 = await compressImageFile(file)
        setForm(f => ({ ...f, billUrl: compressedBase64, billName: file.name }))
        toast.success('Bill image attached!')
      } else {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          setForm(f => ({ ...f, billUrl: reader.result as string, billName: file.name }))
          toast.success('Bill document attached!')
        }
      }
    } catch {
      toast.error('Could not process bill file')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.amount || !festival || !user) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateExpense(editing.id, {
          title: form.title, category: form.category,
          amount: parseFloat(form.amount), description: form.description,
          paymentMethod: form.paymentMethod, date: new Date(form.date),
          billUrl: form.billUrl || undefined,
          billName: form.billName || undefined,
        })
        toast.success('Expense updated')
        await logActivity({ festivalId: festival.id, userId: user.uid, userName: user.name, role: 'admin',
          action: 'EXPENSE_UPDATED', entityType: 'expense', entityId: editing.id,
          description: `Expense "${form.title}" updated to ${formatCurrency(parseFloat(form.amount))}` })
      } else {
        const ex = await createExpense({
          festivalId: festival.id, title: form.title, category: form.category,
          amount: parseFloat(form.amount), description: form.description,
          paymentMethod: form.paymentMethod, date: new Date(form.date),
          addedBy: user.name, addedByUid: user.uid,
          billUrl: form.billUrl || undefined,
          billName: form.billName || undefined,
        })
        toast.success('Expense added with bill!')
        await logActivity({ festivalId: festival.id, userId: user.uid, userName: user.name, role: 'admin',
          action: 'EXPENSE_CREATED', entityType: 'expense', entityId: ex.id,
          description: `Expense "${form.title}" ₹${parseFloat(form.amount)} added` })
      }
      setModalOpen(false)
    } catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleting || !festival || !user) return
    setDelLoad(true)
    try {
      await deleteExpense(deleting.id)
      toast.success('Expense deleted')
      await logActivity({ festivalId: festival.id, userId: user.uid, userName: user.name, role: 'admin',
        action: 'EXPENSE_DELETED', entityType: 'expense',
        description: `Expense "${deleting.title}" deleted` })
      setDeleting(null)
    } catch { toast.error('Delete failed') } finally { setDelLoad(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Expenses &amp; Bills</h1>
          <p className="text-gray-500 text-sm">Total Spent: {formatCurrency(expenses.reduce((s,e)=>s+e.amount,0))}</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={openAdd}>Add Expense</Button>
      </div>

      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search expenses..."
        filters={[{
          key: 'cat', label: 'All Categories', value: filterCat, onChange: setFilterCat,
          options: CATEGORIES.map(c => ({ label: c, value: c }))
        }]}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={<ReceiptText size={32} />} title="No expenses yet"
          message="Add your first expense with an uploaded bill to track committee spending."
          action={{ label: 'Add Expense', onClick: openAdd }} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Title','Category','Amount','Payment','Date','Bill / Invoice','Added By','Actions']
                  .map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.title}</td>
                  <td className="px-4 py-3"><Badge variant="info">{e.category}</Badge></td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{e.paymentMethod}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    {e.billUrl ? (
                      <button
                        onClick={() => setViewBillExpense(e)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-saffron-50 text-saffron-800 border border-saffron-200 text-xs font-semibold hover:bg-saffron-100 transition-colors shadow-sm"
                      >
                        <ImageIcon size={13} className="text-saffron-600" />
                        View Bill
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs italic">No Bill</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.addedBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => {
                        setForm({
                          title: e.title,
                          category: e.category,
                          amount: String(e.amount),
                          description: e.description || '',
                          paymentMethod: e.paymentMethod,
                          date: e.date.toISOString().split('T')[0],
                          billUrl: e.billUrl || '',
                          billName: e.billName || '',
                        })
                        setEditing(e)
                        setModalOpen(true)
                      }}
                        className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleting(e)}
                        className="p-1.5 rounded text-red-600 hover:bg-red-50" title="Delete">
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

      {/* Add / Edit Expense Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Expense' : 'Add Expense & Bill'} maxWidth="max-w-lg"
        footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Update Expense' : 'Save Expense'}</Button>
        </>}>
        <form onSubmit={handleSave} className="space-y-3">
          <Input label="Expense Title *" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Pandal Decoration & Lighting" required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value as ExpenseCategory}))} className="input-field mt-1">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} placeholder="e.g. 2500" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f=>({...f,paymentMethod:e.target.value as PaymentMethod}))} className="input-field mt-1">
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Vendor name, bill remarks..." className="input-field mt-1 resize-none" rows={2} />
          </div>

          {/* Upload Bill / Invoice Option */}
          <div className="pt-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Upload Bill / Invoice Receipt
            </label>
            
            {!form.billUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-saffron-500 hover:bg-saffron-50/50 rounded-xl p-4 text-center cursor-pointer transition-all"
              >
                <Upload size={22} className="mx-auto text-saffron-600 mb-1" />
                <p className="text-xs font-semibold text-gray-700">Click to upload bill image or document</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Supports JPG, PNG, WebP (Max 5MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-saffron-50 border border-saffron-200 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  {form.billUrl.startsWith('data:image') ? (
                    <img
                      src={form.billUrl}
                      alt="Bill preview"
                      className="w-12 h-12 rounded-lg object-cover border border-saffron-300"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-saffron-200 flex items-center justify-center text-saffron-800">
                      <FileText size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {form.billName || 'Attached Bill'}
                    </p>
                    <p className="text-[11px] text-green-700 font-semibold">✓ Ready to save</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, billUrl: '', billName: '' }))}
                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                  title="Remove Bill"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* View Bill Modal */}
      {viewBillExpense && (
        <Modal
          open={!!viewBillExpense}
          onClose={() => setViewBillExpense(null)}
          title={`Bill for: ${viewBillExpense.title}`}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex justify-between items-center w-full">
              <span className="text-xs text-gray-500">
                Amount: <strong className="text-red-700">{formatCurrency(viewBillExpense.amount)}</strong> • {formatDate(viewBillExpense.date)}
              </span>
              <div className="flex gap-2">
                {viewBillExpense.billUrl && (
                  <a
                    href={viewBillExpense.billUrl}
                    download={viewBillExpense.billName || `Bill_${viewBillExpense.title}.jpg`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-saffron-600 text-white rounded-lg text-xs font-bold hover:bg-saffron-700 transition-colors"
                  >
                    Download Bill
                  </a>
                )}
                <Button variant="outline" size="sm" onClick={() => setViewBillExpense(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="text-center py-2">
            {viewBillExpense.billUrl?.startsWith('data:image') || viewBillExpense.billUrl?.startsWith('http') ? (
              <img
                src={viewBillExpense.billUrl}
                alt={viewBillExpense.title}
                className="max-h-[500px] w-auto mx-auto rounded-xl object-contain shadow-md border border-gray-200"
              />
            ) : (
              <div className="p-8 bg-gray-50 rounded-xl text-gray-500">
                <FileText size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="font-semibold text-sm">Document attached: {viewBillExpense.billName || 'Bill'}</p>
                <a
                  href={viewBillExpense.billUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-saffron-600 font-bold underline text-xs"
                >
                  Open / Download Document
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Delete Expense" message={`Delete "${deleting?.title}" (${formatCurrency(deleting?.amount||0)})?`}
        confirmText="Delete" loading={delLoad} />
    </div>
  )
}
