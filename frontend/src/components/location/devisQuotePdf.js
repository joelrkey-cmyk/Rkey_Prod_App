// Génération PDF unifiée pour les devis de location
// Gère à la fois les nouveaux devis (lookup équipement) et les devis existants (données enrichies)
import jsPDF from 'jspdf';
import { toast } from 'sonner';

/**
 * Calcule le nombre de jours entre deux dates.
 */
export const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 1 : diffDays;
};

/**
 * Génère un PDF de devis de location.
 * Gère automatiquement les items enrichis (avec equipment_name) ou les items bruts (nécessitant un lookup).
 *
 * @param {Object} quoteData - Les données du devis
 * @param {Array} clients - Liste des clients
 * @param {Array} equipment - Liste des équipements (pour lookup si items non enrichis)
 * @returns {boolean} true si le PDF a été généré avec succès
 */
export const generateQuotePDF = (quoteData, clients, equipment, companySettings = {}, options = {}) => {
  try {
    const { returnBase64 = false } = options;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // En-tête entreprise
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("R'KEY PROD", margin, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("5 rue du Hohlandsbourg", margin, yPos); yPos += 4;
    doc.text("67390 Marckolsheim", margin, yPos); yPos += 4;
    doc.text("Tel: 07 83 55 36 74", margin, yPos); yPos += 4;
    doc.text("Email: info@rkey-prod.fr", margin, yPos); yPos += 12;

    // Titre
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("DEVIS DE LOCATION DE MATÉRIEL", pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const quoteDate = quoteData.created_at 
      ? new Date(quoteData.created_at).toLocaleDateString('fr-FR') 
      : new Date().toLocaleDateString('fr-FR');
    doc.text(`Date: ${quoteDate}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Informations client
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("CLIENT:", margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const client = clients.find(c => c.id === quoteData.client_id);
    if (client) {
      const clientName = client.company_name || client.name;
      doc.text(clientName, margin, yPos); yPos += 5;
      if (client.address) { doc.text(client.address, margin, yPos); yPos += 5; }
      if (client.email || client.phone) {
        doc.text(`${client.email || ''} ${client.email && client.phone ? '- ' : ''}${client.phone || ''}`, margin, yPos);
        yPos += 5;
      }
    } else {
      doc.text("(Devis rapide - sans client)", margin, yPos); yPos += 5;
    }
    yPos += 5;

    // Période de location
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("PÉRIODE DE LOCATION:", margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const startDate = new Date(quoteData.start_date).toLocaleDateString('fr-FR');
    const endDate = new Date(quoteData.end_date).toLocaleDateString('fr-FR');
    const days = quoteData.total_days || calculateDays(quoteData.start_date, quoteData.end_date);
    doc.text(`Du ${startDate} au ${endDate} (${days} jour${days > 1 ? 's' : ''})`, margin, yPos);
    yPos += 10;

    // Tableau du matériel
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const degressionCoef = quoteData.degression_coefficient || 1.0;
    const degressionType = quoteData.degression_type || '';
    const isWeekendTariff = degressionType === 'weekend' || degressionType === 'Weekend';
    
    const colWidths = [80, 15, 25, 20, 30];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], 
                  margin + colWidths[0] + colWidths[1] + colWidths[2],
                  margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]];
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.text("MATÉRIEL", colX[0] + 2, yPos);
    doc.text("QTÉ", colX[1] + 2, yPos);
    doc.text("PRIX/JOUR", colX[2] + 2, yPos);
    doc.text("COEF", colX[3] + 2, yPos);
    doc.text("TOTAL", colX[4] + 2, yPos);
    yPos += 8;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);

    doc.setFont('helvetica', 'normal');
    let subtotal = 0;
    const lineHeight = 7;
    
    const items = quoteData.items || [];
    // Detect if items are pre-enriched (have equipment_name/daily_price) or need lookup
    const isEnriched = items.length > 0 && items[0].equipment_name !== undefined;

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return dateStr;
    };

    if (isEnriched) {
      subtotal = quoteData.subtotal || 0;
      items.forEach((item, index) => {
        const eq = equipment.find(e => e.id === item.equipment_id);
        const hasPackDetails = eq && eq.is_pack && eq.pack_items && eq.pack_items.length > 0;
        let rowHeight = lineHeight;
        let compLines = [];
        
        if (hasPackDetails) {
          const compItems = eq.pack_items.map(packItem => {
            const subEq = equipment.find(e => e.id === packItem.equipment_id);
            return `${packItem.quantity}x ${subEq ? subEq.name : packItem.equipment_id}`;
          }).join(', ');
          const compText = `Composition du pack : ${compItems}`;
          doc.setFontSize(6);
          doc.setFont('helvetica', 'italic');
          compLines = doc.splitTextToSize(compText, colWidths[0] - 4);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          rowHeight += compLines.length * 3;
        }

        if (yPos + rowHeight > 270) { doc.addPage(); yPos = 20; }
        
        const itemCoef = item.degression_coefficient || degressionCoef;
        const lineTotal = item.total_price || ((item.daily_price || 0) * item.quantity * itemCoef);
        
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos - 4, pageWidth - 2 * margin, rowHeight, 'F');
        }
        
        let displayName = item.equipment_name || 'N/A';
        if (item.start_date && item.end_date) {
          displayName += ` (${formatDate(item.start_date)} au ${formatDate(item.end_date)})`;
        }
        
        doc.text(displayName.substring(0, 48), colX[0] + 2, yPos);
        doc.text(item.quantity.toString(), colX[1] + 2, yPos);
        doc.text(`${(item.daily_price || 0).toFixed(2)}€`, colX[2] + 2, yPos);
        doc.text(`x${itemCoef.toFixed(2)}`, colX[3] + 2, yPos);
        doc.text(`${lineTotal.toFixed(2)}€`, colX[4] + 2, yPos);

        if (hasPackDetails) {
          doc.setFontSize(6);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'italic');
          compLines.forEach((line, lIdx) => {
            doc.text(line, colX[0] + 2, yPos + 3.2 + (lIdx * 3));
          });
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
        }

        yPos += rowHeight;
      });
    } else {
      items.forEach((item, index) => {
        const eq = equipment.find(e => e.id === item.equipment_id);
        if (eq) {
          const itemCoef = item.degression_coefficient || degressionCoef;
          const lineTotal = eq.daily_price * item.quantity * itemCoef;
          subtotal += lineTotal;
          
          const hasPackDetails = eq.is_pack && eq.pack_items && eq.pack_items.length > 0;
          let rowHeight = lineHeight;
          let compLines = [];
          
          if (hasPackDetails) {
            const compItems = eq.pack_items.map(packItem => {
              const subEq = equipment.find(e => e.id === packItem.equipment_id);
              return `${packItem.quantity}x ${subEq ? subEq.name : packItem.equipment_id}`;
            }).join(', ');
            const compText = `Composition du pack : ${compItems}`;
            doc.setFontSize(6);
            doc.setFont('helvetica', 'italic');
            compLines = doc.splitTextToSize(compText, colWidths[0] - 4);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            rowHeight += compLines.length * 3;
          }

          if (yPos + rowHeight > 270) { doc.addPage(); yPos = 20; }
          
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos - 4, pageWidth - 2 * margin, rowHeight, 'F');
          }
          
          let displayName = eq.name;
          if (item.start_date && item.end_date) {
            displayName += ` (${formatDate(item.start_date)} au ${formatDate(item.end_date)})`;
          }
          
          doc.text(displayName.substring(0, 48), colX[0] + 2, yPos);
          doc.text(item.quantity.toString(), colX[1] + 2, yPos);
          doc.text(`${eq.daily_price.toFixed(2)}€`, colX[2] + 2, yPos);
          doc.text(`x${itemCoef.toFixed(2)}`, colX[3] + 2, yPos);
          doc.text(`${lineTotal.toFixed(2)}€`, colX[4] + 2, yPos);

          if (hasPackDetails) {
            doc.setFontSize(6);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');
            compLines.forEach((line, lIdx) => {
              doc.text(line, colX[0] + 2, yPos + 3.2 + (lIdx * 3));
            });
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
          }

          yPos += rowHeight;
        }
      });
    }
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 3;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const tarifLabel = isWeekendTariff 
      ? `Tarif weekend (ven-lun) : coefficient x${degressionCoef} - ${days} jour${days > 1 ? 's' : ''}`
      : `Tarif ${degressionType || days + ' jour' + (days > 1 ? 's' : '')} : coefficient x${degressionCoef}`;
    doc.text(tarifLabel, margin, yPos);
    yPos += 7;

    // Récapitulatif des frais
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const rightAlignX = pageWidth - margin;
    const labelX = margin + 90;
    
    doc.text("Sous-total matériel:", labelX, yPos);
    doc.text(`${subtotal.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
    yPos += 6;
    
    // Remises
    const discountPercent = quoteData.discount_percent || 0;
    const discountAmountFixed = quoteData.discount_amount || 0;
    
    if (discountPercent > 0 || discountAmountFixed > 0) {
      const discount = discountAmountFixed > 0 ? discountAmountFixed : (subtotal * discountPercent) / 100;
      const discountLabel = discountAmountFixed > 0 
        ? `Remise (${discountAmountFixed.toFixed(2)}€):`
        : `Remise (${discountPercent.toFixed(0)}%):`;
      doc.text(discountLabel, labelX, yPos);
      doc.text(`-${discount.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 6;
    }

    // Forfait livraison
    const deliveryCost = quoteData.delivery_cost || 0;
    const deliveryZone = quoteData.delivery_zone || '';
    const deliveryKm = quoteData.delivery_km || 0;
    
    let deliveryLabel = "Forfait livraison";
    if (deliveryZone === 'zone1') deliveryLabel = "Livraison Zone 1 (Local < 20km)";
    else if (deliveryZone === 'zone2') deliveryLabel = "Livraison Zone 2 (20-50km)";
    else if (deliveryZone === 'zone3') deliveryLabel = "Livraison Zone 3 (50-70km)";
    else if (deliveryZone === 'hors_zone' && deliveryKm > 0) deliveryLabel = `Livraison Hors zone (${deliveryKm}km × 0.70€)`;
    else deliveryLabel = "Forfait livraison (à définir)";
    
    doc.text(`${deliveryLabel}:`, labelX, yPos);
    if (deliveryCost === 0 && (deliveryZone === 'zone1' || deliveryZone === '')) {
      if (deliveryZone === 'zone1') {
        doc.setTextColor(34, 139, 34);
        doc.text("GRATUIT", rightAlignX, yPos, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text("0.00€", rightAlignX, yPos, { align: 'right' });
      }
    } else {
      doc.text(`${deliveryCost.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
    }
    yPos += 6;

    // Frais d'installation
    const installationHours = quoteData.installation_hours || 0;
    const installationCost = quoteData.installation_cost || 0;
    
    let installLabel = "Frais d'installation";
    if (installationHours > 0) installLabel = `Installation (${installationHours}h × 35€/h)`;
    doc.text(`${installLabel}:`, labelX, yPos);
    doc.text(`${installationCost.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
    yPos += 6;

    // Calcul TVA et totaux
    yPos += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(labelX, yPos - 2, rightAlignX, yPos - 2);
    yPos += 2;
    
    const discountValue = discountAmountFixed > 0 ? discountAmountFixed : (subtotal * discountPercent / 100);
    const finalTotal = quoteData.total_amount || (subtotal - discountValue + deliveryCost + installationCost);
    const totalHT = finalTotal / 1.20;
    const tvaAmount = finalTotal - totalHT;
    
    doc.setFont('helvetica', 'normal');
    doc.text("Total HT:", labelX, yPos);
    doc.text(`${totalHT.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
    yPos += 6;
    
    doc.text("TVA (20%):", labelX, yPos);
    doc.text(`${tvaAmount.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
    yPos += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("TOTAL TTC:", labelX, yPos);
    doc.text(`${finalTotal.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
    yPos += 8;

    if (quoteData.deposit_paid && quoteData.deposit_amount > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      const depositMethod = quoteData.deposit_payment_method ? ` (par ${quoteData.deposit_payment_method})` : '';
      doc.text(`Acompte versé le ${quoteData.deposit_date ? new Date(quoteData.deposit_date).toLocaleDateString('fr-FR') : ''}${depositMethod}:`, labelX, yPos);
      doc.text(`-${quoteData.deposit_amount.toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 8;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("RESTE À PAYER:", labelX, yPos);
      doc.text(`${(finalTotal - quoteData.deposit_amount).toFixed(2)}€`, rightAlignX, yPos, { align: 'right' });
      yPos += 10;
    } else {
      yPos += 4;
    }

    // ==============================
    // LAYOUT 2 COLONNES : Livraison (gauche) + Caution/Signature (droite)
    // ==============================
    const colLeftX = margin;
    const colLeftWidth = 78;
    const colRightX = margin + colLeftWidth + 5;
    const colRightWidth = pageWidth - 2 * margin - colLeftWidth - 5;
    let yLeft = yPos;
    let yRight = yPos;

    // --- COLONNE GAUCHE : Livraison & Retour ---
    const showDeliveryAddress = !!quoteData.delivery_zone && !!quoteData.delivery_address;
    const hasDeliveryInfo = showDeliveryAddress || quoteData.pickup_by_us || quoteData.pickup_by_client;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("LIVRAISON & RETOUR", colLeftX, yLeft);
    yLeft += 2;
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.5);
    doc.line(colLeftX, yLeft, colLeftX + 50, yLeft);
    doc.setLineWidth(0.2);
    doc.setDrawColor(0, 0, 0);
    yLeft += 5;

    if (hasDeliveryInfo) {
      doc.setFontSize(9);
      
      if (showDeliveryAddress) {
        doc.setFont('helvetica', 'bold');
        doc.text("Adresse de livraison :", colLeftX, yLeft);
        yLeft += 4;
        doc.setFont('helvetica', 'normal');
        // Wrap long addresses
        const deliveryLines = doc.splitTextToSize(quoteData.delivery_address, colLeftWidth);
        deliveryLines.forEach(line => {
          doc.text(line, colLeftX + 3, yLeft);
          yLeft += 4;
        });
        yLeft += 2;
      }

      if (quoteData.pickup_by_us) {
        doc.setFont('helvetica', 'bold');
        doc.text("Retour du matériel :", colLeftX, yLeft);
        yLeft += 4;
        doc.setFont('helvetica', 'normal');
        doc.text("Retrait par nos soins", colLeftX + 3, yLeft);
        yLeft += 5;
        
        const pickupAddr = quoteData.pickup_address || (showDeliveryAddress ? quoteData.delivery_address : '');
        if (pickupAddr) {
          doc.setFont('helvetica', 'bold');
          doc.text("Adresse de retrait :", colLeftX, yLeft);
          yLeft += 4;
          doc.setFont('helvetica', 'normal');
          const pickupLines = doc.splitTextToSize(pickupAddr, colLeftWidth);
          pickupLines.forEach(line => {
            doc.text(line, colLeftX + 3, yLeft);
            yLeft += 4;
          });
        }
      } else if (quoteData.pickup_by_client) {
        doc.setFont('helvetica', 'bold');
        doc.text("Retour du matériel :", colLeftX, yLeft);
        yLeft += 4;
        doc.setFont('helvetica', 'normal');
        doc.text("Le client ramène le matériel", colLeftX + 3, yLeft);
        yLeft += 5;
      }
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text("Retrait et retour en agence", colLeftX, yLeft);
      doc.setTextColor(0, 0, 0);
      yLeft += 5;
    }

    // --- COLONNE DROITE : Acompte + Caution + Signature ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    let depositAmount = quoteData.deposit_amount || 0;
    let guaranteeAmount = quoteData.guarantee_amount || 0;
    const isTrustedNoGuarantee = quoteData.trusted_no_guarantee || quoteData.trusted_client || false;
    const isTrustedNoDeposit = quoteData.trusted_no_deposit || false;

    // Encadré jaune compact pour acompte + caution (hauteur dynamique)
    const boxTopY = yRight - 4;
    const hideAcompte = quoteData.deposit_paid && depositAmount > 0;
    
    // Pre-calculate height
    let calcHeight = 0; 
    if (!hideAcompte) {
      calcHeight += 7; // acompte height base
      if (isTrustedNoDeposit) {
        calcHeight += 4; // client de confiance mention for acompte
      }
    }
    if (isTrustedNoGuarantee) {
      calcHeight += 5 + 5 + 4; // caution base + confiance + pièce identité
    } else {
      doc.setFontSize(6.5);
      const tempLines = doc.splitTextToSize("Caution par chèque (non encaissé sauf litige). Pièce d'identité obligatoire.", colRightWidth - 6);
      calcHeight += 5 + (tempLines.length * 3.5);
    }
    const cautionBoxH = calcHeight + 4;

    // Draw yellow box background first
    doc.setFillColor(245, 245, 220);
    doc.rect(colRightX, boxTopY, colRightWidth, cautionBoxH, 'F');
    doc.setDrawColor(200, 180, 100);
    doc.rect(colRightX, boxTopY, colRightWidth, cautionBoxH, 'S');

    // Draw text content on top
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    if (!hideAcompte) {
      doc.text("Acompte :", colRightX + 3, yRight + 1);
      
      if (isTrustedNoDeposit) {
        doc.setTextColor(34, 139, 34);
        doc.text("0.00€", colRightX + colRightWidth - 3, yRight + 1, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yRight += 5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(34, 139, 34);
        doc.text("Client de confiance (pas d'acompte)", colRightX + 3, yRight + 1);
        doc.setTextColor(0, 0, 0);
        yRight += 5;
      } else {
        doc.text(`${depositAmount.toFixed(2)}€`, colRightX + colRightWidth - 3, yRight + 1, { align: 'right' });
        yRight += 7;
      }
    }

    if (isTrustedNoGuarantee) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Caution :", colRightX + 3, yRight + 1);
      doc.setTextColor(34, 139, 34);
      doc.text("0.00€", colRightX + colRightWidth - 3, yRight + 1, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yRight += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(34, 139, 34);
      doc.text("Client de confiance (pas de caution)", colRightX + 3, yRight + 1);
      doc.setTextColor(0, 0, 0);
      yRight += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text("Une pièce d'identité pourrait vous être demandée.", colRightX + 3, yRight + 1);
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Caution :", colRightX + 3, yRight + 1);
      doc.text(`${guaranteeAmount.toFixed(2)}€`, colRightX + colRightWidth - 3, yRight + 1, { align: 'right' });
      yRight += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      const cautionLines = doc.splitTextToSize("Caution par chèque (non encaissé sauf litige). Pièce d'identité obligatoire.", colRightWidth - 6);
      cautionLines.forEach(line => {
        doc.text(line, colRightX + 3, yRight + 1);
        yRight += 3.5;
      });
      doc.setTextColor(0, 0, 0);
    }

    // Position after box
    yRight = boxTopY + cautionBoxH + 3;

    const bankName = companySettings.bank_name || '';
    const bankIban = companySettings.bank_iban || '';
    const bankBic = companySettings.bank_bic || '';
    const bankTitulaire = companySettings.bank_titulaire || "";
    const companySiret = companySettings.company_siret || '';
    const companyTvaFooter = companySettings.company_tva || '';

    yRight += 2;

    // Signature compacte
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("SIGNATURE CLIENT :", colRightX, yRight);
    yRight += 3;
    
    doc.setDrawColor(100, 100, 100);
    doc.rect(colRightX, yRight, colRightWidth, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text("Date :", colRightX + 3, yRight + 7);
    doc.text("Signature :", colRightX + 3, yRight + 16);

    // RIB et SIRET en pied de page
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 18;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);

    const bankParts = [];
    if (bankName) bankParts.push(`Banque : ${bankName}`);
    if (bankTitulaire) bankParts.push(`Titulaire : ${bankTitulaire}`);
    if (bankIban) bankParts.push(`IBAN : ${bankIban}`);
    if (bankBic) bankParts.push(`BIC : ${bankBic}`);
    if (bankParts.length > 0) {
      doc.text(bankParts.join('  |  '), pageWidth / 2, footerY + 1, { align: 'center' });
    } else {
      doc.text("Détails bancaires non renseignés", pageWidth / 2, footerY + 1, { align: 'center' });
    }
    
    const companyParts = [];
    if (companySiret) companyParts.push(`SIRET : ${companySiret}`);
    if (companyTvaFooter) companyParts.push(`TVA : ${companyTvaFooter}`);
    if (companyParts.length > 0) {
      doc.text(companyParts.join('  |  '), pageWidth / 2, footerY + 5, { align: 'center' });
    }
    doc.setTextColor(0, 0, 0);

    // ==============================
    // PAGE SUPPLÉMENTAIRE : CGV (si demandées)
    // ==============================
    if (options.cgvText) {
      doc.addPage();
      
      let cgvYPos = 20;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("CONDITIONS GÉNÉRALES DE LOCATION", pageWidth / 2, cgvYPos, { align: 'center' });
      cgvYPos += 10;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // On sépare le texte brut par lignes en tenant compte de la largeur
      const cgvLines = doc.splitTextToSize(options.cgvText, pageWidth - 2 * margin);
      
      // On imprime ligne par ligne pour gérer les sauts de page dans les CGV, si trop long
      cgvLines.forEach(line => {
        if (cgvYPos > pageHeight - 20) {
          doc.addPage();
          cgvYPos = 20;
        }
        doc.text(line, margin, cgvYPos);
        cgvYPos += 4;
      });
    }

    const clientForFilename = clients.find(c => c.id === quoteData.client_id);
    const clientNameForFile = clientForFilename 
      ? (clientForFilename.company_name || clientForFilename.name || 'Client').replace(/[^a-zA-Z0-9À-ÿ]/g, '').substring(0, 30)
      : (quoteData.client_name || 'Client').replace(/[^a-zA-Z0-9À-ÿ]/g, '').substring(0, 30);
    const startDateForFile = quoteData.start_date 
      ? new Date(quoteData.start_date).toLocaleDateString('fr-FR').replace(/\//g, '-')
      : quoteDate.replace(/\//g, '-');
    const filename = `DevisLoc_${clientNameForFile}_${startDateForFile}.pdf`;

    if (returnBase64) {
      const base64 = doc.output('datauristring').split(',')[1];
      return { success: true, base64, filename };
    }

    doc.save(filename);
    
    toast.success('PDF généré avec succès !');
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Erreur lors de la génération du PDF');
    return false;
  }
};
