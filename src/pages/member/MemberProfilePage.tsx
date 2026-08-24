import React from 'react'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function MemberProfilePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Member Profile</h1>
        <p className="text-gray-500 text-sm">Your membership details</p>
      </div>

      <Card className="space-y-4">
        <Input label="Name" value={user?.name || ''} disabled />
        <Input label="Email" value={user?.email || ''} disabled />
        <Input label="Mobile" value={user?.mobile || ''} disabled />
        <Input label="Department" value={user?.departmentName || 'General Member'} disabled />
        <Input label="Role" value={user?.role || 'Member'} disabled />
      </Card>
    </div>
  )
}
