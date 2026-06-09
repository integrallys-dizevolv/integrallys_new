'use client'

import React from 'react'

interface LogoProps {
  className?: string
  size?: number
  variant?: 'default' | 'white' | 'dark'
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 32,
  variant = 'default'
}) => {
  const bgColor = variant === 'white' ? '#ffffff' : variant === 'dark' ? '#1a1a1a' : 'var(--app-primary)'
  const letterColor = variant === 'white' ? 'var(--app-primary)' : '#ffffff'
  const accentColor = variant === 'white' ? '#002D7A' : '#2563EB'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill={bgColor} />
      <path
        d="M10 8h3v16h-3V8zM19 8h3v16h-3V8z"
        fill={letterColor}
      />
      <circle cx="16" cy="22" r="2" fill={accentColor} />
    </svg>
  )
}

export const LogoWithText: React.FC<LogoProps & { showText?: boolean; textClassName?: string }> = ({
  className = '',
  textClassName = '',
  size = 32,
  variant = 'default',
  showText = true
}) => {
  const textColor = variant === 'white' ? 'text-white' : variant === 'dark' ? 'text-[#1a1a1a]' : 'text-[var(--app-text-primary)]'
  const darkTextColor = variant === 'white' ? 'dark:text-white' : variant === 'dark' ? 'dark:text-[#1a1a1a]' : 'dark:text-white'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={size} variant={variant} />
      {showText && (
        <span className={`font-medium tracking-tight text-lg ${textColor} ${darkTextColor} ${textClassName}`}>
          Integrallys
        </span>
      )}
    </div>
  )
}

export default Logo
