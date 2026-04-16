import React from 'react'
import clsx from 'clsx'

interface RatingBadgeProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  verdict?: string | null
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ 
  rating, 
  size = 'md',
  verdict 
}) => {
  const getRatingColor = () => {
    if (rating >= 80) return { bg: 'bg-blue-500', text: 'text-blue-100', label: 'Excellent' }
    if (rating >= 60) return { bg: 'bg-cyan-500', text: 'text-cyan-100', label: 'Good' }
    if (rating >= 40) return { bg: 'bg-amber-500', text: 'text-amber-100', label: 'Fair' }
    if (rating >= 20) return { bg: 'bg-orange-500', text: 'text-orange-100', label: 'Poor' }
    return { bg: 'bg-red-500', text: 'text-red-100', label: 'Critical' }
  }

  const colors = getRatingColor()
  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-20 h-20 text-sm',
    lg: 'w-32 h-32 text-lg',
  }

  return (
    <div className={clsx(
      'flex flex-col items-center justify-center rounded-full font-bold',
      colors.bg,
      colors.text,
      sizeClasses[size],
      'ring-2 ring-offset-2 ring-offset-dark-bg ring-current shadow-glow'
    )}>
      <div>{rating.toFixed(0)}</div>
      {size === 'lg' && <div className="text-xs mt-1">{colors.label}</div>}
    </div>
  )
}
