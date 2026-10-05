import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button, Panel } from './ui'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Stage error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-6 pt-32">
          <Panel className="p-8 text-center">
            <div className="font-accent text-[11px] uppercase tracking-eyebrow text-txt-faint">
              Something went wrong
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold text-brand-ink">
              This view couldn't render
            </h2>
            <p className="mt-2 text-sm text-txt-muted">
              {this.state.error.message}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => this.setState({ error: null })}>Try again</Button>
              <Button variant="ghost" onClick={() => window.location.assign('/')}>
                Back to start
              </Button>
            </div>
          </Panel>
        </div>
      )
    }
    return this.props.children
  }
}
