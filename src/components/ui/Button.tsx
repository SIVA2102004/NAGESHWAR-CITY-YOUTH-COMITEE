import React from 'react'
import LoadingSpinner from './LoadingSpinner'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?:     'sm' | 'md' | 'lg'
  loading?:  boolean
  icon?:     React.ReactNode
  fullWidth?: boolean
}

export default function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  icon,
  fullWidth,
  children,
  className = '',
  disabled,
  ...props
}: Props) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1'

  const variants = {
    primary:   'bg-saffron-600 text-white hover:bg-saffron-700 focus:ring-saffron-500',
    secondary: 'bg-white text-saffron-700 border border-saffron-300 hover:bg-saffron-50 focus:ring-saffron-300',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
    outline:   'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? <LoadingSpinner size="sm" /> : icon}
      {children}
    </button>
  )
}
