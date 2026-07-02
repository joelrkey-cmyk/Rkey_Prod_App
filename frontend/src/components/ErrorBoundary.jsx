import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    try {
      fetch('/api/log-client-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: error ? error.toString() : 'Unknown error',
          stack: errorInfo ? errorInfo.componentStack : '',
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(err => console.error("Failed to send log-client-error:", err));
    } catch (e) {
      console.error("ErrorBoundary log-client-error catch:", e);
    }
  }

  handleRetry = () => {
    // Reset error state and try to recover
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleReload = () => {
    // Reload the page as a last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Une erreur s'est produite</AlertTitle>
              <AlertDescription>
                L'application a rencontré une erreur inattendue et ne peut pas continuer. 
                Cela peut être dû à un problème temporaire.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
                className="w-full"
              >
                Recharger la page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 bg-gray-100 rounded-lg text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Détails de l'erreur (développement)
                </summary>
                <div className="text-red-600 whitespace-pre-wrap break-all">
                  <strong>Erreur:</strong> {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      <br /><br />
                      <strong>Stack trace:</strong>
                      <pre className="text-xs mt-2 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;