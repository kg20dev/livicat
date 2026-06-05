import { FC, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
}

export const Card: FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-[#151932] rounded-lg shadow-xl p-6 border border-gray-600 ${className}`}>
      {title && <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>}
      {children}
    </div>
  )
}

export default Card
