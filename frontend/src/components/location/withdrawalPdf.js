// Génération PDF pour les bons de retrait de matériel
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { axios } from './helpers';

import API_BASE_URL from '../../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const ORANGE = [230, 126, 34]; // #e67e22
const DARK = [44, 62, 80];     // #2c3e50
const GRAY = [127, 140, 141];  // #7f8c8d
const LIGHT_ORANGE_BG = [253, 245, 235]; // light orange bg

/**
 * CGV par défaut pour les bons de retrait
 */
export const getDefaultCGV = () => {
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

/**
 * Draw an orange horizontal separator line
 */
function drawSeparator(doc, y, margin, pageWidth) {
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
}

/**
 * Draw page footer with company info
 */
function drawFooter(doc, settings, pageWidth, pageHeight, margin) {
  const footerY = pageHeight - 12;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');

  const bankLine = `${settings.bank_name || 'Tiime'} — IBAN: ${settings.bank_iban || ''} — BIC: ${settings.bank_bic || ''}`;
  doc.text(bankLine, pageWidth / 2, footerY - 0.5, { align: 'center' });

  const legalLine = `SIRET: ${settings.company_siret || ''} — TVA: ${settings.company_tva || 'FR72999923550'} — ${settings.company_email || 'info@rkey-prod.fr'}`;
  doc.text(legalLine, pageWidth / 2, footerY + 3, { align: 'center' });

  doc.setTextColor(0, 0, 0);
}

/**
 * Génère le PDF complet du bon de retrait avec CGV
 */
export const generateWithdrawalPDF = async (withdrawal, clients) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 10;

    // Fetch global settings for footer
    let settings = {};
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/global-settings`);
      settings = data || {};
    } catch (e) { /* use defaults */ }

    // Fetch CGV
    let cgvText = '';
    try {
      const { data: cgvData } = await axios.get(`${BACKEND_URL}/api/location/settings/cgv`);
      cgvText = cgvData.cgv || getDefaultCGV();
    } catch (e) {
      cgvText = getDefaultCGV();
    }

    // ==================== PAGE 1: BON DE RETRAIT ====================

    // ---- ORANGE HEADER BANNER ----
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("BON DE RETRAIT DE MATÉRIEL", pageWidth / 2, 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos = 30;

    // ---- COMPANY (LEFT) | CLIENT (RIGHT) ----
    const colMid = pageWidth / 2;
    const client = clients.find(c => c.id === withdrawal.client_id);

    // Company - left
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text("R'KEY PROD", margin, yPos);
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text("Animation DJ — Location Son & Lumière — Show", margin, yPos);
    let leftY = yPos + 5;
    doc.text(settings.company_address || "5 rue du Hohlandsbourg, 67390 Marckolsheim", margin, leftY); leftY += 4;
    doc.text("Tél: 07 83 55 36 74", margin, leftY); leftY += 4;
    doc.text(settings.company_email || "info@rkey-prod.fr", margin, leftY);

    // Client - right
    let rightY = yPos - 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text("CLIENT", colMid + 5, rightY);
    rightY += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);

    if (client) {
      if (client.company_name) {
        doc.setFont('helvetica', 'bold');
        doc.text(client.company_name, colMid + 5, rightY); rightY += 5;
        doc.setFont('helvetica', 'normal');
      }
      doc.text(client.name || 'N/A', colMid + 5, rightY); rightY += 5;
      doc.setTextColor(...GRAY);
      doc.setFontSize(8);
      if (client.phone) { doc.text(`Tél: ${client.phone}`, colMid + 5, rightY); rightY += 4; }
      if (client.email) { doc.text(client.email, colMid + 5, rightY); rightY += 4; }
      if (client.address) { doc.text(client.address, colMid + 5, rightY); rightY += 4; }
    } else {
      doc.text(withdrawal.client_name || 'N/A', colMid + 5, rightY);
    }

    yPos = Math.max(leftY, rightY) + 8;
    doc.setTextColor(0, 0, 0);

    // ---- ORANGE SEPARATOR ----
    drawSeparator(doc, yPos, margin, pageWidth);
    yPos += 8;

    // ---- INFORMATIONS DE RETRAIT (light orange bg) ----
    const infoBlockHeight = withdrawal.is_trusted_client ? 22 : 26;
    doc.setFillColor(...LIGHT_ORANGE_BG);
    doc.roundedRect(margin, yPos - 2, contentWidth, infoBlockHeight, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ORANGE);
    doc.text("INFORMATIONS DE RETRAIT", margin + 5, yPos + 3);
    yPos += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);

    // Two columns inside info block
    const infoCol1 = margin + 5;
    const infoCol2 = colMid + 5;

    doc.setFont('helvetica', 'bold');
    doc.text("Retiré par:", infoCol1, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(withdrawal.withdrawal_person || 'N/A', infoCol1 + 28, yPos);

    const withdrawalDate = withdrawal.withdrawal_date
      ? new Date(withdrawal.withdrawal_date).toLocaleDateString('fr-FR', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : 'N/A';
    doc.setFont('helvetica', 'bold');
    doc.text("Date de retrait:", infoCol2, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(withdrawalDate, infoCol2 + 32, yPos);
    yPos += 5;

    const depositAmount = withdrawal.is_trusted_client
      ? '0,00€ (Client de confiance)'
      : `${(withdrawal.deposit_amount || 0).toFixed(2)}€`;
    doc.setFont('helvetica', 'bold');
    doc.text("Caution:", infoCol1, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(depositAmount, infoCol1 + 28, yPos);

    if (!withdrawal.is_trusted_client) {
      const paymentMethods = { 'n/a': 'N/A', 'especes': 'Espèces', 'cb': 'CB', 'cheque': 'Chèque', 'virement': 'Virement' };
      doc.setFont('helvetica', 'bold');
      doc.text("Paiement:", infoCol2, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(paymentMethods[withdrawal.deposit_payment_method] || 'N/A', infoCol2 + 32, yPos);
      yPos += 5;
    }

    yPos += 12;

    // ---- PÉRIODE DE LOCATION ----
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ORANGE);
    doc.text("PÉRIODE DE LOCATION", margin, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const startDateStr = new Date(withdrawal.start_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    const endDateStr = new Date(withdrawal.end_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Du ${startDateStr}  au  ${endDateStr}`, margin + 5, yPos);
    yPos += 10;

    // ---- ORANGE SEPARATOR ----
    drawSeparator(doc, yPos, margin, pageWidth);
    yPos += 8;

    // ---- TABLEAU DU MATÉRIEL ----
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ORANGE);
    doc.text("MATÉRIEL LOUÉ", margin, yPos);
    yPos += 6;

    // Table header with orange background
    doc.setFillColor(...ORANGE);
    doc.roundedRect(margin, yPos - 1, contentWidth, 8, 1, 1, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("Équipement", margin + 4, yPos + 4);
    doc.text("Qté", pageWidth - margin - 15, yPos + 4, { align: 'center' });
    yPos += 10;
    doc.setTextColor(...DARK);

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    let isEvenRow = false;

    // Separate regular items from last-minute additions
    const regularItems = (withdrawal.equipment_items || []).filter(item => !item.isLastMinute);
    const lastMinuteItems = (withdrawal.equipment_items || []).filter(item => item.isLastMinute);

    if (regularItems.length > 0) {
      regularItems.forEach((item) => {
        if (yPos > pageHeight - 50) {
          drawFooter(doc, settings, pageWidth, pageHeight, margin);
          doc.addPage();
          yPos = 20;
        }

        // Alternating row backgrounds
        if (isEvenRow) {
          doc.setFillColor(248, 248, 248);
          doc.rect(margin, yPos - 3.5, contentWidth, 7, 'F');
        }
        isEvenRow = !isEvenRow;

        const equipmentName = item.name || item.equipment_name || 'Équipement';
        const reference = item.reference ? ` (Réf: ${item.reference})` : '';
        doc.setTextColor(...DARK);
        doc.text(`${equipmentName}${reference}`, margin + 4, yPos);
        doc.text(`${item.quantity || 1}`, pageWidth - margin - 15, yPos, { align: 'center' });
        yPos += 7;
      });
    } else if (lastMinuteItems.length === 0) {
      doc.text("Aucun équipement", margin + 4, yPos);
      yPos += 7;
    }

    // Last-minute additions section
    if (lastMinuteItems.length > 0) {
      yPos += 3;
      // Sub-header for manual additions
      doc.setFillColor(255, 243, 224);
      doc.roundedRect(margin, yPos - 1, contentWidth, 8, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ORANGE);
      doc.text("MATÉRIEL AJOUTÉ (gratuit)", margin + 4, yPos + 4);
      yPos += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      isEvenRow = false;
      lastMinuteItems.forEach((item) => {
        if (yPos > pageHeight - 50) {
          drawFooter(doc, settings, pageWidth, pageHeight, margin);
          doc.addPage();
          yPos = 20;
        }

        if (isEvenRow) {
          doc.setFillColor(255, 249, 240);
          doc.rect(margin, yPos - 3.5, contentWidth, 7, 'F');
        }
        isEvenRow = !isEvenRow;

        doc.setTextColor(...DARK);
        doc.text(item.name || 'Équipement', margin + 4, yPos);
        doc.text(`${item.quantity || 1}`, pageWidth - margin - 15, yPos, { align: 'center' });
        yPos += 7;
      });
    }

    // Total line
    yPos += 2;
    doc.setFillColor(...ORANGE);
    doc.roundedRect(margin, yPos - 1, contentWidth, 9, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL", margin + 4, yPos + 5);
    doc.text(`${(withdrawal.total_amount || 0).toFixed(2)} €`, pageWidth - margin - 5, yPos + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 18;

    // ---- SIGNATURE ----
    if (yPos > pageHeight - 60) {
      drawFooter(doc, settings, pageWidth, pageHeight, margin);
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ORANGE);
    doc.text("SIGNATURE DU CLIENT", margin, yPos);
    yPos += 3;

    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, 80, 30);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);

    if (withdrawal.withdrawal_signature) {
      try {
        doc.addImage(withdrawal.withdrawal_signature, 'PNG', margin + 2, yPos + 2, 76, 26);
      } catch (error) {
        console.error('Erreur ajout signature:', error);
      }
    }

    yPos += 33;
    // Date and time of finalization
    const finalizeDate = new Date();
    const dateTimeStr = finalizeDate.toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) + ' à ' + finalizeDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRAY);
    doc.text(`Signé le ${dateTimeStr}`, margin, yPos);
    doc.setTextColor(0, 0, 0);

    // ---- FOOTER PAGE 1 ----
    drawFooter(doc, settings, pageWidth, pageHeight, margin);

    // ==================== PAGE 2: CGV ====================
    doc.addPage();
    yPos = 10;

    // Orange banner for CGV title
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("CONDITIONS GÉNÉRALES DE VENTE", pageWidth / 2, 10, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos = 19;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);

    const cgvLines = doc.splitTextToSize(cgvText, contentWidth);
    cgvLines.forEach((line) => {
      if (yPos > pageHeight - 15) {
        drawFooter(doc, settings, pageWidth, pageHeight, margin);
        doc.addPage();
        yPos = 15;
      }
      // Bold for article titles
      if (line.match(/^Article \d+/)) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ORANGE);
        yPos += 1;
      } else if (line.match(/^CONDITIONS/)) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
      }
      doc.text(line, margin, yPos);
      yPos += 3.2;
    });

    // Footer on last CGV page
    drawFooter(doc, settings, pageWidth, pageHeight, margin);

    // Return base64 for email attachment (no download)
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return pdfBase64;

  } catch (error) {
    console.error('Erreur génération PDF:', error);
    toast.error('Erreur lors de la génération du PDF');
    return false;
  }
};
