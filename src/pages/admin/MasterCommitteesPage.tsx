import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building,
  Plus,
  ArrowRight,
  TrendingUp,
  IndianRupee,
  Users,
  ShieldCheck,
  CheckCircle,
  QrCode,
  MapPin,
  Trash2,
  Edit3,
  ExternalLink,
  X,
  Upload
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useFestival } from '../../context/FestivalContext'
import { getAllFestivals, deleteFestival } from '../../services/festivalService'
import { getContributionsByFestival } from '../../services/contributionService'
import { getExpensesByFestival } from '../../services/expenseService'
import { getUsersByFestival } from '../../services/userService'
import { formatCurrency } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import type { Festival, CommitteeSummary } from '../../types'

export default function MasterCommitteesPage() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth()
  const { festival, allFestivals, selectFestival, createAndSwitch, refreshFestival } = useFestival()
  const navigate = useNavigate()

  // Guard: Only Central President / Super Admin can access Master Hub after auth finishes loading
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      toast.error('🚫 Access Restricted: Only the Central President has access to the Multi-Pandal Master Hub.')
      navigate('/admin', { replace: true })
    }
  }, [authLoading, isSuperAdmin, navigate])

  const [summaries, setSummaries] = useState<CommitteeSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [newLogo, setNewLogo] = useState<string>('/logo.jpg')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [newForm, setNewForm] = useState({
    name: '',
    committeeName: '',
    festivalYear: '2026',
    targetAmount: '500000',
    upiId: '',
    upiPayeeName: '',
    address: '',
    contactNumber: '',
  })

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 300
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          const compressed = canvas.toDataURL('image/jpeg', 0.85)
          setNewLogo(compressed)
          toast.success('Pandal logo uploaded! 🖼️')
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Festival | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const list = await getAllFestivals()
      const summaryList: CommitteeSummary[] = await Promise.all(
        list.map(async (fest) => {
          try {
            const [contribs, exps, users] = await Promise.all([
              getContributionsByFestival(fest.id),
              getExpensesByFestival(fest.id),
              getUsersByFestival(fest.id),
            ])

            const totalCollection = contribs.reduce((sum, c) => sum + (c.amount || 0), 0)
            const totalExpenses = exps.reduce((sum, e) => sum + (e.amount || 0), 0)
            const netBalance = totalCollection - totalExpenses

            return {
              festival: fest,
              totalCollection,
              totalExpenses,
              netBalance,
              donorCount: contribs.length,
              volunteerCount: users.filter((u) => u.role === 'member' || u.role === 'volunteer').length,
              adminCount: users.filter((u) => u.role === 'admin').length,
            }
          } catch {
            return {
              festival: fest,
              totalCollection: 0,
              totalExpenses: 0,
              netBalance: 0,
              donorCount: 0,
              volunteerCount: 0,
              adminCount: 0,
            }
          }
        })
      )
      setSummaries(summaryList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [allFestivals])

  const grandTotalCollection = summaries.reduce((s, c) => s + c.totalCollection, 0)
  const grandTotalExpenses = summaries.reduce((s, c) => s + c.totalExpenses, 0)
  const grandTotalBalance = grandTotalCollection - grandTotalExpenses
  const grandTotalDonors = summaries.reduce((s, c) => s + c.donorCount, 0)
  const grandTotalVolunteers = summaries.reduce((s, c) => s + c.volunteerCount, 0)

  const handleCreateCommittee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newForm.committeeName.trim()) {
      toast.error('Committee Name is required')
      return
    }
    if (!user) return

    setCreateLoading(true)
    try {
      const name = newForm.name.trim() || newForm.committeeName.trim()
      await createAndSwitch({
        name,
        committeeName: newForm.committeeName.trim(),
        festivalYear: newForm.festivalYear || '2026',
        targetAmount: parseFloat(newForm.targetAmount) || 0,
        logo: newLogo !== '/logo.jpg' ? newLogo : undefined,
        upiId: newForm.upiId.trim() || undefined,
        upiPayeeName: newForm.upiPayeeName.trim() || newForm.committeeName.trim(),
        address: newForm.address.trim() || undefined,
        contactNumber: newForm.contactNumber.trim() || undefined,
        createdBy: user.uid,
      })

      toast.success(`🎉 ${newForm.committeeName} created and activated!`)
      setCreateModalOpen(false)
      setNewLogo('/logo.jpg')
      setNewForm({
        name: '',
        committeeName: '',
        festivalYear: '2026',
        targetAmount: '500000',
        upiId: '',
        upiPayeeName: '',
        address: '',
        contactNumber: '',
      })
      await loadData()
    } catch {
      toast.error('Failed to create committee')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteFestival(deleteTarget.id)
      toast.success(`${deleteTarget.committeeName} removed`)
      setDeleteTarget(null)
      await refreshFestival()
      await loadData()
    } catch {
      toast.error('Failed to delete committee')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSwitchCommittee = async (fId: string) => {
    await selectFestival(fId)
    toast.success('Switched active committee workspace!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-amber-600 via-saffron-600 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-amber-100">
            <ShieldCheck size={14} /> President Master Command
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Multi-Committee Central Overview
          </h1>
          <p className="text-amber-100 text-xs sm:text-sm max-w-xl">
            Monitor, switch, and control all 10+ Ganesh committees, pandals, collections, and team permissions from one central screen.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-white text-saffron-800 hover:bg-amber-50 font-extrabold shadow-lg"
          icon={<Plus size={18} />}
        >
          Add New Committee / Pandal
        </Button>
      </div>

      {/* Combined Grand KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5 border border-amber-200/80">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Total Combined Collection
          </p>
          <p className="text-2xl sm:text-3xl font-black text-green-700">
            {formatCurrency(grandTotalCollection)}
          </p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <TrendingUp size={12} className="text-green-600" /> Across {summaries.length} Pandals
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 border border-amber-200/80">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Total Combined Expenses
          </p>
          <p className="text-2xl sm:text-3xl font-black text-red-600">
            {formatCurrency(grandTotalExpenses)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Verified with bills</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 border border-amber-200/80">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Combined Net Balance
          </p>
          <p className="text-2xl sm:text-3xl font-black text-amber-900">
            {formatCurrency(grandTotalBalance)}
          </p>
          <p className="text-xs text-green-600 font-semibold mt-1">Available in funds</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 border border-amber-200/80">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Total Combined Volunteers
          </p>
          <p className="text-2xl sm:text-3xl font-black text-blue-800">
            {grandTotalVolunteers}
          </p>
          <p className="text-xs text-gray-400 mt-1">{grandTotalDonors} Devotees contributed</p>
        </div>
      </div>

      {/* Committees Grid */}
      <div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
          <Building className="text-saffron-600" size={20} />
          Your Active Committees &amp; Pandals ({summaries.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading multi-committee data...</div>
        ) : summaries.length === 0 ? (
          <EmptyState
            icon={<Building size={36} />}
            title="No Committees Configured"
            message="Create your first committee or pandal to begin multi-committee management."
            action={{
              label: 'Create Committee',
              onClick: () => setCreateModalOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {summaries.map(({ festival: fest, totalCollection, totalExpenses, netBalance, donorCount, volunteerCount, adminCount }) => {
              const isCurrent = festival?.id === fest.id
              const percent = fest.targetAmount > 0 ? Math.min(100, Math.round((totalCollection / fest.targetAmount) * 100)) : 0

              return (
                <div
                  key={fest.id}
                  className={`bg-white rounded-3xl p-6 shadow-card border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                    isCurrent
                      ? 'border-saffron-500 ring-4 ring-saffron-400/20 shadow-card-hover'
                      : 'border-gray-200 hover:border-saffron-300'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-saffron-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <CheckCircle size={12} /> Active Workspace
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Committee Header */}
                    <div className="flex items-start gap-3">
                      {fest.logo ? (
                        <img
                          src={fest.logo}
                          alt={fest.committeeName}
                          className="w-12 h-12 rounded-2xl object-cover border border-amber-300 shadow-sm flex-shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-saffron-800 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
                          {fest.committeeName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 pr-6">
                        <h3 className="font-extrabold text-gray-900 text-base leading-tight truncate">
                          {fest.committeeName}
                        </h3>
                        <p className="text-xs text-saffron-700 font-semibold mt-0.5">
                          Festival Year: {fest.festivalYear || '2026'}
                        </p>
                        {fest.address && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-0.5">
                            <MapPin size={11} /> {fest.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Collection Stats Box */}
                    <div className="bg-gradient-to-br from-amber-50/80 to-gold-50/50 rounded-2xl p-4 border border-amber-200/60 space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-600 font-semibold">Total Collection:</span>
                        <span className="text-lg font-black text-green-700">
                          {formatCurrency(totalCollection)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1">
                          <span>Target: {formatCurrency(fest.targetAmount)}</span>
                          <span className="text-saffron-800">{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-saffron-500 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1 border-t border-amber-200/50">
                        <span className="text-gray-500">Expenses: <strong className="text-red-600">{formatCurrency(totalExpenses)}</strong></span>
                        <span className="text-gray-500">Net: <strong className="text-amber-900">{formatCurrency(netBalance)}</strong></span>
                      </div>
                    </div>

                    {/* Team & UPI Summary */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Team Strength</p>
                        <p className="font-extrabold text-gray-800 mt-0.5">
                          {adminCount} Admins • {volunteerCount} Volunteers
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">UPI Status</p>
                        <p className="font-extrabold text-gray-800 mt-0.5 truncate flex items-center gap-1">
                          <QrCode size={12} className={fest.upiId ? 'text-green-600' : 'text-gray-400'} />
                          {fest.upiId ? fest.upiId : 'Not Configured'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    {isCurrent ? (
                      <span className="text-xs font-bold text-green-700 flex items-center gap-1 py-2">
                        <CheckCircle size={14} /> Managing Now
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<ArrowRight size={14} />}
                        onClick={() => handleSwitchCommittee(fest.id)}
                      >
                        Switch to Manage
                      </Button>
                    )}

                    {summaries.length > 1 && !isCurrent && (
                      <button
                        onClick={() => setDeleteTarget(fest)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Committee"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create New Committee Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Ganesh Committee / Pandal"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCommittee} loading={createLoading}>
              Create &amp; Switch
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCommittee} className="space-y-4">
          {/* Logo Upload Box */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
            <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-2">
              Pandal Logo / Banner (Optional)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={newLogo}
                  alt="Pandal Logo"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400 bg-white shadow-xs"
                />
                {newLogo !== '/logo.jpg' && (
                  <button
                    type="button"
                    onClick={() => setNewLogo('/logo.jpg')}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow-sm hover:bg-red-700"
                    title="Reset to default"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Upload size={13} />}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-xs"
                >
                  Upload Logo Image
                </Button>
                <p className="text-[10px] text-gray-500 mt-1">
                  Square image (PNG/JPG, max 5MB)
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Committee / Pandal Name *"
            value={newForm.committeeName}
            onChange={(e) => setNewForm((f) => ({ ...f, committeeName: e.target.value }))}
            placeholder="e.g. City Center Ganesh Utsav Samithi"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Festival Year"
              value={newForm.festivalYear}
              onChange={(e) => setNewForm((f) => ({ ...f, festivalYear: e.target.value }))}
              placeholder="2026"
              required
            />
            <Input
              label="Target Chanda Goal (₹)"
              type="number"
              value={newForm.targetAmount}
              onChange={(e) => setNewForm((f) => ({ ...f, targetAmount: e.target.value }))}
              placeholder="500000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Official Bank UPI ID"
              value={newForm.upiId}
              onChange={(e) => setNewForm((f) => ({ ...f, upiId: e.target.value }))}
              placeholder="e.g. committee@sbi"
            />
            <Input
              label="UPI Payee Display Name"
              value={newForm.upiPayeeName}
              onChange={(e) => setNewForm((f) => ({ ...f, upiPayeeName: e.target.value }))}
              placeholder="e.g. Ganesh Utsav Samithi"
            />
          </div>

          <Input
            label="Location / Pandal Address"
            value={newForm.address}
            onChange={(e) => setNewForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="e.g. Sector-4 Main Cross Road"
          />

          <Input
            label="Primary Contact Number"
            type="tel"
            value={newForm.contactNumber}
            onChange={(e) => setNewForm((f) => ({ ...f, contactNumber: e.target.value }))}
            placeholder="e.g. 9876543210"
          />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Committee"
        message={`Are you sure you want to remove ${deleteTarget?.committeeName}? This will detach its workspace.`}
        confirmText="Delete Pandal"
        loading={deleteLoading}
      />
    </div>
  )
}
