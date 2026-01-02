// =============================================================================
// ERROR BOUNDARY - Error handling component for concierge
// =============================================================================

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// -----------------------------------------------------------------------------
// Error Fallback Component
// -----------------------------------------------------------------------------

interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  variant?: 'full' | 'inline' | 'minimal';
}

export function ErrorFallback({ error, resetError, variant = 'full' }: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  // Minimal variant - just an icon and retry button
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 p-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm text-muted-foreground">Something went wrong</span>
        <Button onClick={resetError} variant="ghost" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  // Inline variant - compact error display
  if (variant === 'inline') {
    return (
      <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-destructive">Something went wrong</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-2 mt-3">
              <Button onClick={resetError} variant="outline" size="sm">
                <RefreshCw className="w-3 h-3 mr-1" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full variant - centered error page
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">Oops! Something went wrong</h2>

      <p className="text-muted-foreground max-w-md mb-6">
        We encountered an unexpected error. Don't worry, you can try again or go back to the chat.
      </p>

      {/* Error details in dev mode */}
      {isDev && error && (
        <details className="mb-6 max-w-md w-full text-left">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            Technical details (dev only)
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-32">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      )}

      <div className="flex gap-3">
        <Button onClick={resetError} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          <Home className="w-4 h-4 mr-2" />
          Reload page
        </Button>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-6">
        If this keeps happening, please{' '}
        <button className="text-primary hover:underline">contact support</button>
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// AR-specific Error Fallback
// -----------------------------------------------------------------------------

interface ARErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  onClose?: () => void;
  errorType?: 'camera' | 'mediapipe' | 'generic';
}

export function ARErrorFallback({
  error,
  resetError,
  onClose,
  errorType = 'generic',
}: ARErrorFallbackProps) {
  const getErrorContent = () => {
    switch (errorType) {
      case 'camera':
        return {
          title: 'Camera Access Required',
          description:
            'Please allow camera access to use the AR preview. Check your browser settings.',
          icon: '📷',
        };
      case 'mediapipe':
        return {
          title: 'Body Tracking Unavailable',
          description:
            'We couldn\'t load the body tracking feature. Try the simple preview mode instead.',
          icon: '🎯',
        };
      default:
        return {
          title: 'AR Preview Error',
          description: error?.message || 'Something went wrong with the AR preview.',
          icon: '⚠️',
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-background">
      <div className="text-5xl mb-4">{content.icon}</div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{content.title}</h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">{content.description}</p>

      <div className="flex gap-3">
        <Button onClick={resetError} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
        {onClose && (
          <Button onClick={onClose} variant="outline">
            <MessageCircle className="w-4 h-4 mr-2" />
            Back to chat
          </Button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Error Boundary Class Component
// -----------------------------------------------------------------------------

export class ConciergeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error
    console.error('[ConciergeErrorBoundary] Caught error:', error, errorInfo);

    // Call onError callback
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service in production
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// -----------------------------------------------------------------------------
// Higher-Order Component for error boundary
// -----------------------------------------------------------------------------

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ConciergeErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ConciergeErrorBoundary>
    );
  };
}

// -----------------------------------------------------------------------------
// Export default
// -----------------------------------------------------------------------------

export default ConciergeErrorBoundary;
