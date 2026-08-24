import React from 'react'

interface Props {
  children:  React.ReactNode
  className?: string
  hover?:    boolean
  onClick?:  () => void
  padding?:  'none' | 'sm' | 'md' | 'lg'
}

export default function Card({
  children,
  className = '',
  hover,
  onClick,
  padding = 'md',
}: Props) {
  const pads = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl shadow-card
        ${pads[padding]}
        ${hover ? 'hover:shadow-card-hover transition-shadow duration-300' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
