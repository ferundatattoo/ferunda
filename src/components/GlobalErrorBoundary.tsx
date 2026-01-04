import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[GlobalErrorBoundary] Fatal error:', error);
    console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  copyErrorDetails = (): void => {
    const { error, errorInfo } = this.state;
    const details = `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(details);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error } = this.state;
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'unknown';

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Algo salió mal
            </h1>

            <p className="text-muted-foreground mb-4">
              Ocurrió un error inesperado. Puedes intentar recargar la página.
            </p>

            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">Ruta: <code>{currentPath}</code></p>
              <p className="text-sm text-destructive font-mono break-words">
                {error?.message || 'Error desconocido'}
              </p>
            </div>

            <div className="flex gap-3 justify-center mb-4">
              <Button onClick={() => window.location.reload()} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recargar
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Inicio
              </Button>
            </div>

            <Button onClick={this.copyErrorDetails} variant="ghost" size="sm" className="text-muted-foreground">
              <Copy className="w-3 h-3 mr-1" />
              Copiar detalles
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
