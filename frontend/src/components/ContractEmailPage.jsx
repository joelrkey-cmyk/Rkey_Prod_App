import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { 
  Send, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Save,
  Star,
  Loader2,
  FileText,
  Mail,
  XCircle
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import apiService from '../services/api';
import VariableInsertMenu, { VARIABLES } from './VariableInsertMenu';
import { useEmailSignature } from '../hooks/useEmailSignature';

// Quill editor modules configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['image'],
    ['clean']
  ]
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline',
  'color', 'background',
  'list', 'bullet',
  'align',
  'image'
];

// Hardcoded signature removed - now loaded from Global Settings via useEmailSignature hook

const ContractEmailPage = () => {
  const { signatureHtml } = useEmailSignature();
  const location = useLocation();
  const navigate = useNavigate();
  const contractData = location.state?.contractData;
  const contractHTML = location.state?.contractHTML;

  // Email states
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSignature, setEmailSignature] = useState('');

  // Template states
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', is_default: false });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const subjectInputRef = useRef(null);

  // Derive selectedSubmission from contract data for variable replacement
  const selectedSubmission = contractData ? {
    nom: contractData.client_info?.name || '',
    email: contractData.client_info?.email || '',
    telephone: contractData.client_info?.phone || '',
    entreprise: contractData.client_info?.company || '',
    date_evenement: contractData.client_info?.event_date ? (() => {
      const parts = contractData.client_info.event_date.split('-');
      return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : contractData.client_info.event_date;
    })() : '',
    type_evenement: contractData.client_info?.event_type || '',
  } : null;

  // Insert variable at cursor in email body (ReactQuill)
  const handleInsertVariable = (variable) => {
    const quill = document.querySelector('.ql-editor');
    if (quill) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0 && quill.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const textNode = document.createTextNode(variable);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        setEmailBody(quill.innerHTML);
      } else {
        setEmailBody(prev => prev ? prev.replace(/<\/p>(?![\s\S]*<\/p>)/, `${variable}</p>`) : `<p>${variable}</p>`);
      }
    } else {
      setEmailBody(prev => prev ? prev.replace(/<\/p>(?![\s\S]*<\/p>)/, `${variable}</p>`) : `<p>${variable}</p>`);
    }
  };

  // Insert variable at cursor in email subject
  const handleInsertSubjectVariable = (variable) => {
    const input = subjectInputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const current = emailSubject || '';
      const newVal = current.slice(0, start) + variable + current.slice(end);
      setEmailSubject(newVal);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setEmailSubject(prev => prev + variable);
    }
  };

  // Replace variables in text with actual values
  const replaceVariables = (text, data) => {
    if (!text || !data) return text;
    let result = text;
    VARIABLES.forEach(v => {
      const field = v.key.replace(/[{}]/g, '');
      const value = data[field] || '';
      result = result.split(v.key).join(value);
    });
    return result;
  };

  // Initialize form with contract data
  useEffect(() => {
    if (contractData) {
      console.log("Contract Data received:", contractData);
      console.log("Event date from contractData:", contractData.client_info?.event_date);
      setRecipientEmail(contractData.client_info?.email || "");
    }
  }, [contractData]);

  // Fetch templates and apply signature from hook
  useEffect(() => {
    const init = async () => {
      // Fetch templates
      try {
        const response = await apiService.get('/contract-emails/templates');
        setTemplates(response.data.templates || []);
        const defaultTemplate = response.data.templates?.find(t => t.is_default);
        if (defaultTemplate) {
          setEmailSubject(defaultTemplate.subject);
          setEmailBody(defaultTemplate.body + signatureHtml);
        } else {
          setEmailBody(signatureHtml);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        setEmailBody(signatureHtml);
      }
    };
    init();
  }, [signatureHtml]);

  const fetchTemplates = async () => {
    try {
      const response = await apiService.get('/contract-emails/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const applyTemplate = (template) => {
    setEmailSubject(template.subject);
    setEmailBody(template.body + emailSignature);
    toast.success(`Template "${template.name}" appliqué`);
  };

  const openTemplateDialog = (template = null) => {
    if (template) {
      // Mode édition : utiliser les valeurs du template existant
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
        is_default: template.is_default
      });
    } else {
      // Mode création : utiliser l'objet et le corps actuels du formulaire
      setEditingTemplate(null);
      setTemplateForm({ 
        name: '', 
        subject: emailSubject, 
        body: emailBody, 
        is_default: false 
      });
    }
    setShowTemplateDialog(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name) {
      toast.error('Veuillez saisir un nom pour le template');
      return;
    }
    
    // Vérifier qu'il y a du contenu à sauvegarder
    if (!templateForm.subject && !templateForm.body) {
      toast.error('Le template doit avoir un objet ou un corps de message');
      return;
    }

    try {
      setSavingTemplate(true);
      if (editingTemplate) {
        await apiService.put(`/contract-emails/templates/${editingTemplate.id}`, templateForm);
        toast.success('Template mis à jour');
      } else {
        await apiService.post('/contract-emails/templates', templateForm);
        toast.success('Template créé');
      }
      fetchTemplates();
      setShowTemplateDialog(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    
    try {
      await apiService.delete(`/contract-emails/templates/${templateId}`);
      toast.success('Template supprimé');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const sendEmail = async () => {
    if (!recipientEmail) {
      toast.error('Veuillez saisir l\'email du destinataire');
      return;
    }
    if (!emailSubject) {
      toast.error('Veuillez saisir l\'objet du mail');
      return;
    }
    if (!contractHTML) {
      toast.error('Données du contrat manquantes');
      return;
    }

    try {
      setSendingEmail(true);
      toast.info("Génération et envoi du contrat en cours...", { duration: 3000 });

      // Format event date from contract data (DDMMYYYY)
      // The event date is in contractData.client_info.event_date
      let eventDateFormatted = '';
      const eventDate = contractData?.client_info?.event_date;
      console.log("Contract data:", contractData);
      console.log("Event date from contractData:", eventDate);
      
      if (eventDate && eventDate.trim() !== '') {
        try {
          // Parse YYYY-MM-DD format directly to avoid timezone issues
          const parts = eventDate.split('-');
          if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            eventDateFormatted = `${day}${month}${year}`;
          } else {
            // Fallback to Date parsing
            const date = new Date(eventDate);
            if (!isNaN(date.getTime())) {
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              eventDateFormatted = `${day}${month}${year}`;
            }
          }
        } catch (e) {
          console.error("Error parsing event date:", e);
        }
      }
      
      // If still empty, use current date as fallback
      if (!eventDateFormatted) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        eventDateFormatted = `${day}${month}${year}`;
        console.log("Using fallback current date:", eventDateFormatted);
      }
      
      console.log("Final eventDateFormatted:", eventDateFormatted);
      
      const finalSubject = replaceVariables(emailSubject, selectedSubmission);
      const finalBody = replaceVariables(emailBody, selectedSubmission);

      // Generate PDF from contract HTML using html2canvas + jsPDF (same as export)
      toast.info("Génération du PDF en cours...", { duration: 5000 });
      let pdfBase64 = '';
      let pdfFilename = `contrat_RkeyProd_${eventDateFormatted}.pdf`;
      let tempContainer = null;
      try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          throw new Error('jsPDF non disponible');
        }
        
        const pdf = new window.jspdf.jsPDF({
          orientation: 'portrait', unit: 'mm', format: 'a4', compress: true
        });
        const pageWidth = 210;
        const margin = 10;
        const availableWidth = pageWidth - (2 * margin);
        const availableHeight = 297 - (2 * margin);
        
        tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '794px';
        tempContainer.style.background = 'white';
        tempContainer.style.padding = '20px';
        tempContainer.innerHTML = contractHTML;
        document.body.appendChild(tempContainer);
        
        await new Promise(r => setTimeout(r, 1500));
        
        // Detect pages
        const allPages = tempContainer.querySelectorAll('[id^="pdf-page-"]');
        let pdfPageAdded = false;
        
        if (allPages.length > 0) {
          // Multi-page contract
          for (let i = 0; i < allPages.length; i++) {
            const pageEl = allPages[i];
            if (pageEl && pageEl.innerHTML.trim()) {
              if (pdfPageAdded) pdf.addPage();
              try {
                const canvas = await window.html2canvas(pageEl, {
                  scale: 1.4, useCORS: true, allowTaint: true,
                  backgroundColor: '#ffffff', width: 794,
                  height: Math.min(1123, pageEl.scrollHeight),
                  logging: false, removeContainer: false
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.88);
                const imgWidth = availableWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                if (imgHeight <= availableHeight) {
                  pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
                } else {
                  const scaledHeight = availableHeight;
                  const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
                  pdf.addImage(imgData, 'JPEG', margin, margin, scaledWidth, scaledHeight, undefined, 'FAST');
                }
                pdfPageAdded = true;
              } catch (pageErr) {
                console.warn('Capture page error:', pageErr);
              }
            }
          }
        } else {
          // Single block contract
          const canvas = await window.html2canvas(tempContainer, {
            scale: 1.4, useCORS: true, allowTaint: true,
            backgroundColor: '#ffffff', width: 794, logging: false
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.88);
          const imgWidth = availableWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, Math.min(imgHeight, availableHeight), undefined, 'FAST');
        }
        
        pdfBase64 = pdf.output('datauristring').split(',')[1] || '';
        console.log('PDF generated, base64 length:', pdfBase64.length);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        toast.error("Erreur de génération PDF, envoi sans pièce jointe");
      } finally {
        try { if (tempContainer && tempContainer.parentNode) tempContainer.parentNode.removeChild(tempContainer); } catch(e) {}
      }

      const requestData = {
        contract_html: contractHTML,
        client_name: contractData?.client_info?.name || "Client",
        event_date: eventDateFormatted,
        recipient_email: recipientEmail,
        email_subject: finalSubject,
        email_body: finalBody,
        pdf_base64: pdfBase64,
        pdf_filename: pdfFilename
      };

      const response = await apiService.post('/contract-emails/send', requestData);

      if (response.data.success) {
        // Mettre à jour le statut du contrat à "sent" (envoyé)
        if (contractData?.id) {
          try {
            await apiService.put(`/contracts/${contractData.id}/status`, { status: 'sent' });
            console.log('Contract status updated to sent');
          } catch (statusError) {
            console.error('Error updating contract status:', statusError);
            // On ne bloque pas l'envoi si la mise à jour du statut échoue
          }
        }
        
        toast.success(response.data.message);
        // Navigate back to contracts
        navigate('/contracts');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      const errorDetail = error.response?.data?.detail || error.message || 'Erreur lors de l\'envoi de l\'email';
      toast.error(errorDetail);
    } finally {
      setSendingEmail(false);
    }
  };

  // If no contract data, redirect back
  if (!contractData || !contractHTML) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Aucun contrat sélectionné</h2>
              <p className="text-gray-500 mb-6">Veuillez d'abord créer un contrat depuis l'application Contrats DJ.</p>
              <Button onClick={() => navigate('/contracts')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux contrats
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/contracts')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux contrats
          </Button>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-3 text-green-700">
              <div className="p-2 bg-green-100 rounded-lg">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Envoyer le contrat par email</h1>
                <p className="text-sm font-normal text-green-600 mt-1">
                  Le contrat sera généré en PDF et envoyé en pièce jointe
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Contract Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Contrat à envoyer
              </h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Client :</strong> {contractData.client_info?.name || "Non renseigné"}</p>
                <p><strong>Email :</strong> {contractData.client_info?.email || "Non renseigné"}</p>
                {contractData.client_info?.event_date && (
                  <p><strong>Date événement :</strong> {new Date(contractData.client_info.event_date).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            </div>

            {/* Email Configuration */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-600" />
                Configuration de l'email
              </h3>
              
              <div>
                <Label htmlFor="recipient">Email du destinataire *</Label>
                <Input
                  id="recipient"
                  type="email"
                  placeholder=""
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="subject">Objet du mail *</Label>
                  <VariableInsertMenu onInsert={handleInsertSubjectVariable} submissionData={selectedSubmission} />
                </div>
                <Input
                  id="subject"
                  placeholder=""
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Corps du message</Label>
                  <VariableInsertMenu onInsert={handleInsertVariable} submissionData={selectedSubmission} />
                </div>
                <div className="mt-1 bg-white rounded-md border">
                  <ReactQuill
                    theme="snow"
                    value={emailBody}
                    onChange={setEmailBody}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder=""
                    style={{ minHeight: '200px' }}
                  />
                </div>
              </div>

              {/* PDF Filename Display */}
              {contractData && (() => {
                // Format event date for display - using client_info.event_date
                const eventDate = contractData?.client_info?.event_date;
                let dateStr = '';
                
                if (eventDate && eventDate.trim() !== '') {
                  // Parse YYYY-MM-DD format directly to avoid timezone issues
                  const parts = eventDate.split('-');
                  if (parts.length === 3) {
                    dateStr = `${parts[2]}${parts[1]}${parts[0]}`;
                  } else {
                    // Fallback to Date parsing
                    try {
                      const date = new Date(eventDate);
                      if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        dateStr = `${day}${month}${year}`;
                      }
                    } catch (e) {
                      console.error("Error parsing date for display:", e);
                    }
                  }
                }
                
                // Fallback to current date
                if (!dateStr) {
                  const now = new Date();
                  dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
                }
                
                return (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <strong>Pièce jointe :</strong> contrat_RkeyProd_{dateStr}.pdf
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Templates Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Templates Email
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openTemplateDialog()}
                  disabled={!emailSubject && !emailBody}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Enregistrer comme template
                </Button>
              </div>
              
              {templates.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <Star className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">Aucun template. Créez-en un pour gagner du temps !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border"
                    >
                      <div className="flex items-center gap-3">
                        {template.is_default && (
                          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        )}
                        <div>
                          <span className="font-medium">{template.name}</span>
                          <p className="text-sm text-gray-500">{template.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => applyTemplate(template)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Utiliser
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openTemplateDialog(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => navigate('/contracts')}
                size="lg"
              >
                Annuler
              </Button>
              <Button 
                onClick={sendEmail}
                disabled={sendingEmail || !recipientEmail || !emailSubject}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Envoyer le contrat
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le Template' : 'Enregistrer comme template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Nom du template *</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder=""
                className="mt-1"
              />
            </div>
            
            {/* Aperçu du contenu qui sera sauvegardé */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Contenu qui sera sauvegardé :</p>
              <div className="text-sm text-gray-600">
                <p><strong>Objet :</strong> {templateForm.subject || <span className="italic text-gray-400">(vide)</span>}</p>
                <p><strong>Corps :</strong> {templateForm.body ? 
                  <span className="text-green-600">✓ Contenu HTML avec mise en forme</span> : 
                  <span className="italic text-gray-400">(vide)</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="template-default"
                checked={templateForm.is_default}
                onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_default: checked })}
              />
              <Label htmlFor="template-default" className="cursor-pointer">
                Définir comme template par défaut
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={saveTemplate} 
              disabled={savingTemplate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingTemplate ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractEmailPage;
