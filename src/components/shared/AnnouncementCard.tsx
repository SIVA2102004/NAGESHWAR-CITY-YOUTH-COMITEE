import React from 'react'
import { Megaphone } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import type { Announcement } from '../../types'

interface Props {
  announcement: Announcement
}

export default function AnnouncementCard({ announcement }: Props) {
  return (
    <div className="bg-gradient-to-r from-saffron-50 to-gold-50 border border-saffron-100 rounded-xl p-4">
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-lg bg-saffron-100 flex items-center justify-center flex-shrink-0">
          <Megaphone className="text-saffron-600" size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">{announcement.title}</h4>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{announcement.content}</p>
          <p className="text-xs text-gray-400 mt-2">
            {formatDate(announcement.createdAt)} • {announcement.createdByName}
          </p>
        </div>
      </div>
    </div>
  )
}
