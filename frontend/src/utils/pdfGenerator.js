import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function calculateGuaranteeDeposit(dayTotal) {
  if (dayTotal <= 0) return 300;
  if (dayTotal <= 100) return 500;
  if (dayTotal <= 250) return 1000;
  if (dayTotal <= 500) return 1500;
  return 2000;
}

export function generateCompleteReservationDocuments(reservation) {
  const doc = new jsPDF();
  
  // Page 1: Devis & Bon de Réservation
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text("R'KEY PROD - BON DE RESERVATION", 14, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Réservation N° : ${reservation.id || 'N/A'}`, 14, 32);
  doc.text(`Date de génération : ${new Date().toLocaleDateString('fr-FR')}`, 14, 37);
  
  // Client info
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(14, 45, 180, 35, "F");
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.rect(14, 45, 180, 35);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("INFORMATIONS CLIENT", 20, 53);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.text(`Nom: ${reservation.clientName || 'N/A'}`, 25, 61);
  doc.text(`Email: ${reservation.clientEmail || 'N/A'}`, 25, 67);
  doc.text(`Téléphone: ${reservation.clientPhone || 'N/A'}`, 25, 73);
  
  // Table of items
  const tableData = reservation.items?.map(item => [
    item.name || 'N/A',
    item.quantity || 1,
    `${item.price || 0} €`,
    `${(item.quantity || 1) * (item.price || 0)} €`
  ]) || [];
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("MATERIELS RESERVES", 14, 93);
  
  doc.autoTable({
    startY: 97,
    head: [['Désignation', 'Quantité', 'Prix Standard (HT)', 'Total (HT)']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { font: 'helvetica', fontSize: 9 }
  });
  
  const finalY = doc.previousAutoTable.finalY + 15;
  doc.setFont("helvetica", "bold");
  doc.text("CONDITIONS GENERALES DE LOCATION", 14, finalY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const terms = [
    "1. Le matériel reste la propriété exclusive de R'KEY PROD.",
    "2. Le locataire assume la responsabilité complète du matériel dès sa prise en charge.",
    "3. Un dépôt de garantie (caution) est exigé avant le retrait du matériel.",
    "4. En cas de retard dans la restitution, des pénalités journalières s'appliqueront.",
    "5. Tout matériel endommagé ou perdu sera facturé sur la base de sa valeur à neuf."
  ];
  terms.forEach((line, index) => {
    doc.text(line, 14, finalY + 6 + (index * 5));
  });

  return doc;
}

export function generateWithdrawalSlip(reservation) {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text("R'KEY PROD - BON DE RETRAIT", 14, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Bon de retrait lié à la réservation N° : ${reservation.id || 'N/A'}`, 14, 32);
  doc.text(`Date de retrait : ${new Date().toLocaleDateString('fr-FR')}`, 14, 37);
  doc.text(`Date prévue de retour : ${reservation.endDate ? new Date(reservation.endDate).toLocaleDateString('fr-FR') : 'N/A'}`, 14, 42);
  
  // Client Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 48, 180, 32, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 48, 180, 32);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("INFORMATIONS CLIENT", 20, 56);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nom: ${reservation.clientName || 'N/A'}`, 25, 64);
  doc.text(`Email: ${reservation.clientEmail || 'N/A'}`, 25, 70);
  doc.text(`Téléphone: ${reservation.clientPhone || 'N/A'}`, 25, 75);
  
  // Items table
  const tableData = reservation.items?.map(item => [
    item.name || 'N/A',
    item.quantity || 1,
    item.serialNumber || 'N/A'
  ]) || [];
  
  doc.setFont("helvetica", "bold");
  doc.text("MATERIELS REMIS", 14, 91);
  
  doc.autoTable({
    startY: 95,
    head: [['Description du matériel', 'Quantité', 'N° Série / Réf']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
    styles: { font: 'helvetica', fontSize: 9 }
  });
  
  const finalY = doc.previousAutoTable.finalY + 15;
  
  // Total caution
  let equipmentDayTotal = 0;
  reservation.items?.forEach(item => {
    equipmentDayTotal += (item.quantity || 1) * (item.price || 0);
  });
  const guaranteeAmount = calculateGuaranteeDeposit(equipmentDayTotal);
  
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.rect(14, finalY, 180, 16, "F");
  doc.setDrawColor(245, 158, 11); // Amber 500
  doc.rect(14, finalY, 180, 16);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text(`CAUTION DE GARANTIE EXIGEE : ${guaranteeAmount} €`, 18, finalY + 10);
  
  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SIGNATURE CLIENT", 14, finalY + 35);
  doc.text("SIGNATURE R'KEY PROD", 110, finalY + 35);
  
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.rect(14, finalY + 40, 80, 30);
  doc.rect(110, finalY + 40, 84, 30);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Mention 'Bon pour retrait et acceptation des CGV'", 14, finalY + 75);

  return doc;
}
