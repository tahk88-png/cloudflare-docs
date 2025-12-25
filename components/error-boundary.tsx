"use client"

import { Component, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="container mx-auto px-4 py-12">
          <Alert variant="destructive">
            <AlertTitle>Midagi läks valesti</AlertTitle>
            <AlertDescription className="mt-2">
              {this.state.error?.message || 'Tekkis ootamatu viga. Palun proovi uuesti.'}
            </AlertDescription>
            <Button
              className="mt-4"
              onClick={() => {
                this.setState({ hasError: false, error: undefined })
                window.location.reload()
              }}
            >
              Laadi leht uuesti
            </Button>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}
