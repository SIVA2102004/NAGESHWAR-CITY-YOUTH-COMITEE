import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'saffron'

interface Props {
  variant?:  BadgeVariant
  children:  React.ReactNode
  className?: string
  dot?:      boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger:  'bg-red-100 text-red-800',
  info:    'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-700',
  saffron: 'bg-saffron-100 text-saffron-800',
}

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  default: 'bg-gray-400',
  saffron: 'bg-saffron-500',
}

export default function Badge({ variant = 'default', children, className = '', dot }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[variant]}`} />}
      {children}
    </span>
  )
}
