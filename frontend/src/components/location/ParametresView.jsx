// ParametresView - Module Location
import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FileText, Send, Package } from 'lucide-react';
import { toast } from 'sonner';
import { BACKEND_URL, axios } from './helpers';

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['clean']
  ],
};
const quillFormats = ['bold', 'italic', 'underline', 'list', 'bullet'];

function ParametresView() {
  const API_URL = `${BACKEND_URL}/api`;

  // CGV
  const [cgv, setCgv] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Withdrawal email template
  const [withdrawalEmailSubject, setWithdrawalEmailSubject] = useState('');
  const [withdrawalEmailBody, setWithdrawalEmailBody] = useState('');
  const [isSavingWithdrawalEmail, setIsSavingWithdrawalEmail] = useState(false);

  // Return email template
  const [returnEmailSubject, setReturnEmailSubject] = useState('');
  const [returnEmailBody, setReturnEmailBody] = useState('');
  const [isSavingReturnEmail, setIsSavingReturnEmail] = useState(false);

  useEffect(() => {
    fetchCGV();
    fetchWithdrawalEmailTemplate();
    fetchReturnEmailTemplate();
  }, []);

  const fetchCGV = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/location/settings/cgv`);
      setCgv(response.data.cgv || getDefaultCGV());
    } catch (error) {
      console.error('Error fetching CGV:', error);
      setCgv(getDefaultCGV());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWithdrawalEmailTemplate = async () => {
    try {
      const response = await axios.get(`${API_URL}/rental/settings/withdrawal-email`);
      setWithdrawalEmailSubject(response.data.subject || '');
      setWithdrawalEmailBody(response.data.body || '');
    } catch (error) {
      console.error('Error fetching withdrawal email template:', error);
    }
  };

  const fetchReturnEmailTemplate = async () => {
    try {
      const response = await axios.get(`${API_URL}/rental/settings/return-email`);
      setReturnEmailSubject(response.data.subject || '');
      setReturnEmailBody(response.data.body || '');
    } catch (error) {
      console.error('Error fetching return email template:', error);
    }
  };

  const saveCGV = async () => {
    try {
      setIsSaving(true);
      await axios.post(`${API_URL}/location/settings/cgv`, { cgv });
      toast.success('Conditions Générales de Vente enregistrées avec succès !');
    } catch (error) {
      console.error('Error saving CGV:', error);
      toast.error("Erreur lors de l'enregistrement des CGV");
    } finally {
      setIsSaving(false);
    }
  };

  const saveWithdrawalEmailTemplate = async () => {
    try {
      setIsSavingWithdrawalEmail(true);
      await axios.post(`${API_URL}/rental/settings/withdrawal-email`, {
        subject: withdrawalEmailSubject,
        body: withdrawalEmailBody,
      });
      toast.success('Template email de retrait enregistré !');
    } catch (error) {
      console.error('Error saving withdrawal email:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSavingWithdrawalEmail(false);
    }
  };

  const saveReturnEmailTemplate = async () => {
    try {
      setIsSavingReturnEmail(true);
      await axios.post(`${API_URL}/rental/settings/return-email`, {
        subject: returnEmailSubject,
        body: returnEmailBody,
      });
      toast.success('Template email de retour enregistré !');
    } catch (error) {
      console.error('Error saving return email:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSavingReturnEmail(false);
    }
  };

  const getDefaultCGV = () => {
    return `CONDITIONS GÉNÉRALES DE LOCATION DE MATÉRIEL

Article 1 - Objet
Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre R'KEY PROD, ci-après dénommée "le Loueur", et toute personne physique ou morale, ci-après dénommée "le Locataire", louant du matériel audiovisuel.

Article 2 - Réservation
La réservation du matériel se fait par devis signé. Un acompte de 50% du montant total peut être demandé pour confirmer la réservation.

Article 3 - Tarifs
Les tarifs sont indiqués en euros TTC. Ils comprennent la location du matériel pour la durée convenue. Toute journée supplémentaire entamée est facturée.

Article 4 - Dépôt de garantie
Un dépôt de garantie peut être demandé lors de la remise du matériel. Ce dépôt est restitué après vérification du bon état du matériel au retour. En cas de dégradation ou perte, le montant correspondant aux réparations ou au remplacement sera déduit.

Article 5 - Responsabilités
Le Locataire est responsable du matériel dès sa prise en charge. Il s'engage à l'utiliser conformément à sa destination et à le restituer dans l'état où il l'a reçu. Toute perte, vol ou dégradation engage sa responsabilité financière.

Article 6 - Retard de restitution
Tout retard dans la restitution du matériel entraîne la facturation de jours supplémentaires, calculés au prorata du tarif journalier convenu.

Article 7 - Annulation
Toute annulation doit être notifiée par écrit. Les conditions d'annulation sont les suivantes :
- Plus de 30 jours avant la date : remboursement intégral
- Entre 15 et 30 jours : retenue de 50%
- Moins de 15 jours : aucun remboursement

Article 8 - Assurance
Le matériel loué reste la propriété du Loueur. Le Locataire est tenu de souscrire une assurance couvrant les risques de perte, vol et dégradation, sauf si celle-ci est incluse dans le contrat de location.

Article 9 - Litiges
En cas de litige, les tribunaux compétents sont ceux du ressort du siège social du Loueur.

Article 10 - Acceptation
La signature du bon de retrait vaut acceptation des présentes Conditions Générales de Vente.`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Paramètres</h2>
        <p className="text-gray-600 mt-1">Configuration de l'application Location</p>
      </div>

      {/* CGV Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Conditions Générales de Vente
          </CardTitle>
          <CardDescription>
            Modifiez les conditions générales qui apparaîtront sur les bons de retrait
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Chargement...</div>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={cgv}
                onChange={(e) => setCgv(e.target.value)}
                rows={20}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Entrez vos conditions générales de vente..."
              />
              <div className="flex gap-2">
                <Button onClick={saveCGV} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                  {isSaving ? 'Enregistrement...' : 'Enregistrer les CGV'}
                </Button>
                <Button variant="outline" onClick={() => setCgv(getDefaultCGV())}>
                  Réinitialiser au texte par défaut
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Email Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Email de retrait
          </CardTitle>
          <CardDescription>
            Email envoyé au client avec le bon de retrait signé en pièce jointe lors de la finalisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Objet du mail</Label>
              <Input
                value={withdrawalEmailSubject}
                onChange={(e) => setWithdrawalEmailSubject(e.target.value)}
                placeholder="Bon de retrait - R'KEY PROD"
                className="mt-1"
                data-testid="withdrawal-email-subject"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Corps du message</Label>
              <div className="mt-1 border rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={withdrawalEmailBody}
                  onChange={setWithdrawalEmailBody}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Bonjour, veuillez trouver ci-joint votre bon de retrait..."
                  data-testid="withdrawal-email-body"
                />
              </div>
            </div>
            <Button
              onClick={saveWithdrawalEmailTemplate}
              disabled={isSavingWithdrawalEmail}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="save-withdrawal-email-btn"
            >
              {isSavingWithdrawalEmail ? 'Enregistrement...' : 'Enregistrer le template'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Return Email Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-600" />
            Email de retour
          </CardTitle>
          <CardDescription>
            Email envoyé au client après la restitution du matériel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Objet du mail</Label>
              <Input
                value={returnEmailSubject}
                onChange={(e) => setReturnEmailSubject(e.target.value)}
                placeholder="Confirmation de retour matériel - R'KEY PROD"
                className="mt-1"
                data-testid="return-email-subject"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Corps du message</Label>
              <div className="mt-1 border rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={returnEmailBody}
                  onChange={setReturnEmailBody}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Bonjour, nous vous confirmons le retour du matériel..."
                  data-testid="return-email-body"
                />
              </div>
            </div>
            <Button
              onClick={saveReturnEmailTemplate}
              disabled={isSavingReturnEmail}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="save-return-email-btn"
            >
              {isSavingReturnEmail ? 'Enregistrement...' : 'Enregistrer le template'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ParametresView;
