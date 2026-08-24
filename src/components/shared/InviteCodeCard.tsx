import React, { useState } from 'react'
import { Copy, Check, Power, Clock, Hash } from 'lucide-react'
import Badge from '../ui/Badge'
import { formatDate } from '../../utils/formatters'
import type { InviteCode } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  code:       InviteCode
  onDisable?: (id: string) => void
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active:    'success',
  expired:   'warning',
  disabled:  'danger',
  exhausted: 'default',
}

const typeLabel: Record<string, string> = {
  ADMIN_INVITE:     'Admin',
  VOLUNTEER_INVITE: 'Volunteer',
  MEMBER_INVITE:    'Member',
}

export default function InviteCodeCard({ code, onDisable }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.code)
      setCopied(true)
      toast.success('Code copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Code */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono font-bold text-2xl text-saffron-700 tracking-widest">
              {code.code}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-saffron-50 text-gray-400 hover:text-saffron-600 transition-colors"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
            </button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="saffron">{typeLabel[code.type]}</Badge>
            <Badge variant={statusVariant[code.status] || 'default'} dot>
              {code.status.charAt(0).toUpperCase() + code.status.slice(1)}
            </Badge>
          </div>

          {/* Meta */}
          <div className="text-xs text-gray-500 space-y-0.5">
            {code.departmentName && (
              <div className="flex items-center gap-1">
                <Hash size={11} /> Dept: {code.departmentName}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Hash size={11} /> Used: {code.usedCount}/{code.maxUses || '∞'}
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
