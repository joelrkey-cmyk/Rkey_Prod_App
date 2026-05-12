import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Met à jour le state pour afficher l'UI d'erreur au prochain rendu
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Capture les détails de l'erreur
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Interface d'erreur personnalisée
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <Card className="max-w-lg mx-auto border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Oops ! Une erreur s'est produite</CardTitle>
              <CardDescription>
                L'application a rencontré un problème inattendu. Cela peut arriver parfois.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Que pouvez-vous faire ?</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Actualiser la page</li>
                  <li>• Vérifier votre connexion internet</li>
                  <li>• Réessayer dans quelques instants</li>
                </ul>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser la page
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  Retour à l'accueil
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer">
                    Détails techniques (développement)
                  </summary>
                  <div className="mt-2 p-3 bg-red-50 rounded text-xs text-red-700 overflow-auto">
                    <div className="font-mono">
                      {this.state.error && this.state.error.toString()}
                    </div>
                    {this.state.errorInfo && (
                      <div className="mt-2 font-mono whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;