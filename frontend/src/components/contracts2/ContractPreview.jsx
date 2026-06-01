// Onglet Aperçu du contrat PDF - Contrats 2
// Gère 3 modes: Dirigeant (1 contrat), Mandataire (2 docs), Entreprise (1 doc global)
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileText, Download, Send, Building, User, Loader2, RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configuration du worker PDF.js (indispensable pour react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const ContractPreview = ({
  generatedContract,
  generateContractHTMLForPreview,
  onExportPDF,
  onSendEmail,
  // Mandat mode props
  isMandatMode,
  isEntrepriseMode,
  generateMandatHTMLForPreview,
  generateArtisteHTMLForPreview,
  generateEntrepriseHTMLForPreview,
  onExportMandatPDF,
  onExportArtistePDF,
  onExportEntreprisePDF,
  artisteName,
  totalMandat,
  totalArtiste,
  totalEntreprise,
  cachetInterne,
  selectedPdfNotes = [],
  onGetCompiledGuideBlob
}) => {
  const [mandatTab, setMandatTab] = useState('mandat');
  const [standardTab, setStandardTab] = useState('contract');
  const [guidePdfUrl, setGuidePdfUrl] = useState(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    // Generate guide preview when switching to guide tab for the first time or if notes changed
    if ((standardTab === 'guide' || mandatTab === 'guide') && !guidePdfUrl && !isGeneratingGuide) {
      generateGuidePreview();
    }
  }, [standardTab, mandatTab]);

  const generateGuidePreview = async () => {
    if (!onGetCompiledGuideBlob) return;
    setIsGeneratingGuide(true);
    try {
      const blob = await onGetCompiledGuideBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        setGuidePdfUrl(url);
      }
    } catch (err) {
      console.error("Error generating guide preview:", err);
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  if (!generatedContract) {
    return (
      <Card className="shadow-lg" data-testid="contract-preview-card">
        <CardHeader><CardTitle>Aperçu du Contrat PDF</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun contrat généré. Créez un contrat pour voir l'aperçu PDF.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasGuide = selectedPdfNotes && selectedPdfNotes.length > 0;

  // ── MODE DIRIGEANT: 1 seul contrat classique ──
  if (!isMandatMode && !isEntrepriseMode) {
    return (
      <Card className="shadow-lg" data-testid="contract-preview-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Aperçu des Documents
            <Badge className="bg-blue-600 text-white text-xs">Prestation Directe</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs value={standardTab} onValueChange={setStandardTab} className="w-full">
              <TabsList className="grid w-full mb-4 grid-cols-1">
                <TabsTrigger value="contract" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Contrat Administratif</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contract">
                <div
                  className="border border-gray-300 p-6 bg-white rounded-lg"
                  style={{ maxHeight: '600px', overflowY: 'auto', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}
                  data-testid="contract-preview-html"
                  dangerouslySetInnerHTML={{ __html: generateContractHTMLForPreview('contract-only') }}
                />
              </TabsContent>
            </Tabs>

            <div className="text-center space-y-4">
              <div className="flex justify-center gap-4">
                <Button onClick={onExportPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg" data-testid="export-pdf-btn">
                  <Download className="h-5 w-5 mr-2" />Exporter les PDFs
                </Button>
                <Button onClick={onSendEmail} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg" data-testid="send-contract-email-btn">
                  <Send className="h-5 w-5 mr-2" />Envoyer par email
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── MODE ENTREPRISE: 1 seul contrat global R'KEY PROD ──
  if (isEntrepriseMode) {
    const acompte30 = Math.round(totalEntreprise * 0.30 * 100) / 100;
    const solde70 = Math.round((totalEntreprise - acompte30) * 100) / 100;
    return (
      <Card className="shadow-lg" data-testid="contract-preview-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Aperçu du Contrat
            <Badge className="bg-blue-600 text-white text-xs">Mode Entreprise</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Résumé financier */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4" data-testid="flux-financiers-resume">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Résumé financier</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700 font-medium">Total TTC de la prestation :</span>
                  <span className="text-lg font-bold text-blue-700" data-testid="flux-total-entreprise">{totalEntreprise === 0 ? 'OFFERT' : `${totalEntreprise.toFixed(2)} € TTC`}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Acompte à facturer (30%) :</span>
                  <span className="text-sm font-semibold text-green-700">{acompte30.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Solde restant (70%) :</span>
                  <span className="text-sm font-semibold text-slate-700">{solde70.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                  <span className="text-xs text-slate-400">Coût d'achat interne (DJ) :</span>
                  <span className="text-xs text-slate-400" data-testid="flux-cachet-interne">{cachetInterne === 0 ? 'OFFERT' : `${cachetInterne.toFixed(2)} €`}</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="contract" className="w-full">
              <TabsList className="grid w-full mb-4 grid-cols-1">
                <TabsTrigger value="contract" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Contrat Administratif</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contract">
                <div
                  className="border border-blue-200 p-6 bg-white rounded-lg"
                  style={{ maxHeight: '600px', overflowY: 'auto', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}
                  data-testid="entreprise-preview-html"
                  dangerouslySetInnerHTML={{ __html: generateEntrepriseHTMLForPreview() }}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-center gap-4 mt-4">
              <Button onClick={onExportEntreprisePDF} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3" data-testid="export-entreprise-pdf-btn">
                <Download className="h-5 w-5 mr-2" />Télécharger les PDFs
              </Button>
              <Button onClick={onSendEmail} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3" data-testid="send-contract-email-btn">
                <Send className="h-5 w-5 mr-2" />Envoyer par email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── MODE MANDAT: 2 documents séparés ──
  return (
    <Card className="shadow-lg" data-testid="contract-preview-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Aperçu des Documents
          <Badge className="bg-amber-500 text-white text-xs">Mode Mandat</Badge>
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">Deux documents séparés pour la sécurité juridique et fiscale</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Résumé des flux financiers */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4" data-testid="flux-financiers-resume">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Résumé des flux financiers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-600 font-medium">A percevoir par R'KEY PROD (Signature)</p>
                <p className="text-lg font-bold text-orange-800" data-testid="flux-rkey">{totalMandat === 0 ? 'OFFERT' : `${totalMandat.toFixed(2)} € TTC`}</p>
              </div>
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-3">
                <p className="text-xs text-slate-600 font-medium">A percevoir par l'Artiste (Jour J)</p>
                <p className="text-lg font-bold text-slate-800" data-testid="flux-artiste">{totalArtiste === 0 ? 'OFFERT' : `${totalArtiste.toFixed(2)} €`}</p>
              </div>
            </div>
          </div>

          {/* Tabs pour basculer entre les deux documents */}
          <Tabs value={mandatTab} onValueChange={setMandatTab} className="w-full">
            <TabsList className="grid w-full mb-4 grid-cols-2">
              <TabsTrigger value="mandat" className="flex items-center gap-2" data-testid="tab-mandat">
                <Building className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Doc 1 — Mandat R'KEY</span>
              </TabsTrigger>
              <TabsTrigger value="artiste" className="flex items-center gap-2" data-testid="tab-artiste">
                <User className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Doc 2 — Artiste {artisteName || 'DJ'}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mandat">
              <div
                className="border-2 border-orange-200 p-6 bg-white rounded-lg"
                style={{ maxHeight: '600px', overflowY: 'auto', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}
                data-testid="mandat-preview-html"
                dangerouslySetInnerHTML={{ __html: generateMandatHTMLForPreview() }}
              />
              <div className="flex justify-center gap-4 mt-4">
                <Button onClick={onExportMandatPDF} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3" data-testid="export-mandat-pdf-btn">
                  <Download className="h-5 w-5 mr-2" />1. Télécharger Contrat Mandat
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="artiste">
              <div
                className="border-2 border-slate-200 p-6 bg-white rounded-lg"
                style={{ maxHeight: '600px', overflowY: 'auto', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}
                data-testid="artiste-preview-html"
                dangerouslySetInnerHTML={{ __html: generateArtisteHTMLForPreview() }}
              />
              <div className="flex justify-center gap-4 mt-4">
                <Button onClick={onExportArtistePDF} className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3" data-testid="export-artiste-pdf-btn">
                  <Download className="h-5 w-5 mr-2" />2. Télécharger Contrat Artiste
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Send email button */}
          <div className="flex justify-center pt-2">
            <Button onClick={() => onSendEmail(mandatTab)} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg" data-testid="send-contract-email-btn">
              <Send className="h-5 w-5 mr-2" />
              {mandatTab === 'mandat' ? "Envoyer le Contrat Mandat par email" : "Envoyer le Contrat Artiste par email"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
