// Fonctions de génération PDF pour les contrats
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

// Génération PDF à partir du HTML (capture page par page)
export const generatePDFFromHTML = async (contract, generateContractHTMLFn, loadSignatureImagesFn, options = {}) => {
  const { 
    mode = 'full', 
    filename = null, 
    returnBase64 = false,
    showToast = true 
  } = options;

  try {
    if (showToast) toast.info(`Génération PDF (${mode}) en cours...`, { duration: 3000 });

    // Vérifier html2pdf
    let html2pdfLib;
    try {
      const html2pdfModule = await import('html2pdf.js/dist/html2pdf.bundle.min.js');
      html2pdfLib = html2pdfModule.default || html2pdfModule;
    } catch (importError) {
      console.error('Failed to dynamically import html2pdf:', importError);
      if (showToast) toast.error("Erreur : html2pdf non disponible. Veuillez rafraîchir la page.");
      return null;
    }

    // Vérifier jsPDF
    if (!window.jspdf || !window.jspdf.jsPDF) {
      if (showToast) toast.error("Erreur : jsPDF non disponible. Veuillez rafraîchir la page.");
      return null;
    }

    if (!contract || !contract.client_info || !contract.client_info.name) {
      if (showToast) toast.error("Erreur : Données du contrat manquantes.");
      return null;
    }

    // Précharger les signatures en base64
    const signatures = await loadSignatureImagesFn();

    console.log(`📄 Création du PDF (${mode}) avec capture page par page...`);

    const pdf = new window.jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      precision: 3,
      userUnit: 1.0,
      putOnlyUsedFonts: true
    });

    const pageWidth = 210;
    const margin = 10;
    const availableWidth = pageWidth - (2 * margin);
    const availableHeight = 297 - (2 * margin);

    // Créer un conteneur temporaire
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '794px';
    tempContainer.style.background = 'white';
    tempContainer.style.padding = '20px';
    tempContainer.innerHTML = generateContractHTMLFn(contract, null, signatures, { mode });

    document.body.appendChild(tempContainer);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Forcer le rafraîchissement des images
    const images = tempContainer.querySelectorAll('img');
    for (let img of images) {
      if (img.src.startsWith('data:')) {
        const src = img.src;
        img.src = '';
        img.src = src;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Pages détectées dynamiquement
    const allPageElements = tempContainer.querySelectorAll('[id^="pdf-page-"]');
    const pageIds = Array.from(allPageElements).map(el => el.id).sort((a, b) => {
      const getPageOrder = (id) => {
        if (id === 'pdf-page-1') return 1;
        if (id === 'pdf-page-2') return 2;
        if (id === 'pdf-page-3') return 3;
        if (id.startsWith('pdf-page-3-')) return 3 + (id.charCodeAt(id.length - 1) - 97) * 0.1;
        if (id === 'pdf-page-cgv') return 999;
        return 998;
      };
      return getPageOrder(a) - getPageOrder(b);
    });

    if (pageIds.length === 0) {
      console.warn("Aucune page détectée pour le mode:", mode);
      document.body.removeChild(tempContainer);
      return null;
    }

    console.log('📄 Pages détectées:', pageIds);
    let pdfPageAdded = false;

    for (let i = 0; i < pageIds.length; i++) {
      const pageElement = tempContainer.querySelector(`#${pageIds[i]}`);

      if (pageElement && pageElement.innerHTML.trim() !== '') {
        console.log(`📸 Capture de la ${pageIds[i]}...`);

        if (pdfPageAdded) {
          pdf.addPage();
        }

        try {
          const canvas = await html2canvas(pageElement, {
            scale: 1.4,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: Math.min(1123, pageElement.scrollHeight),
            logging: false,
            removeContainer: false,
            foreignObjectRendering: false,
            imageTimeout: 0,
            quality: 0.92,
            ignoreElements: function() { return false; }
          });

          const imgWidth = availableWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const imgData = canvas.toDataURL('image/jpeg', 0.88);

          if (imgHeight <= availableHeight) {
            pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
          } else {
            const scaledHeight = availableHeight;
            const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
            pdf.addImage(imgData, 'JPEG', margin, margin, scaledWidth, scaledHeight, undefined, 'FAST');
          }

          pdfPageAdded = true;
        } catch (pageError) {
          console.warn(`⚠️ Erreur capture page ${i + 1}:`, pageError);
        }
      }
    }

    document.body.removeChild(tempContainer);

    if (returnBase64) {
      return pdf.output('datauristring').split(',')[1];
    }

    const cleanName = (contract.client_info.name || 'Client')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const defaultFileName = `Contrat_DJ_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
    const finalFileName = filename || defaultFileName;
    
    pdf.save(finalFileName);

    if (showToast) toast.success("PDF téléchargé !");
    return true;
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    if (showToast) toast.error("Erreur lors de la génération PDF : " + error.message);
    return null;
  }
};

// Récupère le Blob du guide compilé (pour l'aperçu)
export const getCompiledGuideBlob = async (contract, generateContractHTMLFn, loadSignatureImagesFn, selectedPdfIds, apiService) => {
  try {
    let deroulementBase64 = null;
    if (selectedPdfIds.includes('__deroulement_soiree')) {
      deroulementBase64 = await generatePDFFromHTML(contract, generateContractHTMLFn, loadSignatureImagesFn, {
        mode: 'technical-only',
        returnBase64: true,
        showToast: false
      });
    }

    const otherPdfIds = selectedPdfIds.filter(id => id !== '__deroulement_soiree');
    
    if (deroulementBase64 || otherPdfIds.length > 0) {
      const response = await apiService.compileContractGuide({
        deroulement_pdf_base64: deroulementBase64,
        selected_pdf_ids: otherPdfIds
      });

      if (response && response.pdf_base64) {
        const binaryString = window.atob(response.pdf_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: 'application/pdf' });
      }
    }
    return null;
  } catch (error) {
    console.error('Erreur getCompiledGuideBlob:', error);
    return null;
  }
};

// Orchestrateur: Génère les deux PDFs séparés
export const generateContractAndGuide = async (contract, generateContractHTMLFn, loadSignatureImagesFn, selectedPdfIds, apiService) => {
  try {
    toast.info("Préparation de la compilation des documents...", { duration: 5000 });

    // 1. Générer le Contrat Administratif (Page 1 + Page Last)
    const cleanName = (contract.client_info.name || 'Client')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const contractFileName = `CONTRAT_ADMIN_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
    await generatePDFFromHTML(contract, generateContractHTMLFn, loadSignatureImagesFn, { 
      mode: 'contract-only', 
      filename: contractFileName,
      showToast: false 
    });
    toast.success("PDF 1/2 Généré (Contrat Administratif)");

    // 2. Générer le Guide Organisation (Merging avec pdf-lib via backend)
    let deroulementBase64 = null;
    if (selectedPdfIds.includes('__deroulement_soiree')) {
      deroulementBase64 = await generatePDFFromHTML(contract, generateContractHTMLFn, loadSignatureImagesFn, {
        mode: 'technical-only',
        returnBase64: true,
        showToast: false
      });
    }

    const otherPdfIds = selectedPdfIds.filter(id => id !== '__deroulement_soiree');
    
    if (deroulementBase64 || otherPdfIds.length > 0) {
      const response = await apiService.compileContractGuide({
        deroulement_pdf_base64: deroulementBase64,
        selected_pdf_ids: otherPdfIds
      });

      if (response && response.pdf_base64) {
        // Téléchargement du Guide
        const binaryString = window.atob(response.pdf_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `GUIDE_ORGANISATION_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        toast.success("PDF 2/2 Généré (Guide Organisation)");
      }
    } else {
      toast.warning("Aucun document sélectionné pour le Guide Organisation");
    }

    toast.success("Compilation terminée !");
  } catch (error) {
    console.error('Erreur compilation bi-PDF:', error);
    toast.error("Échec de la compilation complète : " + error.message);
  }
};

// Génération PDF avec signature intégrée via html2pdf
export const printContractWithSignature = async (contract, generateContractHTMLFn) => {
  let html2pdfLib;
  try {
    const html2pdfModule = await import('html2pdf.js/dist/html2pdf.bundle.min.js');
    html2pdfLib = html2pdfModule.default || html2pdfModule;
  } catch (importError) {
    console.error('Failed to dynamically import html2pdf:', importError);
    toast.error("Erreur : html2pdf non disponible.");
    return;
  }

  const contractHTML = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <title>Contrat Artistique - R'Key Prod</title>
      <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: Arial, 'Noto Color Emoji', Helvetica, sans-serif; font-size: 11px; line-height: 1.2; color: #000; margin: 0; padding: 0; width: 180mm; }
          .section { margin: 10pt 0; clear: both; page-break-inside: avoid; }
          .section-title { background-color: #f0f0f0; padding: 6pt 8pt; font-weight: bold; font-size: 12px; border-left: 4px solid #FF6B00; margin-bottom: 10pt; page-break-after: avoid; }
          .header { margin-bottom: 15pt; page-break-after: avoid; }
          .header-content { display: flex; justify-content: space-between; align-items: flex-start; }
          .header-left { flex: 1; }
          .header-right { flex: 1; text-align: right; font-size: 10px; }
          .company-name { font-size: 18px; font-weight: bold; color: #FF6B00; margin-bottom: 4pt; }
          .company-tagline { font-size: 11px; font-weight: bold; margin-bottom: 6pt; }
          .company-address { font-size: 9px; line-height: 1.3; }
          .contract-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15pt 0; padding: 8pt; background-color: #f8f9fa; border: 1pt solid #dee2e6; }
          .two-columns { display: flex; gap: 15pt; margin-bottom: 15pt; }
          .column-left, .column-right { flex: 1; }
          .info-item { margin-bottom: 4pt; font-size: 10px; }
          .info-label { font-weight: bold; display: inline-block; width: 80pt; }
          .compact-pricing-table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10px; }
          .compact-pricing-table th, .compact-pricing-table td { border: 1pt solid #ddd; padding: 6pt 8pt; text-align: left; }
          .compact-pricing-table th { background-color: #f8f9fa; font-weight: bold; }
          .compact-pricing-table td:last-child { text-align: right; font-weight: bold; }
          .compact-pricing-total { background-color: #fff3cd; font-weight: bold; }
          .compact-payment-box { border: 1pt solid #ddd; padding: 10pt; background-color: #f8f9fa; margin: 8pt 0; }
          .payment-amounts { display: flex; justify-content: space-between; gap: 15pt; }
          .payment-left, .payment-right { flex: 1; text-align: center; }
          .amount-big { font-size: 14px; font-weight: bold; color: #FF6B00; }
          .signatures { display: flex; justify-content: space-between; gap: 15pt; margin-top: 20pt; }
          .signature-left, .signature-right { flex: 1; text-align: center; border: 1pt solid #ccc; padding: 15pt; min-height: 60pt; }
          .clearfix::after { content: ""; display: table; clear: both; }
          .notes-section { font-size: 9px; line-height: 1.4; text-align: justify; }
          .technical-note { margin-bottom: 12pt; padding: 8pt; background-color: #f8f9fa; border-left: 3px solid #FF6B00; font-size: 9px; line-height: 1.3; }
          .technical-note strong { font-size: 10px; color: #FF6B00; display: block; margin-bottom: 4pt; }
          .event-schedule-table table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 9px; }
          .event-schedule-table td { border: 1pt solid #ccc; padding: 6pt; text-align: center; background-color: #ffffff; }
          .paraphe-page { position: relative; min-height: 270mm; page-break-after: always; }
          .paraphe-box { position: absolute; bottom: 15mm; right: 15mm; font-size: 10px; color: #d0d0d0; border: 1px solid #d0d0d0; padding: 2px 4px; background-color: white; }
      </style>
  </head>
  <body>
      ${generateContractHTMLFn(contract, null)}
  </body>
  </html>
  `;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = contractHTML;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  document.body.appendChild(tempDiv);

  const options = {
    margin: 0,
    filename: `Contrat_DJ_${contract.client_info.name.replace(/\s+/g, '_')}_SIGNE_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.92 },
    html2canvas: { scale: 1.4, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
  };

  html2pdfLib()
    .set(options)
    .from(tempDiv)
    .save()
    .then(() => {
      document.body.removeChild(tempDiv);
      toast.success("Contrat avec signature téléchargé !");
    })
    .catch((error) => {
      console.error('Erreur génération PDF:', error);
      document.body.removeChild(tempDiv);
      toast.error("Erreur lors de la génération du PDF avec signature");
    });
};
