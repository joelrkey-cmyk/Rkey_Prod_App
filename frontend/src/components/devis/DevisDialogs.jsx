// Tous les dialogues du module Devis
import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Document, Page } from 'react-pdf';
import {
  FileText, Send, Save, Plus, Loader2, Upload, X, ChevronLeft, ChevronRight, Phone, MessageSquare
} from 'lucide-react';

// ═══════════════════════════════════════════════════════
// PDF Preview Dialog
// ═══════════════════════════════════════════════════════
export const PdfPreviewDialog = ({
  showPreview, setShowPreview,
  pdfPreview, pdfBlobUrl, setPdfBlobUrl,
  numPages, setNumPages,
  currentPage, setCurrentPage,
  eventDate, eventDateType
}) => (
  <Dialog open={showPreview} onOpenChange={(open) => {
    if (!open && pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }
    if (!open) { setNumPages(null); setCurrentPage(1); }
    setShowPreview(open);
  }}>
    <DialogContent className="max-w-4xl max-h-[95vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>Aperçu du PDF</span>
          {numPages && <span className="text-sm font-normal text-gray-500">{numPages} page{numPages > 1 ? 's' : ''}</span>}
        </DialogTitle>
      </DialogHeader>
      <div className="bg-gray-200 rounded overflow-auto" style={{ height: '72vh' }}>
        {pdfPreview ? (
          <Document
            file={`data:application/pdf;base64,${pdfPreview}`}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /><span className="ml-2">Chargement du PDF...</span></div>}
            error={<div className="flex flex-col items-center justify-center h-full text-red-500"><p>Erreur lors du chargement du PDF</p><p className="text-sm text-gray-500 mt-2">Utilisez le bouton "Télécharger" pour voir le fichier</p></div>}
          >
            <div className="flex flex-col items-center gap-4 py-4">
              {numPages && Array.from({ length: numPages }, (_, i) => (
                <div key={i} className="shadow-lg bg-white" style={{ width: 'fit-content' }}>
                  <Page pageNumber={i + 1} renderTextLayer={false} renderAnnotationLayer={false} width={680} />
                </div>
              ))}
            </div>
          </Document>
        ) : (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setShowPreview(false)}>Fermer</Button>
        {pdfPreview && (
          <Button onClick={() => {
            const byteCharacters = atob(pdfPreview);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const formattedDate = eventDateType === 'full' ? eventDate.split('-').reverse().join('') : eventDate;
            link.download = `Devis_RkeyProd_${formattedDate}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
          }} className="bg-orange-500 hover:bg-orange-600">Télécharger le PDF</Button>
        )}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ═══════════════════════════════════════════════════════
// Template Dialog
// ═══════════════════════════════════════════════════════
export const TemplateDialog = ({
  showTemplateDialog, setShowTemplateDialog,
  editingTemplate, templateForm, setTemplateForm,
  saveTemplate, savingTemplate
}) => (
  <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editingTemplate ? 'Modifier le Template' : 'Enregistrer comme template'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="template-name">Nom du template *</Label>
          <Input id="template-name" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} className="mt-1" />
        </div>
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">Contenu qui sera sauvegardé :</p>
          <div className="text-sm text-gray-600">
            <p><strong>Objet :</strong> {templateForm.subject || <span className="italic text-gray-400">(vide)</span>}</p>
            <p><strong>Corps :</strong> {templateForm.body ? <span className="text-green-600">✓ Contenu HTML avec mise en forme</span> : <span className="italic text-gray-400">(vide)</span>}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="template-default" checked={templateForm.is_default} onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_default: checked })} />
          <Label htmlFor="template-default" className="cursor-pointer">Définir comme template par défaut</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Annuler</Button>
        <Button onClick={saveTemplate} disabled={savingTemplate} className="bg-orange-500 hover:bg-orange-600">
          {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Enregistrer
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ═══════════════════════════════════════════════════════
// Edit Page Dialog
// ═══════════════════════════════════════════════════════
export const EditPageDialog = ({ editingPage, setEditingPage, pageForm, setPageForm, savePageEdit }) => (
  <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
    <DialogContent>
      <DialogHeader><DialogTitle>Modifier la page</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label htmlFor="page-label">Nom de la page</Label><Input id="page-label" value={pageForm.label} onChange={(e) => setPageForm({ ...pageForm, label: e.target.value })} className="mt-1" /></div>
        <div>
          <Label>Catégorie</Label>
          <Select value={pageForm.category} onValueChange={(v) => setPageForm({ ...pageForm, category: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="artiste">Artiste</SelectItem><SelectItem value="tarif">Tarif</SelectItem>
              <SelectItem value="option">Option</SelectItem><SelectItem value="photos">Photos</SelectItem>
              <SelectItem value="hypnose">Hypnose</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setEditingPage(null)}>Annuler</Button>
        <Button onClick={savePageEdit} className="bg-orange-500 hover:bg-orange-600"><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ═══════════════════════════════════════════════════════
// Add Page Dialog
// ═══════════════════════════════════════════════════════
export const AddPageDialog = ({
  showAddPageDialog, setShowAddPageDialog,
  pageForm, setPageForm,
  newPageFile, setNewPageFile,
  fileInputRef, handleFileSelect,
  uploadNewPage, uploadingPage
}) => (
  <Dialog open={showAddPageDialog} onOpenChange={setShowAddPageDialog}>
    <DialogContent>
      <DialogHeader><DialogTitle>Ajouter une nouvelle page</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label htmlFor="new-page-label">Nom de la page</Label><Input id="new-page-label" value={pageForm.label} onChange={(e) => setPageForm({ ...pageForm, label: e.target.value })} className="mt-1" /></div>
        <div>
          <Label>Catégorie</Label>
          <Select value={pageForm.category} onValueChange={(v) => setPageForm({ ...pageForm, category: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="artiste">Artiste</SelectItem><SelectItem value="tarif">Tarif</SelectItem>
              <SelectItem value="option">Option</SelectItem><SelectItem value="photos">Photos</SelectItem>
              <SelectItem value="hypnose">Hypnose</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fichier image (PNG ou JPG)</Label>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/png,image/jpeg" className="hidden" />
          <div className="mt-1 flex items-center gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />{newPageFile ? newPageFile.name : 'Sélectionner un fichier'}
            </Button>
            {newPageFile && (<Button variant="ghost" size="sm" onClick={() => setNewPageFile(null)}><X className="w-4 h-4" /></Button>)}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setShowAddPageDialog(false)}>Annuler</Button>
        <Button onClick={uploadNewPage} disabled={uploadingPage || !newPageFile || !pageForm.label} className="bg-green-600 hover:bg-green-700">
          {uploadingPage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Ajouter
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ═══════════════════════════════════════════════════════
// Page Preview Dialog
// ═══════════════════════════════════════════════════════
export const PagePreviewDialog = ({ showPagePreview, setShowPagePreview, pagePreviewData }) => (
  <Dialog open={showPagePreview} onOpenChange={setShowPagePreview}>
    <DialogContent className="max-w-3xl">
      <DialogHeader><DialogTitle>Aperçu : {pagePreviewData?.label}</DialogTitle></DialogHeader>
      <div className="flex justify-center bg-gray-100 rounded p-4 max-h-[70vh] overflow-auto">
        {pagePreviewData?.image_base64 && (
          <img src={`data:image/png;base64,${pagePreviewData.image_base64}`} alt={pagePreviewData.label} className="max-w-full h-auto rounded shadow" />
        )}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setShowPagePreview(false)}>Fermer</Button></DialogFooter>
    </DialogContent>
  </Dialog>
);

// ═══════════════════════════════════════════════════════
// Relance Dialog
// ═══════════════════════════════════════════════════════
export const RelanceDialog = ({
  showRelanceDialog, setShowRelanceDialog,
  selectedQuoteForRelance, setSelectedQuoteForRelance,
  relanceNote, setRelanceNote, addRelance
}) => (
  <Dialog open={showRelanceDialog} onOpenChange={setShowRelanceDialog}>
    <DialogContent>
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-orange-500" />Ajouter une relance</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Email du client</Label><p className="text-sm text-gray-600 mt-1">{selectedQuoteForRelance?.recipient_email}</p></div>
        <div><Label htmlFor="relance-note">Note de relance</Label><Textarea id="relance-note" value={relanceNote} onChange={(e) => setRelanceNote(e.target.value)} placeholder="Ex: Appelé le client, en réflexion..." className="mt-1" rows={3} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setShowRelanceDialog(false); setRelanceNote(''); setSelectedQuoteForRelance(null); }}>Annuler</Button>
        <Button onClick={addRelance} disabled={!relanceNote.trim()} className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Ajouter la relance</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ═══════════════════════════════════════════════════════
// Notes Dialog
// ═══════════════════════════════════════════════════════
export const NotesDialog = ({
  showNotesDialog, setShowNotesDialog,
  selectedQuoteForNotes, setSelectedQuoteForNotes,
  notesText, setNotesText, saveNotes
}) => (
  <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
    <DialogContent>
      <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-orange-500" />Notes</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Email du client</Label><p className="text-sm text-gray-600 mt-1">{selectedQuoteForNotes?.recipient_email}</p></div>
        <div><Label htmlFor="notes-text">Notes personnelles</Label><Textarea id="notes-text" value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Ex: Client intéressé, rappeler après le 15 mars..." className="mt-1" rows={4} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setShowNotesDialog(false); setNotesText(''); setSelectedQuoteForNotes(null); }}>Annuler</Button>
        <Button onClick={saveNotes} className="bg-orange-500 hover:bg-orange-600"><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ═══════════════════════════════════════════════════════
// Manual Quote Dialog
// ═══════════════════════════════════════════════════════
export const ManualQuoteDialog = ({
  showAddManualDialog, setShowAddManualDialog,
  manualQuoteForm, setManualQuoteForm,
  manualQuoteFile, setManualQuoteFile,
  manualFileInputRef,
  addManualQuote, savingManualQuote,
  initialFormValues
}) => (
  <Dialog open={showAddManualDialog} onOpenChange={setShowAddManualDialog}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-orange-500" />Ajouter un devis manuellement</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="manual-email">Email du destinataire <span className="text-red-500">*</span></Label><Input id="manual-email" type="email" value={manualQuoteForm.recipient_email} onChange={(e) => setManualQuoteForm(prev => ({ ...prev, recipient_email: e.target.value }))} placeholder="client@email.com" className="mt-1" /></div>
          <div><Label htmlFor="manual-name">Nom du client</Label><Input id="manual-name" value={manualQuoteForm.recipient_name} onChange={(e) => setManualQuoteForm(prev => ({ ...prev, recipient_name: e.target.value }))} placeholder="Nom ou société" className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="manual-price">Montant</Label><Input id="manual-price" value={manualQuoteForm.price_amount} onChange={(e) => setManualQuoteForm(prev => ({ ...prev, price_amount: e.target.value }))} placeholder="1500" className="mt-1" /></div>
          <div>
            <Label>Type</Label>
            <Select value={manualQuoteForm.price_type} onValueChange={(val) => setManualQuoteForm(prev => ({ ...prev, price_type: val }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="TTC">TTC</SelectItem><SelectItem value="HT">HT</SelectItem><SelectItem value="sans">Sans mention</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div><Label htmlFor="manual-event-date">Date de l'événement</Label><Input id="manual-event-date" type="date" value={manualQuoteForm.event_date} onChange={(e) => setManualQuoteForm(prev => ({ ...prev, event_date: e.target.value }))} className="mt-1" /></div>
        <div><Label htmlFor="manual-notes">Notes</Label><Textarea id="manual-notes" value={manualQuoteForm.notes} onChange={(e) => setManualQuoteForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes sur ce devis..." className="mt-1" rows={2} /></div>
        <div>
          <Label>Fichier joint (PDF, image...)</Label>
          <div className="mt-1 flex items-center gap-2">
            <input type="file" ref={manualFileInputRef} onChange={(e) => setManualQuoteFile(e.target.files[0])} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
            <Button type="button" variant="outline" onClick={() => manualFileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Choisir un fichier</Button>
            {manualQuoteFile && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                <FileText className="w-4 h-4" />{manualQuoteFile.name}
                <button onClick={() => setManualQuoteFile(null)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setShowAddManualDialog(false); setManualQuoteForm(initialFormValues); setManualQuoteFile(null); }}>Annuler</Button>
        <Button onClick={addManualQuote} disabled={!manualQuoteForm.recipient_email.trim() || savingManualQuote} className="bg-orange-500 hover:bg-orange-600">
          {savingManualQuote ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Ajouter au suivi
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
