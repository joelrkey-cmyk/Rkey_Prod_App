import { jsPDF } from 'jspdf';

// Utility to calculate guarantee deposit (caution)
export function calculateGuaranteeDeposit(equipment_items_or_total) {
  if (Array.isArray(equipment_items_or_total)) {
    if (equipment_items_or_total.length === 0) return 300;
    let total = 0;
    equipment_items_or_total.forEach(item => {
      const qty = parseInt(item.quantity) || 1;
      const price = parseFloat(item.guarantee_price || item.caution_amount || 150);
      total += price * qty;
    });
    return total;
  }
  
  const subtotal = parseFloat(equipment_items_or_total) || 0;
  if (subtotal <= 150) return 300;
  if (subtotal <= 500) return 500;
  if (subtotal <= 1000) return 1000;
  if (subtotal <= 2500) return 1500;
  return 2500;
}

// Generate the complete reservation documents (devis + bon de réservation + CGV)
export function generateCompleteReservationDocuments(reservationData) {
  const doc = new jsPDF();
  
  // Page 1: Bon de Réservation
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(249, 115, 22); // Orange theme
  doc.text("R'KEY PROD", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("CRM & MANAGEMENT DE RESERVATION", 14, 25);
  doc.text("Email: contact@rkeyprod.com | Site: rkeyprod.com", 14, 29);
  
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1);
  doc.line(14, 34, 196, 34);
  
  // Client & Reservation info
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("BON DE RÉSERVATION", 14, 44);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`ID Réservation : ${reservationData.id || 'N/A'}`, 14, 52);
  doc.text(`Client : ${reservationData.clientName || 'N/A'}`, 14, 58);
  doc.text(`Email : ${reservationData.clientEmail || 'N/A'}`, 14, 64);
  doc.text(`Téléphone : ${reservationData.clientPhone || 'N/A'}`, 14, 70);
  doc.text(`Date de fin : ${reservationData.endDate || 'N/A'}`, 14, 76);
  
  // Items Table Header
  let y = 90;
  doc.setFont("helvetica", "bold");
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(14, y, 182, 8, "F");
  doc.text("Description du matériel", 16, y + 6);
  doc.text("Quantité", 140, y + 6);
  doc.text("Prix unitaire", 170, y + 6);
  
  y += 8;
  doc.setFont("helvetica", "normal");
  const items = reservationData.items || [];
  items.forEach(item => {
    doc.text(item.name || 'N/A', 16, y + 6);
    doc.text((item.quantity || 1).toString(), 145, y + 6);
    doc.text(`${(item.price || 0).toFixed(2)} €`, 172, y + 6);
    y += 10;
  });
  
  // Total Days
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text(`Nombre de jours de location : ${reservationData.days || 1} jour(s)`, 14, y);
  
  // Footer signature areas
  y = 240;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Signature Client", 30, y);
  doc.text("Signature Agence (R'KEY PROD)", 130, y);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y + 4, 70, 25);
  doc.rect(114, y + 4, 70, 25);

  // Page 2: Conditions Générales de Vente (CGV)
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("CONDITIONS GÉNÉRALES DE VENTE", 14, 20);
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  
  const cgvText = [
    "Article 1 : Objet",
    "Les présentes conditions générales de vente et de location visent à définir les relations contractuelles entre R'KEY PROD et son client pour toute prestation d'événementiel, réservation, location de matériel, etc.",
    "Article 2 : Conditions de Retrait",
    "Le matériel loué est remis au locataire en parfait état de fonctionnement, propre, et avec l'intégralité de ses accessoires. Un contrôle contradictoire est effectué au départ.",
    "Article 3 : Caution et Pièces Justificatives",
    "Pour toute location, la présentation d'une pièce d'identité en cours de validité et le dépôt d'une caution (chèque ou empreinte bancaire) sont exigés. Cette caution n'est pas encaissée sauf dégradation ou non-restitution du matériel.",
    "Article 4 : Responsabilité et Assurances",
    "Le locataire devient gardien juridique du matériel pendant toute la durée de la mise à disposition. Il est responsable des dégradations, pertes, vols, sinistres pouvant survenir au matériel.",
    "Article 5 : Restitution",
    "Le matériel doit être restitué propre et trié à la date et heure mentionnées sur le contrat. Tout retard fera l'objet d'une facturation complémentaire calculée selon le tarif journalier de base.",
    "Article 6 : Litiges",
    "En cas de sinistre ou matériel manquant, un délai de 48h est mis en place pour constater ou résoudre le problème. En cas de désaccord persistant, le tribunal compétent du siège social de l'entreprise sera saisi."
  ];
  
  let cgvY = 30;
  cgvText.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 182);
    splitLines.forEach(l => {
      doc.text(l, 14, cgvY);
      cgvY += 4.5;
    });
    cgvY += 2; // small paragraph gap
  });
  
  return doc;
}

// Generate the simple withdrawal slip
export function generateWithdrawalSlip(reservationData) {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(124, 58, 237); // Purple theme for withdrawals
  doc.text("R'KEY PROD", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("BON DE RETRAIT MATÉRIEL", 14, 25);
  
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1);
  doc.line(14, 30, 196, 30);
  
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("ÉTAT DES LIEUX & ACCUSÉ DE RÉCEPTION", 14, 40);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Réservation : ${reservationData.id || 'N/A'}`, 14, 48);
  doc.text(`Nom du Client : ${reservationData.clientName || 'N/A'}`, 14, 54);
  doc.text(`Email : ${reservationData.clientEmail || 'N/A'}`, 14, 60);
  doc.text(`Téléphone : ${reservationData.clientPhone || 'N/A'}`, 14, 66);
  doc.text(`Date de retrait : ${new Date().toLocaleDateString()}`, 14, 72);
  
  // Table header
  let y = 84;
  doc.setFont("helvetica", "bold");
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 182, 8, "F");
  doc.text("Désignation du Matériel", 16, y + 6);
  doc.text("Quantité", 120, y + 6);
  doc.text("N° de série / Réf", 150, y + 6);
  
  y += 8;
  doc.setFont("helvetica", "normal");
  const items = reservationData.items || [];
  items.forEach(item => {
    doc.text(item.name || 'N/A', 16, y + 6);
    doc.text((item.quantity || 1).toString(), 125, y + 6);
    doc.text(item.serialNumber || 'N/A', 152, y + 6);
    y += 10;
  });
  
  // Status check boxes
  y += 10;
  doc.rect(14, y, 5, 5);
  doc.text("Le matériel a été testé avec succès devant le client.", 22, y + 4.5);
  y += 8;
  doc.rect(14, y, 5, 5);
  doc.text("Le client reconnaît avoir reçu tout le matériel en bon état.", 22, y + 4.5);
  
  // Signature blocks
  y = 240;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Le Client (Lu et approuvé)", 30, y);
  doc.text("Le Technicien R'KEY PROD", 130, y);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y + 4, 70, 25);
  doc.rect(114, y + 4, 70, 25);
  
  return doc;
}
