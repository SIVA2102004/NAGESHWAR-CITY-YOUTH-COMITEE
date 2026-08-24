import React, { useState } from 'react'
import { Copy, Check, Power, Clock, Hash, Edit2, Save, X } from 'lucide-react'
import Badge from '../ui/Badge'
import { formatDate } from '../../utils/formatters'
import { updateInviteCode } from '../../services/inviteCodeService'
import type { InviteCode } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  code:       InviteCode
  onDisable?: (id: string) => void
  onUpdated?: (updatedCode: InviteCode) => void
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active:    'success',
  expired:   'warning',
  disabled:  'danger',
  exhausted: 'default',
}

const typeLabel: Record<string, string> = {
  ADMIN_INVITE:     'Admin',
  VOLUNTEER_INVITE: 'Coordinator',
  MEMBER_INVITE:    'Volunteer',
}

export default function InviteCodeCard({ code, onDisable, onUpdated }: Props) {
  const [copied, setCopied] = useState(false)
  const [editingMaxUses, setEditingMaxUses] = useState(false)
  const [newMax, setNewMax] = useState(String(code.maxUses || 0))
  const [updating, setUpdating] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.code)
      setCopied(true)
      toast.success('Code copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  const handleSaveMaxUses = async () => {
    const val = parseInt(newMax)
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid number (0 for unlimited)')
      return
    }
    setUpdating(true)
    try {
      await updateInviteCode(code.id, { maxUses: val })
      toast.success(`Max uses updated to ${val === 0 ? 'Unlimited (∞)' : val}`)
      code.maxUses = val
      if (val > 0 && code.usedCount >= val) {
        code.status = 'exhausted'
      } else if (code.status === 'exhausted' && (val === 0 || code.usedCount < val)) {
        code.status = 'active'
      }
      setEditingMaxUses(false)
      if (onUpdated) onUpdated(code)
    } catch {
      toast.error('Failed to update max uses')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Code Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono font-bold text-2xl text-saffron-700 tracking-widest">
              {code.code}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-saffron-50 text-gray-400 hover:text-saffron-600 transition-colors"
              title="Copy Code"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
            </button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="saffron">{typeLabel[code.type] || code.type}</Badge>
            <Badge variant={statusVariant[code.status] || 'default'} dot>
              {code.status.charAt(0).toUpperCase() + code.status.slice(1)}
            </Badge>
          </div>

          {/* Meta & Max Uses */}
          <div className="text-xs text-gray-500 space-y-1">
            {code.departmentName && (
              <div className="flex items-center gap-1">
                <Hash size={11} /> Dept: <strong>{code.departmentName}</strong>
              </div>
            )}

            {/* Editable Max Uses Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Hash size={11} /> Uses: <strong>{code.usedCount}</strong> / {code.maxUses === 0 ? '∞ (Unlimited)' : code.maxUses}
              </span>
              
              {!editingMaxUses ? (
                <button
                  type="button"
                  onClick={() => { setNewMax(String(code.maxUses || 0)); setEditingMaxUses(true) }}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline ml-1"
                  title="Change Max Uses"
                >
                  <Edit2 size={11} /> Edit Limit
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg p-1">
                  <span className="text-[10px] text-blue-900 font-bold">Max:</span>
                  <input
                    type="number"
                    min="0"
                    value={newMax}
                    onChange={e => setNewMax(e.target.value)}
                    className="w-14 px-1 py-0.5 text-xs border border-blue-300 rounded bg-white font-bold text-center focus:outline-none"
                    placeholder="0=∞"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveMaxUses}
                    disabled={updating}
                    className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    title="Save Max Uses"
                  >
                    <Save size={11} />
                  </button>
                  <button
                    onClick={() => setEditingMaxUses(false)}
                    className="p-1 rounded text-gray-500 hover:bg-gray-200"
                    title="Cancel"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}
            </div>

            {code.expiresAt && (
              <div className="flex items-center gap-1">
                <Clock size={11} /> Expires: {formatDate(code.expiresAt)}
              </div>
            )}
            <div>Created by: {code.createdByName}</div>
          </div>
        </div>

        {/* Actions */}
        {code.status === 'active' && onDisable && (
          <button
            onClick={() => onDisable(code.id)}
            className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
            title="Disable code"
          >
            <Power size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
