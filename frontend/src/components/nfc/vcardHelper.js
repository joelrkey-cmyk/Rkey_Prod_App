/**
 * Utility helper to generate and download standard vCard v3.0 files.
 * Compatible with iOS (Apple Contacts) and Android devices.
 */

export function generateVCardString(card) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${card.lastName || ''};${card.firstName || ''};;;`,
    `FN:${card.firstName || ''} ${card.lastName || ''}`.trim(),
  ];

  if (card.company) {
    lines.push(`ORG:${card.company}`);
  } else {
    lines.push('ORG:R\'KEY PROD');
  }

  if (card.role) {
    lines.push(`TITLE:${card.role}`);
  }

  if (card.phone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${card.phone}`);
  }

  if (card.email) {
    lines.push(`EMAIL;TYPE=PREF,INTERNET:${card.email}`);
  }

  if (card.website) {
    lines.push(`URL;TYPE=WORK:${card.website}`);
  }

  // Social URLs
  const socials = card.socials || {};
  if (socials.linkedin) lines.push(`URL;TYPE=LinkedIn:${socials.linkedin}`);
  if (socials.instagram) lines.push(`URL;TYPE=Instagram:${socials.instagram}`);
  if (socials.facebook) lines.push(`URL;TYPE=Facebook:${socials.facebook}`);
  if (socials.tiktok) lines.push(`URL;TYPE=TikTok:${socials.tiktok}`);
  if (socials.youtube) lines.push(`URL;TYPE=YouTube:${socials.youtube}`);

  // Note with bio and footer
  let note = '';
  if (card.bio) {
    note += card.bio.replace(/\n/g, '\\n') + '\\n';
  }
  note += "Fiche contact générée via R'KEY PROD NFC.";
  lines.push(`NOTE:${note}`);

  lines.push('REV:' + new Date().toISOString());
  lines.push('END:VCARD');

  return lines.join('\n');
}

export function downloadVCard(card) {
  const vcardStr = generateVCardString(card);
  const blob = new Blob([vcardStr], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${card.firstName || 'contact'}_${card.lastName || 'rkey'}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
