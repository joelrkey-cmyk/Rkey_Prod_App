import React, { useState } from 'react';
import { Copy, CheckCircle, Code, Eye, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import GoogleReviewsWidget from './GoogleReviewsWidget';
import { useNavigate } from 'react-router-dom';

const EmbedGenerator = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    businessId: '', // Toujours vide pour utiliser R'Key Prod par défaut
    maxWidth: 'none', // Toujours sans limite de largeur
    theme: 'light' // Toujours clair
  });
  const [copied, setCopied] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  // const { toast } = useToast(); // Retiré pour éviter les erreurs DOM

  const generateEmbedCode = () => {
    const baseUrl = 'https://rkeyprodapp.fr';
    
    return `<!-- Widget d'avis Google R'Key Prod -->
<div id="google-reviews-widget"></div>
<script>
(function() {
  // Configuration du widget
  const config = {
    businessId: '${config.businessId}',
    maxWidth: '${config.maxWidth}',
    theme: '${config.theme}',
    containerId: 'google-reviews-widget'
  };
  
  // Chargement du CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '${baseUrl}/api/widget/css';
  document.head.appendChild(link);
  
  // Chargement du script
  const script = document.createElement('script');
  script.src = '${baseUrl}/api/widget/js';
  script.onload = function() {
    if (window.GoogleReviewsWidget) {
      window.GoogleReviewsWidget.init(config);
    }
  };
  document.body.appendChild(script);
})();
</script>`;
  };

  const showNotificationMessage = (message, isSuccess = true) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setNotificationMessage('');
    }, 3000);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode());
      setCopied(true);
      showNotificationMessage("✅ Code copié dans le presse-papiers !");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erreur lors de la copie:", err);
      
      // Fallback : sélectionner le texte manuellement
      try {
        const textArea = document.createElement('textarea');
        textArea.value = generateEmbedCode();
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setCopied(true);
        showNotificationMessage("✅ Code copié (méthode alternative) !");
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Erreur fallback:", fallbackErr);
        showNotificationMessage("⚠️ Impossible de copier. Sélectionnez manuellement le code.", false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Notification React-friendly */}
      {showNotification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          notificationMessage.includes('⚠️') 
            ? 'bg-red-500 text-white' 
            : 'bg-green-500 text-white'
        }`}>
          {notificationMessage}
        </div>
      )}
      {/* Header */}
      <div className="border-b bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="hover:bg-blue-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Widget d'Avis Google
                </h1>
                <p className="text-gray-600">
                  Intégrez facilement vos avis Google sur votre site web
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Configuration */}
          <Card className="border-blue-100 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code size={20} className="text-blue-500" />
                Configuration du Widget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <Tabs defaultValue="embed" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="embed">Code d'intégration</TabsTrigger>
                </TabsList>
                
                <TabsContent value="embed" className="space-y-4">
                  <div className="relative">
                    <Textarea
                      readOnly
                      value={generateEmbedCode()}
                      className="font-mono text-sm h-96 resize-none border-blue-200"
                    />
                    <Button
                      onClick={copyToClipboard}
                      className={`absolute top-2 right-2 transition-all duration-200 ${
                        copied 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      size="sm"
                      variant="default"
                    >
                      {copied ? (
                        <>
                          <CheckCircle size={16} className="mr-1 text-white" />
                          Copié !
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="mr-1" />
                          Copier
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Aperçu */}
          <Card className="border-blue-100 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye size={20} className="text-blue-500" />
                Aperçu en temps réel
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full flex-1">
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 h-full">
                <GoogleReviewsWidget 
                  businessId={null} // Toujours null pour utiliser R'Key Prod par défaut
                  maxWidth="100%" // Toujours pleine largeur
                  theme="light" // Toujours thème clair
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmbedGenerator;