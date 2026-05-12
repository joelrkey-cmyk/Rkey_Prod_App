import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  Star
} from 'lucide-react';
import apiService from '../services/api';

const Settings = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    googleReviews: '165 avis positifs',
    satisfactionRate: '100%', // Fixed at 100%
    googleMapsUrl: 'https://g.page/r/CcqoeRuIj8ofEAE/review' // Fixed URL
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await apiService.getSettings();
      setFormData({
        googleReviews: settings.googleReviews || '165 avis positifs',
        satisfactionRate: '100%', // Always fixed at 100%
        googleMapsUrl: 'https://g.page/r/CcqoeRuIj8ofEAE/review' // Always fixed URL
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error("Erreur de chargement", {
        description: "Impossible de charger les paramètres.",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await apiService.updateSettings(formData);
      toast.success("Paramètres sauvegardés", {
        description: "Le nombre d'avis Google a été mis à jour.",
      });
    } catch (error) {
      toast.error("Erreur", {
        description: "Impossible de sauvegarder les paramètres: " + error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <div className="border-b bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="hover:bg-orange-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
                <p className="text-gray-600">Configuration du nombre d'avis Google</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {loading ? (
            <Card className="border-orange-100">
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des paramètres...</p>
              </CardContent>
            </Card>
          ) : (
            <>
          
          {/* Information Notice */}
          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="p-6">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> Le taux de satisfaction est fixé à 100% et le lien des avis Google est configuré automatiquement. Seul le nombre d'avis est paramétrable ici.
              </p>
            </CardContent>
          </Card>

          {/* Client Satisfaction - Common */}
          <Card className="border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500" />
                Satisfaction client
              </CardTitle>
              <CardDescription>
                Paramétrage du nombre d'avis Google affiché dans les devis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="googleReviews">Nombre d'avis Google</Label>
                <Input
                  id="googleReviews"
                  value={formData.googleReviews}
                  onChange={(e) => updateFormData('googleReviews', e.target.value)}
                  placeholder="165 avis positifs"
                  className="border-orange-200 focus:border-orange-400"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Exemple : "165 avis positifs" ou "200+ avis clients satisfaits"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-gray-500">Taux de satisfaction (fixe)</Label>
                  <div className="text-lg font-semibold text-green-600">100% ✓</div>
                  <p className="text-xs text-gray-500">Valeur automatique</p>
                </div>
                <div>
                  <Label className="text-gray-500">Lien avis Google (fixe)</Label>
                  <div className="text-xs text-blue-600 break-all">https://g.page/r/CcqoeRuIj8ofEAE/review</div>
                  <p className="text-xs text-gray-500">URL automatique</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;