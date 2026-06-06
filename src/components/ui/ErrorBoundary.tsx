import { Component, type ErrorInfo, type ReactNode } from 'react'

/* ─── Types ──────────────────────────────────────────────────────── */

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/* ─── Component ──────────────────────────────────────────────────── */

/**
 * React Error Boundary that catches rendering errors and shows a fallback UI.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *   <ChatIframe videoId="..." />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl flex flex-col items-center justify-center p-6">
          <span className="material-symbols-outlined text-error text-[48px] mb-4">
            error_outline
          </span>
          <p className="text-body-md text-on-surface font-bold text-center mb-2">
            Something went wrong
          </p>
          <p className="text-label-md text-on-surface-variant text-center mb-6 max-w-[250px]">
            {this.state.error?.message || 'An unexpected error occurred while loading the chat.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="bg-primary text-on-primary py-2 px-6 rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
