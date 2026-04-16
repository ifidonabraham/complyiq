import React from 'react'
import clsx from 'clsx'
import { Loader } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader className={clsx(
        sizeClasses[size],
        'text-neon-blue animate-spin'
      )} />
      <p className="text-gray-400">{message}</p>
    </div>
  )
}
