import React, { forwardRef } from 'react'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
  icon?:    React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, icon, rightIcon, className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          {...props}
          className={`
            w-full px-3 py-2.5 border rounded-lg text-sm transition-all
            focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:border-transparent
            ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
            ${icon     ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            disabled:bg-gray-50 disabled:text-gray-400
            ${className}
          `}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
})

export default Input
