// ParametresView - Module Location
import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FileText, Send, Package, Database, Activity, RefreshCw } from 'lucide-react';
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

  // GCS configuration & diagnostics states
  const [gcsUseDirectUrls, setGcsUseDirectUrls] = useState(false);
  const [isSavingGcs, setIsSavingGcs] = useState(false);
  const [gcsDiag, setGcsDiag] = useState(null);
  const [isGcsDiagLoading, setIsGcsDiagLoading] = useState(false);

  useEffect(() => {
    fetchCGV();
    fetchWithdrawalEmailTemplate();
    fetchReturnEmailTemplate();
    fetchGcsSettingsLocal();
  }, []);

  const fetchGcsSettingsLocal = async () => {
    try {
      const response = await axios.get(`${API_URL}/location/settings/gcs`);
      setGcsUseDirectUrls(response.data.gcs_use_direct_urls || false);
    } catch (error) {
      console.error('Error loading GCS settings:', error);
    }
  };

  const saveGcsSettings = async () => {
    try {
      setIsSavingGcs(true);
      const response = await axios.post(`${API_URL}/location/settings/gcs`, {
        gcs_use_direct_urls: gcsUseDirectUrls
      });
      if (response.data.success) {
        localStorage.setItem('gcs_use_direct_urls', gcsUseDirectUrls ? 'true' : 'false');
        toast.success(gcsUseDirectUrls ? 'Chargement direct Cloud Storage activé !' : 'Chargement standard via Proxy Backend activé.');
      }
    } catch (error) {
      console.error('Error saving GCS settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres GCS');
    } finally {
      setIsSavingGcs(false);
    }
  };

  const runGcsDiagnostic = async () => {
    try {
      setIsGcsDiagLoading(true);
      setGcsDiag(null);
      toast.info('Lancement du diagnostic en direct...');
      const response = await axios.get(`${API_URL}/location/gcs-diagnostic`);
      setGcsDiag(response.data);
      if (response.data.connection_test?.success) {
        toast.success('Le serveur communique parfaitement avec Google Cloud Storage !');
      } else {
        toast.error('Une anomalie a été identifiée pendant le diagnostic de connexion.');
      }
    } catch (error) {
      console.error('Error running GCS diagnostic:', error);
      toast.error('Impossible d\'exécuter le diagnostic');
    } finally {
      setIsGcsDiagLoading(false);
    }
  };

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

      {/* Google Cloud Storage (GCS) Diagnostics & Settings */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-700" />
            Configuration & Diagnostic Google Cloud Storage (GCS)
          </CardTitle>
          <CardDescription>
            Gérez la manière dont les images du matériel sont chargées et analysez les droits d'accès
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          {/* Direct Private Signed URLs Mode */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-emerald-900 flex items-center gap-2">
              🛡️ Solution Ultime pour Hostinger : Le "Mode Direct Sécurisé (URLs Signées)"
            </h4>
            <p className="text-sm text-emerald-800 leading-relaxed">
              Pour éviter les limites de bande passante et de processus de votre hébergement Hostinger sans compromettre la sécurité, nous avons mis en place le mode <strong>URLs Signées</strong>.
              <br />
              <br />
              En activant cette option, votre serveur va générer localement des liens sécurisés temporaires (durée de validité de 12 heures) de manière instantanée. Le navigateur téléchargera les images <strong>directement depuis les serveurs de Google</strong> de manière ultra rapide, <strong>sans jamais rendre votre bucket public</strong> (aucun besoin de rajouter "allUsers" ou de modifier vos autorisations).
            </p>
            
            <div className="flex items-center space-x-3 pt-2">
              <input
                type="checkbox"
                id="gcs-direct-toggle"
                checked={gcsUseDirectUrls}
                onChange={(e) => setGcsUseDirectUrls(e.target.checked)}
                className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="gcs-direct-toggle" className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                Activer la diffusion directe via URLs Signées (Hautement Sécurisé & Recommandé pour Hostinger)
              </label>
            </div>

            <div className="text-xs text-emerald-900/80 bg-white/70 p-3 rounded-lg border border-emerald-100 space-y-1">
              <p className="font-bold">✨ Avantages de l'approche URLs Signées :</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li><strong>Sécurité maximale :</strong> Vos fichiers restent privés à 100%. Tout accès non signé est refusé.</li>
                <li><strong>Zéro surcharge Hostinger :</strong> Soulage totalement le serveur Node.js des flux d'images lourds.</li>
                <li><strong>Vitesse Google CDN :</strong> Les images se chargent instantanément et sans aucun blocage.</li>
              </ul>
            </div>

            <Button
              onClick={saveGcsSettings}
              disabled={isSavingGcs}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSavingGcs ? 'Enregistrement...' : 'Sauvegarder les paramètres de diffusion'}
            </Button>
          </div>

          {/* Diagnostics Utility */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-slate-800">Outil de Diagnostic en direct</h4>
                <p className="text-xs text-slate-500">Testez si le serveur Hostinger arrive à lire vos identifiants Google Cloud</p>
              </div>
              <Button
                onClick={runGcsDiagnostic}
                disabled={isGcsDiagLoading}
                variant="outline"
                className="border-blue-600 text-blue-700 hover:bg-blue-50"
              >
                {isGcsDiagLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Diagnostic en cours...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Tester la connexion GCS
                  </>
                )}
              </Button>
            </div>

            {/* Diagnostics Results */}
            {gcsDiag && (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-sm font-mono bg-slate-900 text-slate-100 p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="font-bold text-slate-300">📊 RÉSULTAT DU DIAGNOSTIC SERVEUR :</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${gcsDiag.connection_test?.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {gcsDiag.connection_test?.success ? 'RÉUSSI' : 'ÉCHEC'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Variables détectées :</span>
                    <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-300">
                      <li>GOOGLE_CREDENTIALS_JSON : {gcsDiag.env?.GOOGLE_CREDENTIALS_JSON_exists ? `✅ Présente (${gcsDiag.env.GOOGLE_CREDENTIALS_JSON_length} octets)` : '❌ Absente'}</li>
                      <li>GOOGLE_CLIENT_EMAIL : {gcsDiag.env?.GOOGLE_CLIENT_EMAIL_exists ? '✅ Présente' : '❌ Absente'}</li>
                      <li>GOOGLE_PRIVATE_KEY : {gcsDiag.env?.GOOGLE_PRIVATE_KEY_exists ? '✅ Présente' : '❌ Absente'}</li>
                    </ul>
                  </div>
                  <div>
                    <span className="text-slate-400">Configuration active :</span>
                    <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-300">
                      <li>Source chargée : <span className="text-yellow-400 font-bold">{gcsDiag.credentials_source || 'Aucune'}</span></li>
                      <li>Projet ID : {gcsDiag.credentials_parsed?.project_id || 'Non configuré'}</li>
                      <li>Email de Service : {gcsDiag.credentials_parsed?.client_email || 'Non configuré'}</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-2 space-y-1 text-xs">
                  <span className="text-slate-400">Test GCS :</span>
                  {gcsDiag.connection_test?.success ? (
                    <p className="text-green-400">
                      ✅ Succès ! Accès validé. {gcsDiag.connection_test.files_found_count} fichiers trouvés dans le Bucket "{gcsDiag.gcs_configuration?.bucket_name}".
                      {gcsDiag.connection_test.sample_files?.length > 0 && (
                        <span className="block text-slate-300 mt-1">Exemple de fichiers : {gcsDiag.connection_test.sample_files.join(', ')}</span>
                      )}
                    </p>
                  ) : (
                    <div className="text-red-400 space-y-1">
                      <p className="font-bold">❌ Erreur lors de l'accès au Bucket "{gcsDiag.gcs_configuration?.bucket_name}" :</p>
                      <p className="bg-red-950/50 p-2 rounded text-red-300 border border-red-900 overflow-x-auto whitespace-pre-wrap text-[10px] leading-tight max-h-[150px]">
                        {gcsDiag.connection_test?.error || 'Erreur inconnue'}
                      </p>
                      <p className="text-slate-300 mt-1">
                        💡 Conseil : Vérifiez que l'adresse email de service ci-dessus a bien le rôle <strong>Storage Admin</strong> ou <strong>Storage Object Admin</strong> sur votre console Google Cloud.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

export default ParametresView;
