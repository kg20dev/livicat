import { FC, MouseEventHandler } from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  variant?: 'primary' | 'secondary'
  className?: string
  disabled?: boolean
}

export const Button: FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
}) => {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors'
  const variantStyles = variant === 'primary'
    ? 'bg-blue-500 text-white hover:bg-blue-600'
    : 'bg-gray-600 text-white hover:bg-gray-700'
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${disabledStyles} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button
