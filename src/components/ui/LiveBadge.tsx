interface LiveBadgeProps {
  label?: string
  className?: string
}

export default function LiveBadge({ label = 'LIVE PREVIEW', className = '' }: LiveBadgeProps) {
  return (
    <div className={`absolute top-4 left-6 flex items-center gap-3 ${className}`}>
      <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-label-md font-bold text-white tracking-widest">{label}</span>
    </div>
  )
}
