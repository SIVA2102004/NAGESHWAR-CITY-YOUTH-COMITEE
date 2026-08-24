import React, { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getUsersByVolunteer } from '../../services/userService'
import EmptyState from '../../components/ui/EmptyState'
import SearchFilter from '../../components/ui/SearchFilter'
import { formatDate } from '../../utils/formatters'
import type { AppUser } from '../../types'

export default function MyMembersPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<AppUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUsersByVolunteer(user.uid)
      .then(setMembers)
      .finally(() => setLoading(false))
  }, [user])

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    return !q || m.name.toLowerCase().includes(q) || m.mobile.includes(q)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">My Volunteers</h1>
        <p className="text-gray-500 text-sm">Volunteers enrolled under your coordination</p>
      </div>

      <SearchFilter value={search} onChange={setSearch} placeholder="Search volunteers..." />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="No volunteers assigned" message="Volunteers who join using your department invite codes will appear here." />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name','Mobile','Email','Department','Joined'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.uid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3 text-gray-600">{m.mobile}</td>
                  <td className="px-4 py-3 text-gray-600">{m.email}</td>
                  <td className="px-4 py-3 text-gray-600">{m.departmentName || '�'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
