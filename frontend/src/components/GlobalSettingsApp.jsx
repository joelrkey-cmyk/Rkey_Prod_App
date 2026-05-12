import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Building2, Landmark, Loader2, Mail, Upload, Trash2, Server, Send, Eye, EyeOff } from 'lucide-react';
import UserManagement from './settings/UserManagement';

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;

const GlobalSettingsApp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null); // base64 data URL
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  const [smtpData, setSmtpData] = useState({
    smtp_server: '',
    smtp_port: '587',
    smtp_encryption: 'auto',
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
    smtp_from_name: '',
  });
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    company_siret: '',
    company_tva: '',
    company_email: '',
    bank_name: '',
    bank_iban: '',
    bank_bic: '',
    bank_titulaire: '',
  });

  useEffect(() => {
    loadSettings();
    loadSignature();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/global-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur chargement');
      const data = await response.json();
      setFormData({
        company_name: data.company_name || '',
        company_address: data.company_address || '',
        company_siret: data.company_siret || '',
        company_tva: data.company_tva || '',
        company_email: data.company_email || '',
        bank_name: data.bank_name || '',
        bank_iban: data.bank_iban || '',
        bank_bic: data.bank_bic || '',
        bank_titulaire: data.bank_titulaire || '',
      });
      setSmtpData({
        smtp_server: data.smtp_server || '',
        smtp_port: data.smtp_port || '587',
        smtp_encryption: data.smtp_encryption || 'auto',
        smtp_user: data.smtp_user || '',
        smtp_password: '',
        smtp_from: data.smtp_from || '',
        smtp_from_name: data.smtp_from_name || '',
      });
      setSmtpPasswordSet(!!data.smtp_password_set);
      setHasSignature(!!data.has_email_signature);
    } catch (error) {
      console.error('Failed to load global settings:', error);
      toast.error('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/global-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, ...smtpData }),
      });
      if (!response.ok) throw new Error('Erreur sauvegarde');
      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Failed to save global settings:', error);
      toast.error('Impossible de sauvegarder les paramètres');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateSmtpField = (field, value) => {
    setSmtpData(prev => ({ ...prev, [field]: value }));
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Veuillez saisir une adresse email de test');
      return;
    }
    try {
      setTestingEmail(true);
      const token = localStorage.getItem('access_token');
      // Save first, then test
      await fetch(`${BACKEND_URL}/api/global-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, ...smtpData }),
      });
      const response = await fetch(`${BACKEND_URL}/api/global-settings/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient: testEmailAddress }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Erreur');
      toast.success(data.message || 'Email de test envoyé !');
    } catch (error) {
      toast.error(error.message || "Échec de l'envoi du test");
    } finally {
      setTestingEmail(false);
    }
  };

  const loadSignature = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/global-settings/email-signature`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.email_signature_image) {
          const imgData = data.email_signature_image;
          const prefix = imgData.startsWith('data:') ? '' : 'data:image/png;base64,';
          setSignatureImage(prefix + imgData);
          setHasSignature(true);
        }
      }
    } catch (error) {
      console.error('Failed to load signature:', error);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingSignature(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Data = evt.target.result;
        setSignatureImage(base64Data);
        
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${BACKEND_URL}/api/global-settings/email-signature`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email_signature_image: base64Data }),
        });
        if (response.ok) {
          setHasSignature(true);
          toast.success('Signature email mise à jour');
        } else {
          throw new Error('Erreur upload');
        }
        setUploadingSignature(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload signature:', error);
      toast.error("Impossible d'enregistrer la signature");
      setUploadingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/global-settings/email-signature`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSignatureImage(null);
        setHasSignature(false);
        toast.success('Signature email supprimée');
      }
    } catch (error) {
      console.error('Failed to delete signature:', error);
      toast.error('Impossible de supprimer la signature');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="border-b bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="hover:bg-orange-50"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" data-testid="page-title">
                  Paramètres Généraux
                </h1>
                <p className="text-gray-600">Configuration globale de l'application</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              data-testid="save-settings-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
                <p className="text-gray-600">Chargement des paramètres...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-slate-200" data-testid="company-info-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Informations de l'entreprise
                  </CardTitle>
                  <CardDescription>
                    Coordonnées de votre entreprise utilisées dans les documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company_name">Nom de l'entreprise</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => updateField('company_name', e.target.value)}
                        placeholder="R'KEY PROD"
                        data-testid="input-company-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_siret">SIRET</Label>
                      <Input
                        id="company_siret"
                        value={formData.company_siret}
                        onChange={(e) => updateField('company_siret', e.target.value)}
                        placeholder="99992355000019"
                        data-testid="input-company-siret"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_tva">N° TVA Intracommunautaire</Label>
                      <Input
                        id="company_tva"
                        value={formData.company_tva}
                        onChange={(e) => updateField('company_tva', e.target.value)}
                        placeholder="FR72999923550"
                        data-testid="input-company-tva"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="company_address">Adresse</Label>
                    <Input
                      id="company_address"
                      value={formData.company_address}
                      onChange={(e) => updateField('company_address', e.target.value)}
                      placeholder="5 rue du Hohlandsbourg, 67390 Marckolsheim"
                      data-testid="input-company-address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company_email">Email</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => updateField('company_email', e.target.value)}
                      placeholder="info@rkey-prod.fr"
                      data-testid="input-company-email"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200" data-testid="bank-info-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-green-600" />
                    Coordonnées bancaires de l'entreprise
                  </CardTitle>
                  <CardDescription>
                    RIB utilisé dans les contrats artistiques (dirigeant et acompte freelance)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name">Nom de la banque</Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) => updateField('bank_name', e.target.value)}
                        placeholder="Tiime"
                        data-testid="input-bank-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bank_titulaire">Titulaire du compte</Label>
                      <Input
                        id="bank_titulaire"
                        value={formData.bank_titulaire}
                        onChange={(e) => updateField('bank_titulaire', e.target.value)}
                        placeholder="R'KEY PROD"
                        data-testid="input-bank-titulaire"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bank_iban">IBAN</Label>
                    <Input
                      id="bank_iban"
                      value={formData.bank_iban}
                      onChange={(e) => updateField('bank_iban', e.target.value)}
                      placeholder="FR76 1679 8000 0100 0192 2357 858"
                      className="font-mono"
                      data-testid="input-bank-iban"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_bic">BIC</Label>
                    <Input
                      id="bank_bic"
                      value={formData.bank_bic}
                      onChange={(e) => updateField('bank_bic', e.target.value)}
                      placeholder="TRZOFR21XXX"
                      className="font-mono"
                      data-testid="input-bank-bic"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <p className="text-amber-800 text-sm">
                      <strong>Utilisation :</strong> Ces coordonnées bancaires sont automatiquement injectées dans les contrats artistiques PDF.
                      Pour les DJ dirigeants, elles servent pour tous les paiements.
                      Pour les DJ freelances, elles servent uniquement pour l'acompte.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200" data-testid="email-signature-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-orange-600" />
                    Signature des emails
                  </CardTitle>
                  <CardDescription>
                    Image ajoutée automatiquement en signature dans tous les emails envoyés (devis, contrats, location)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {signatureImage ? (
                    <div className="space-y-3">
                      <div className="border border-slate-200 rounded-lg p-4 bg-white">
                        <img
                          src={signatureImage}
                          alt="Signature email"
                          className="max-w-[280px] h-auto"
                          data-testid="signature-preview"
                        />
                      </div>
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('signature-upload-replace').click()}
                            disabled={uploadingSignature}
                            data-testid="replace-signature-btn"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Remplacer
                          </Button>
                          <input
                            id="signature-upload-replace"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleSignatureUpload}
                          />
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteSignature}
                          className="text-red-600 hover:bg-red-50"
                          data-testid="delete-signature-btn"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <Mail className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                      <p className="text-slate-600 mb-3">Aucune signature configurée</p>
                      <label className="cursor-pointer">
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('signature-upload').click()}
                          disabled={uploadingSignature}
                          data-testid="upload-signature-btn"
                        >
                          {uploadingSignature ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Choisir une image
                        </Button>
                        <input
                          id="signature-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleSignatureUpload}
                        />
                      </label>
                      <p className="text-xs text-slate-500 mt-2">PNG, JPG ou WEBP recommandé</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SMTP Configuration */}
              <Card className="border-slate-200" data-testid="smtp-config-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-600" />
                    Configuration Email SMTP
                  </CardTitle>
                  <CardDescription>
                    Paramètres du serveur d'envoi d'emails (devis, contrats, location, formulaires)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="smtp_server">Serveur SMTP</Label>
                      <Input
                        id="smtp_server"
                        value={smtpData.smtp_server}
                        onChange={(e) => updateSmtpField('smtp_server', e.target.value)}
                        placeholder="mail.webador.com"
                        data-testid="input-smtp-server"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp_port">Port SMTP</Label>
                      <Input
                        id="smtp_port"
                        value={smtpData.smtp_port}
                        onChange={(e) => updateSmtpField('smtp_port', e.target.value)}
                        placeholder="587"
                        data-testid="input-smtp-port"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp_encryption">Chiffrement</Label>
                      <select
                        id="smtp_encryption"
                        value={smtpData.smtp_encryption}
                        onChange={(e) => updateSmtpField('smtp_encryption', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        data-testid="select-smtp-encryption"
                      >
                        <option value="auto">Auto (selon le port)</option>
                        <option value="ssl">SSL (port 465)</option>
                        <option value="tls">STARTTLS (port 587)</option>
                        <option value="none">Aucun</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp_user">Utilisateur SMTP</Label>
                      <Input
                        id="smtp_user"
                        value={smtpData.smtp_user}
                        onChange={(e) => updateSmtpField('smtp_user', e.target.value)}
                        placeholder="info@rkey-prod.fr"
                        data-testid="input-smtp-user"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp_password">Mot de passe SMTP</Label>
                      <div className="relative">
                        <Input
                          id="smtp_password"
                          type={showSmtpPassword ? 'text' : 'password'}
                          value={smtpData.smtp_password}
                          onChange={(e) => updateSmtpField('smtp_password', e.target.value)}
                          placeholder={smtpPasswordSet ? '••••••••  (déjà configuré)' : 'Mot de passe'}
                          data-testid="input-smtp-password"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          data-testid="toggle-smtp-password"
                        >
                          {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp_from">Adresse d'expédition (From)</Label>
                      <Input
                        id="smtp_from"
                        type="email"
                        value={smtpData.smtp_from}
                        onChange={(e) => updateSmtpField('smtp_from', e.target.value)}
                        placeholder="info@rkey-prod.fr"
                        data-testid="input-smtp-from"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp_from_name">Nom d'expéditeur</Label>
                      <Input
                        id="smtp_from_name"
                        value={smtpData.smtp_from_name}
                        onChange={(e) => updateSmtpField('smtp_from_name', e.target.value)}
                        placeholder="R'KEY PROD"
                        data-testid="input-smtp-from-name"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Tester la configuration</Label>
                    <div className="flex gap-2">
                      <Input
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="Adresse email de test"
                        type="email"
                        className="flex-1"
                        data-testid="input-test-email"
                      />
                      <Button
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                        variant="outline"
                        className="border-indigo-400 text-indigo-600 hover:bg-indigo-50 shrink-0"
                        data-testid="send-test-email-btn"
                      >
                        {testingEmail ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Envoyer un test
                      </Button>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-indigo-800 text-sm">
                      <strong>Utilisation :</strong> Ces paramètres sont utilisés par toutes les applications qui envoient des emails : Contrats artistiques, Devis, Location matériel, Formulaires.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* User Management */}
              <UserManagement />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSettingsApp;
