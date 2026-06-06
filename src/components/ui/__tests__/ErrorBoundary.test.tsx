import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ErrorBoundary from '../ErrorBoundary'

// Component that throws on purpose
function BuggyComponent({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Hello world')).toBeDefined()
  })

  it('catches errors and shows default fallback with retry button', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByText('Test error')).toBeDefined()
    expect(screen.getByRole('button', { name: /try again/i })).toBeDefined()

    spy.mockRestore()
  })

  it('shows custom fallback when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error UI')).toBeDefined()

    spy.mockRestore()
  })

  it('calls onError when catching an error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledTimes(1)

    spy.mockRestore()
  })
})
