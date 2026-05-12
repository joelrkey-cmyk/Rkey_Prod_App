import jsPDF from 'jspdf';

// Informations R'Key Prod
const COMPANY_INFO = {
  name: "R'Key Prod",
  address: "5 rue du Hohlandsbourg",
  city: "67390 Marckolsheim", 
  phone: "0783553674",
  email: "info@rkey-prod.fr",
  siret: "99992355000019"
};

// Barème dépôt de garantie
const GUARANTEE_RATES = [
  { min: 0, max: 100, deposit: 100 },
  { min: 101, max: 300, deposit: 150 },
  { min: 301, max: 600, deposit: 250 },
  { min: 601, max: 1000, deposit: 500 },
  { min: 1001, max: 1500, deposit: 800 },
  { min: 1501, max: 2500, deposit: 1000 },
  { min: 2501, max: 4000, deposit: 1500 },
  { min: 4001, max: Infinity, deposit: 2000 }
];

// Fonction pour calculer le dépôt de garantie basé sur le montant d'un jour
export const calculateGuaranteeDeposit = (equipmentTotal) => {
  const rate = GUARANTEE_RATES.find(r => equipmentTotal >= r.min && equipmentTotal <= r.max);
  return rate ? rate.deposit : 2000;
};

// Conditions Générales de Vente
const generateCGV = (doc, startY = 20) => {
  let yPosition = startY;
  
  // Titre CGV
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("CONDITIONS GÉNÉRALES DE VENTE (CGV) R'Key Prod", 20, yPosition);
  yPosition += 15;

  // Article 1
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("Article 1 : Objet", 20, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const article1Text = "Les présentes Conditions Générales de Vente et de Location (ci-après les \"CGV\") ont pour objet de définir les conditions dans lesquelles R'Key Prod (le \"Loueur\") fournit la location de matériel de sonorisation, d'éclairage et de vidéo (le \"Matériel\") à ses clients (le \"Locataire\").";
  const splitText1 = doc.splitTextToSize(article1Text, 170);
  doc.text(splitText1, 20, yPosition);
  yPosition += splitText1.length * 5 + 10;

  // Article 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("Article 2 : Réservation et Acompte", 20, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("2.1. Toute réservation de Matériel est formalisée par un Bon de Réservation ou un devis signé par le Locataire.", 20, yPosition);
  yPosition += 6;
  doc.text("2.2. La réservation devient ferme et définitive uniquement après le versement d'un acompte.", 20, yPosition);
  yPosition += 6;
  doc.text("Le montant de cet acompte représente 30% du montant total de la location et est non productif d'intérêts.", 20, yPosition);
  yPosition += 12;

  // Article 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("Article 3 : Annulation", 20, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("3.1. En cas d'annulation de la réservation par le Locataire, les conditions de retenue de l'acompte sont :", 20, yPosition);
  yPosition += 6;
  doc.text("• Annulation notifiée plus de 15 jours avant la date de retrait : L'acompte est intégralement restitué.", 25, yPosition);
  yPosition += 6;
  doc.text("• Annulation notifiée entre 15 jours et la date de retrait : L'intégralité de l'acompte versé", 25, yPosition);
  yPosition += 5;
  doc.text("  est définitivement acquise à R'Key Prod à titre d'indemnité forfaitaire d'annulation.", 25, yPosition);
  yPosition += 12;

  // Article 4 - Nouvelle page si nécessaire
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("Article 4 : Caution (Dépôt de Garantie)", 20, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("4.1. Lors du retrait du Matériel, le Locataire doit impérativement verser un dépôt de garantie", 20, yPosition);
  yPosition += 6;
  doc.text("dont le montant est spécifié sur le Bon de Retrait selon le barème établi.", 20, yPosition);
  yPosition += 6;
  doc.text("4.2. Ce dépôt de garantie sera effectué au choix du Loueur par chèque de caution non encaissé", 20, yPosition);
  yPosition += 6;
  doc.text("ou par prélèvement bancaire (pré-autorisation) via carte bancaire.", 20, yPosition);
  yPosition += 12;

  // Article 5
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("Article 5 : Retrait et Restitution du Matériel", 20, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("5.1. Le Matériel est réputé en parfait état de fonctionnement et d'entretien lors de sa remise.", 20, yPosition);
  yPosition += 6;
  doc.text("5.2. Le Locataire est tenu de vérifier l'état du Matériel au moment du retrait et de signaler", 20, yPosition);
  yPosition += 6;
  doc.text("toute anomalie immédiatement. Aucune réclamation ne sera admise après le départ du Locataire.", 20, yPosition);
  yPosition += 6;
  doc.text("5.3. Le Matériel doit être restitué à la date et heure convenues, propre et dans l'état", 20, yPosition);
  yPosition += 6;
  doc.text("où il a été loué, sous peine de facturation de jours de retard et frais de nettoyage.", 20, yPosition);
  yPosition += 12;

  // Article 6 
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("Article 6 : Responsabilité et Dommages", 20, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("6.1. Le Locataire est seul et entièrement responsable du Matériel dès son retrait.", 20, yPosition);
  yPosition += 6;
  doc.text("6.2. En cas de perte, vol, ou toute dégradation du Matériel, le Locataire sera facturé", 20, yPosition);
  yPosition += 6;
  doc.text("du montant des réparations ou de la valeur de remplacement à neuf du Matériel.", 20, yPosition);
  yPosition += 12;

  // TVA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("Régime TVA", 20, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("TVA non applicable, article 293 B du Code général des impôts (auto-entrepreneur).", 20, yPosition);

  return yPosition + 15;
};

// Génération du Bon de Réservation
export const generateReservationSlip = (reservationData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // En-tête société
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 20, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY_INFO.address}, ${COMPANY_INFO.city}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Tél: ${COMPANY_INFO.phone} - Email: ${COMPANY_INFO.email}`, 20, yPosition);
  yPosition += 5;
  doc.text(`SIRET: ${COMPANY_INFO.siret}`, 20, yPosition);
  yPosition += 15;

  // Titre du document
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("BON DE RÉSERVATION ET ENGAGEMENT", 70, yPosition);
  yPosition += 15;

  // Informations réservation
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Référence Réservation: ${reservationData.id || 'N/A'}`, 20, yPosition);
  doc.text(`Date de l'événement: ${reservationData.eventDate || 'N/A'}`, 120, yPosition);
  yPosition += 10;

  // Informations client
  doc.setFont('helvetica', 'bold');
  doc.text("LOCATAIRE:", 20, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${reservationData.clientName || 'N/A'}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Email: ${reservationData.clientEmail || 'N/A'}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Téléphone: ${reservationData.clientPhone || 'N/A'}`, 20, yPosition);
  yPosition += 15;

  // Tableau du matériel
  doc.setFont('helvetica', 'bold');
  doc.text("DÉTAIL DU MATÉRIEL RÉSERVÉ:", 20, yPosition);
  yPosition += 10;

  // En-têtes tableau
  doc.rect(20, yPosition - 5, 170, 10);
  doc.text("Désignation", 25, yPosition);
  doc.text("Quantité", 90, yPosition);
  doc.text("Prix Unit. HT", 120, yPosition);
  doc.text("Total HT", 160, yPosition);
  yPosition += 10;

  let totalHT = 0;
  if (reservationData.items && reservationData.items.length > 0) {
    reservationData.items.forEach(item => {
      doc.rect(20, yPosition - 5, 170, 8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.name || 'N/A', 25, yPosition);
      doc.text(String(item.quantity || 1), 95, yPosition);
      doc.text(`${item.price || 0}€`, 125, yPosition);
      doc.text(`${(item.quantity || 1) * (item.price || 0)}€`, 165, yPosition);
      totalHT += (item.quantity || 1) * (item.price || 0);
      yPosition += 8;
    });
  }

  // Totaux
  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL HT: ${totalHT}€`, 140, yPosition);
  yPosition += 6;
  doc.text("TVA non applicable (art. 293 B CGI)", 120, yPosition);
  yPosition += 6;
  doc.text(`TOTAL TTC: ${totalHT}€`, 140, yPosition);
  yPosition += 15;

  // Conditions d'acompte
  const acompte = Math.round(totalHT * 0.3);
  doc.setFont('helvetica', 'bold');
  doc.text("CONDITIONS FINANCIÈRES:", 20, yPosition);
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Acompte dû pour validation (30%): ${acompte}€`, 20, yPosition);
  yPosition += 6;
  doc.text("En cas d'annulation moins de 15 jours avant le retrait, l'acompte versé sera retenu.", 20, yPosition);
  yPosition += 15;

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.text("ENGAGEMENT DU LOCATAIRE:", 20, yPosition);
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  const engagement = `Je soussigné(e) ${reservationData.clientName || '________________'} confirme la réservation du matériel listé ci-dessus et m'engage à prendre en charge la location et à régler le solde restant dû (${totalHT - acompte}€) au plus tard lors du retrait du matériel.`;
  const splitEngagement = doc.splitTextToSize(engagement, 170);
  doc.text(splitEngagement, 20, yPosition);
  yPosition += splitEngagement.length * 5 + 10;

  doc.text(`Fait à Marckolsheim, Le: ${new Date().toLocaleDateString('fr-FR')}`, 20, yPosition);
  yPosition += 10;
  doc.text("Signature du Locataire:", 20, yPosition);
  doc.text("(Précédée de la mention manuscrite \"Bon pour accord et acceptation des CGV\")", 20, yPosition + 5);

  return doc;
};

// Génération du Bon de Retrait
export const generateWithdrawalSlip = (reservationData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // En-tête société
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 20, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY_INFO.address}, ${COMPANY_INFO.city}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Tél: ${COMPANY_INFO.phone} - Email: ${COMPANY_INFO.email}`, 20, yPosition);
  yPosition += 5;
  doc.text(`SIRET: ${COMPANY_INFO.siret}`, 20, yPosition);
  yPosition += 15;

  // Titre du document
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("BON DE RETRAIT DU MATÉRIEL ET ACCEPTATION DE LA CAUTION", 20, yPosition);
  yPosition += 15;

  // Informations réservation
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Référence Réservation: ${reservationData.id || 'N/A'}`, 20, yPosition);
  doc.text(`Date et Heure de Retrait: ${new Date().toLocaleString('fr-FR')}`, 120, yPosition);
  yPosition += 6;
  doc.text(`Date et Heure de Restitution Prévue: ${reservationData.endDate || 'N/A'}`, 20, yPosition);
  yPosition += 15;

  // Informations client
  doc.setFont('helvetica', 'bold');
  doc.text("LOCATAIRE:", 20, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${reservationData.clientName || 'N/A'}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Email: ${reservationData.clientEmail || 'N/A'}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Téléphone: ${reservationData.clientPhone || 'N/A'}`, 20, yPosition);
  yPosition += 15;

  // Tableau du matériel retiré
  doc.setFont('helvetica', 'bold');
  doc.text("DÉTAIL DU MATÉRIEL RETIRÉ (Vérifié et Accepté):", 20, yPosition);
  yPosition += 10;

  // En-têtes tableau
  doc.rect(20, yPosition - 5, 170, 10);
  doc.text("Désignation", 25, yPosition);
  doc.text("Qté", 90, yPosition);
  doc.text("N° Série/ID", 110, yPosition);
  doc.text("État", 160, yPosition);
  yPosition += 10;

  let equipmentDayTotal = 0;
  if (reservationData.items && reservationData.items.length > 0) {
    reservationData.items.forEach(item => {
      doc.rect(20, yPosition - 5, 170, 8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.name || 'N/A', 25, yPosition);
      doc.text(String(item.quantity || 1), 92, yPosition);
      doc.text(item.serialNumber || 'N/A', 115, yPosition);
      doc.text('Bon', 165, yPosition);
      equipmentDayTotal += (item.quantity || 1) * (item.price || 0); // Prix pour un jour
      yPosition += 8;
    });
  }

  yPosition += 10;

  // Calcul du dépôt de garantie
  const guaranteeAmount = calculateGuaranteeDeposit(equipmentDayTotal);

  // Conditions de caution
  doc.setFont('helvetica', 'bold');
  doc.text("CONDITIONS DE CAUTION (Articles 4 et 6 des CGV):", 20, yPosition);
  yPosition += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Montant du matériel (1 jour): ${equipmentDayTotal}€`, 20, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Montant du Dépôt de Garantie (Caution): ${guaranteeAmount}€`, 20, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text("Mode de Versement de la Caution: _______________________", 20, yPosition);
  yPosition += 10;

  const cautionText = "Le Locataire accepte que, conformément aux CGV acceptées lors de la réservation, ce dépôt de garantie puisse être retenu, en tout ou partie, pour couvrir les frais de réparation, remplacement ou nettoyage du Matériel en cas de dégradation ou de non-restitution dans l'état initial.";
  const splitCaution = doc.splitTextToSize(cautionText, 170);
  doc.text(splitCaution, 20, yPosition);
  yPosition += splitCaution.length * 5 + 15;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.text("ACCEPTATION ET SIGNATURE DU RETRAIT:", 20, yPosition);
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  const acceptation = `Je soussigné(e) ${reservationData.clientName || '________________'} atteste avoir procédé à la vérification du matériel listé ci-dessus, le trouver en parfait état de fonctionnement et d'entretien, et en accepte la pleine et entière responsabilité, ainsi que les conditions du dépôt de garantie mentionnées ci-dessus.`;
  const splitAcceptation = doc.splitTextToSize(acceptation, 170);
  doc.text(splitAcceptation, 20, yPosition);
  yPosition += splitAcceptation.length * 5 + 10;

  doc.text(`Fait à Marckolsheim, Le: ${new Date().toLocaleDateString('fr-FR')}`, 20, yPosition);
  yPosition += 10;
  doc.text("Signature du Loueur: ___________________", 20, yPosition);
  yPosition += 8;
  doc.text("Signature du Locataire: ___________________", 20, yPosition);
  doc.text("(Précédée de la mention manuscrite \"Lu et approuvé, acceptation de la caution\")", 20, yPosition + 5);

  return doc;
};

// Génération du document complet avec devis + bon de réservation + CGV
export const generateCompleteReservationDocuments = (reservationData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Page 1: Devis
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 20, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY_INFO.address}, ${COMPANY_INFO.city}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Tél: ${COMPANY_INFO.phone} - Email: ${COMPANY_INFO.email}`, 20, yPosition);
  yPosition += 5;
  doc.text(`SIRET: ${COMPANY_INFO.siret}`, 20, yPosition);
  yPosition += 15;

  // Titre devis
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("DEVIS DE LOCATION MATÉRIEL", 80, yPosition);
  yPosition += 15;

  // Détails devis (similaire au bon de réservation mais en tant que devis)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Devis N°: ${reservationData.id || 'N/A'}`, 20, yPosition);
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 150, yPosition);
  yPosition += 10;

  // Informations client
  doc.setFont('helvetica', 'bold');
  doc.text("CLIENT:", 20, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`${reservationData.clientName || 'N/A'}`, 20, yPosition);
  yPosition += 5;
  doc.text(`${reservationData.clientEmail || 'N/A'}`, 20, yPosition);
  yPosition += 5;
  doc.text(`${reservationData.clientPhone || 'N/A'}`, 20, yPosition);
  yPosition += 15;

  // Tableau du matériel 
  doc.setFont('helvetica', 'bold');
  doc.text("MATÉRIEL PROPOSÉ:", 20, yPosition);
  yPosition += 10;

  // En-têtes tableau
  doc.rect(20, yPosition - 5, 170, 10);
  doc.text("Désignation", 25, yPosition);
  doc.text("Qté", 90, yPosition);
  doc.text("Prix/j HT", 120, yPosition);
  doc.text("Total HT", 160, yPosition);
  yPosition += 10;

  let totalHT = 0;
  if (reservationData.items && reservationData.items.length > 0) {
    reservationData.items.forEach(item => {
      const days = reservationData.days || 1;
      const itemTotal = (item.quantity || 1) * (item.price || 0) * days;
      doc.rect(20, yPosition - 5, 170, 8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.name || 'N/A', 25, yPosition);
      doc.text(String(item.quantity || 1), 92, yPosition);
      doc.text(`${item.price || 0}€`, 125, yPosition);
      doc.text(`${itemTotal}€`, 165, yPosition);
      totalHT += itemTotal;
      yPosition += 8;
    });
  }

  // Totaux
  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL HT: ${totalHT}€`, 140, yPosition);
  yPosition += 6;
  doc.text("TVA non applicable (art. 293 B CGI)", 120, yPosition);
  yPosition += 6;
  doc.text(`TOTAL TTC: ${totalHT}€`, 140, yPosition);

  // Nouvelle page pour le Bon de Réservation
  doc.addPage();
  yPosition = 20;

  // En-tête société (page 2)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 20, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY_INFO.address}, ${COMPANY_INFO.city}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Tél: ${COMPANY_INFO.phone} - Email: ${COMPANY_INFO.email}`, 20, yPosition);
  yPosition += 5;
  doc.text(`SIRET: ${COMPANY_INFO.siret}`, 20, yPosition);
  yPosition += 15;

  // Titre Bon de Réservation
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("BON DE RÉSERVATION ET ENGAGEMENT", 70, yPosition);
  yPosition += 15;

  // Reprise des informations du bon de réservation
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Référence: ${reservationData.id || 'N/A'}`, 20, yPosition);
  doc.text(`Date événement: ${reservationData.eventDate || 'N/A'}`, 120, yPosition);
  yPosition += 15;

  // Informations client
  doc.setFont('helvetica', 'bold');
  doc.text("LOCATAIRE:", 20, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${reservationData.clientName || 'N/A'}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Email: ${reservationData.clientEmail || 'N/A'}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Téléphone: ${reservationData.clientPhone || 'N/A'}`, 20, yPosition);
  yPosition += 15;

  // Résumé du matériel
  doc.setFont('helvetica', 'bold');
  doc.text("MATÉRIEL RÉSERVÉ:", 20, yPosition);
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  if (reservationData.items && reservationData.items.length > 0) {
    reservationData.items.forEach(item => {
      doc.text(`• ${item.name || 'N/A'} (Qté: ${item.quantity || 1})`, 25, yPosition);
      yPosition += 5;
    });
  }
  yPosition += 10;

  // Conditions financières
  const acompte = Math.round(totalHT * 0.3);
  doc.setFont('helvetica', 'bold');
  doc.text("CONDITIONS FINANCIÈRES ET ANNULATION:", 20, yPosition);
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Acompte dû pour validation (30%): ${acompte}€`, 20, yPosition);
  yPosition += 6;
  doc.text(`Solde à régler lors du retrait: ${totalHT - acompte}€`, 20, yPosition);
  yPosition += 8;
  const annulationText = "En signant ce document, le Locataire reconnaît avoir pris connaissance et accepter intégralement les Conditions Générales de Vente (CGV) du Loueur, notamment en ce qui concerne l'Article 3 (Annulation). En cas d'annulation moins de 15 jours avant le retrait, l'acompte versé sera retenu par le Loueur.";
  const splitAnnulation = doc.splitTextToSize(annulationText, 170);
  doc.text(splitAnnulation, 20, yPosition);
  yPosition += splitAnnulation.length * 5 + 15;

  // Engagement
  doc.setFont('helvetica', 'bold');
  doc.text("ENGAGEMENT DU LOCATAIRE:", 20, yPosition);
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  const engagementText = `Je soussigné(e) ${reservationData.clientName || '________________'} confirme la réservation du matériel listé ci-dessus et m'engage à prendre en charge la location et à régler le solde restant dû (${totalHT - acompte}€) au plus tard lors du retrait du matériel.`;
  const splitEngagement = doc.splitTextToSize(engagementText, 170);
  doc.text(splitEngagement, 20, yPosition);
  yPosition += splitEngagement.length * 5 + 15;

  doc.text(`Fait à Marckolsheim, Le: ${new Date().toLocaleDateString('fr-FR')}`, 20, yPosition);
  yPosition += 10;
  doc.text("Signature du Locataire:", 20, yPosition);
  doc.text("(Précédée de la mention \"Bon pour accord et acceptation des CGV\")", 20, yPosition + 5);

  // Nouvelle page pour les CGV
  doc.addPage();
  generateCGV(doc, 20);

  return doc;
};