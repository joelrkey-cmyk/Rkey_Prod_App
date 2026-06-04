// Génération HTML pour les contrats en mode Mandat (Contrats 2)
// Document 1: Contrat de Mandat et Location (R'KEY PROD) - TVA 20%
// Document 2: Contrat d'Engagement d'Artiste DJ - Sans TVA

const CSS_COMMON = `
  .header { border-bottom: 2px solid #FF6B00; padding-bottom: 8pt; margin-bottom: 12pt; }
  .header-content { width: 100%; }
  .header-left { float: left; width: 65%; }
  .header-right { float: right; width: 32%; text-align: right; font-size: 11px; }
  .company-name { font-size: 18pt; font-weight: bold; color: #FF6B00; margin-bottom: 2pt; }
  .company-tagline { font-size: 12px; font-weight: bold; margin-bottom: 6pt; }
  .company-address { font-size: 11px; line-height: 1.3; }
  .contract-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 10pt 0; text-transform: uppercase; color: #333; }
  .section { margin: 6pt 0; clear: both; }
  .section-title { background-color: #f0f0f0; padding: 4pt 6pt; font-weight: bold; font-size: 12px; border-left: 3px solid #FF6B00; margin-bottom: 6pt; }
  .two-columns { width: 100%; }
  .column-left { float: left; width: 48%; margin-right: 2%; }
  .column-right { float: right; width: 48%; }
  .info-item { margin-bottom: 2pt; font-size: 11px; }
  .info-label { font-weight: bold; display: inline-block; width: 18mm; }
  .compact-pricing-table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 11px; }
  .compact-pricing-table th, .compact-pricing-table td { border: 1px solid #ccc; padding: 4pt; text-align: left; }
  .compact-pricing-table th { background-color: #f0f0f0; font-weight: bold; }
  .compact-pricing-table td:last-child { text-align: right; font-weight: bold; width: 25mm; }
  .compact-pricing-total { background-color: #e6f3ff; font-weight: bold; }
  .compact-payment-box { background-color: #f0f8ff; border: 1pt solid #ccc; padding: 8pt; margin: 6pt 0; font-size: 11px; }
  .amount-big { font-size: 14px; font-weight: bold; color: #0066cc; }
  .signatures { width: 100%; margin-top: 15pt; clear: both; }
  .clearfix::after { content: ""; display: table; clear: both; }
  .paraphe-box { position: absolute; right: 8px; bottom: 8px; width: 15mm; height: 8mm; border: 1px solid #000; text-align: center; font-size: 9px; line-height: 8mm; font-weight: bold; }
  .paraphe-page { position: relative; min-height: 270mm; }
  .paraphe-page + .paraphe-page { page-break-before: always; }
  .paraphe-page + .section { page-break-before: always; }
  .notes-section { font-size: 10px; line-height: 1.3; }
`;

const clientInfoBlock = (contract) => `
  <div class="two-columns clearfix">
    <div class="column-left">
      <div class="section-title">INFORMATIONS CLIENT</div>
      <div class="info-item"><span class="info-label">Nom:</span> ${contract.client_info.name}</div>
      ${contract.client_info.company ? `<div class="info-item"><span class="info-label">Entreprise:</span> ${contract.client_info.company}</div>` : ''}
      <div class="info-item"><span class="info-label">Email:</span> ${contract.client_info.email}</div>
      <div class="info-item"><span class="info-label">Tel:</span> ${contract.client_info.phone || 'Non renseigne'}</div>
      ${contract.client_info.phone2 ? `<div class="info-item"><span class="info-label">Tel 2:</span> ${contract.client_info.phone2}</div>` : ''}
      ${contract.client_info.address ? `<div class="info-item"><span class="info-label">Adresse:</span> ${contract.client_info.address}</div>` : ''}
    </div>
    <div class="column-right">
      <div class="section-title">DETAILS EVENEMENT</div>
      <div class="info-item"><span class="info-label">Type:</span> ${contract.client_info.event_type === 'custom' && contract.client_info.custom_event_type ? contract.client_info.custom_event_type : contract.client_info.event_type}${contract.client_info.event_note ? ` — ${contract.client_info.event_note}` : ''}</div>
      <div class="info-item"><span class="info-label">Date:</span> ${new Date(contract.client_info.event_date).toLocaleDateString('fr-FR')}</div>
      <div class="info-item"><span class="info-label">Lieu:</span> ${contract.client_info.event_location}</div>
      ${contract.client_info.guest_count ? `<div class="info-item"><span class="info-label">Invites:</span> ${contract.client_info.guest_count}</div>` : ''}
      <div class="info-item"><span class="info-label">Debut:</span> ${contract.client_info.start_time || 'A definir'}</div>
      <div class="info-item"><span class="info-label">Fin:</span> ${contract.client_info.unlimited_time ? 'Sans limite' : (contract.client_info.end_time || 'A definir')}</div>
      ${contract.client_info.setup_date || contract.client_info.setup_time ? `
      <div style="margin-top: 4pt; padding-top: 4pt; border-top: 1px solid #ddd;">
        <div class="info-item"><span class="info-label">Installation :</span> ${contract.client_info.setup_date ? new Date(contract.client_info.setup_date).toLocaleDateString('fr-FR') : 'A definir'} ${contract.client_info.setup_time ? 'a ' + contract.client_info.setup_time : ''}</div>
      </div>` : ''}
    </div>
  </div>
`;

const signatureBlock = (clientName, prestataireName, prestataireTitle) => `
  <div class="signatures clearfix" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 4mm; margin-top: 20pt;">
    <div style="flex: 1; max-width: 48%;">
      <div style="text-align: center; padding: 8pt; border: 1pt solid #ccc; min-height: 25mm; height: 35mm;">
        <strong>Le Client</strong><br><br>
        Nom: ${clientName}<br>
        Date: _______________<br>
        <div style="border-bottom: 1pt solid #000; height: 12mm; margin: 8pt 8pt 4pt 8pt;"></div>
        Signature<br>
        <small>Precedee de "Lu et approuve"</small>
      </div>
    </div>
    <div style="flex: 1; max-width: 48%;">
      <div style="text-align: center; padding: 8pt; border: 1pt solid #ccc; min-height: 25mm; height: 35mm;">
        <strong>${prestataireTitle}</strong><br><br>
        Date: ${new Date().toLocaleDateString('fr-FR')}<br>
        <strong style="font-size: 10px;">${prestataireName}</strong>
      </div>
    </div>
  </div>
`;

// ══════════════════════════════════════════════════════════════
// DOCUMENT 1 : CONTRAT DE MANDAT ET LOCATION (R'KEY PROD)
// TVA 20% appliquee, paiement 100% a la signature
// ══════════════════════════════════════════════════════════════
export const generateMandatHTML = (contract, companySettings) => {
  const fraisMandat = contract.frais_mandat || 0;
  const options = (contract.selected_options || []).filter(opt => opt.selected);
  const optionsTotal = options.reduce((sum, opt) => sum + (opt.price || 0), 0);
  const discount = contract.discount_amount || 0;
  // Montants saisis = TTC. On extrait la TVA incluse.
  const totalTTC = Math.max(0, fraisMandat + optionsTotal - discount);
  const totalHT = Math.round((totalTTC / 1.20) * 100) / 100;
  const tva = Math.round((totalTTC - totalHT) * 100) / 100;

  const fmt = (v) => v === 0 ? 'OFFERT' : v.toFixed(2) + ' EUR';
  const fmtHT = (ttc) => ttc === 0 ? 'OFFERT' : (Math.round((ttc / 1.20) * 100) / 100).toFixed(2) + ' EUR';
  const fmtTVA = (ttc) => ttc === 0 ? '-' : (Math.round((ttc - ttc / 1.20) * 100) / 100).toFixed(2) + ' EUR';
  const fmtTTC = (ttc) => ttc === 0 ? 'OFFERT' : ttc.toFixed(2) + ' EUR';


  return `
  <div style="font-family: Arial, 'Noto Color Emoji', sans-serif; font-size: 12px; line-height: 1.3; color: #000; max-width: 200mm; margin: 0 auto; background: white; padding: 8px;">
    <style>${CSS_COMMON}</style>

    <div id="pdf-page-1" class="paraphe-page" style="min-height: 270mm;">
      <div class="header clearfix">
        <div class="header-content">
          <div class="header-left">
            <div class="company-name">R'KEY PROD</div>
            <div class="company-tagline">ANIMATION DJ - LOCATION SON & LUMIERE - SHOW</div>
            <div class="company-address">
              5 rue du Hohlandsbourg<br>
              67390 Marckolsheim<br>
              Tel: 07 83 55 36 74<br>
              Email: info@rkey-prod.fr<br>
              SIRET: 99992355000019
            </div>
          </div>
          <div class="header-right">
            <strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}<br>
            <strong>N° Contrat:</strong> ${contract.invoice_number || 'CTR-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-3)}<br>
            <strong>Document:</strong> 1/2
          </div>
        </div>
      </div>

      <div class="contract-title">Contrat de Mandat de Recherche<br>et Location de Materiel</div>

      <div class="section">
        ${clientInfoBlock(contract)}
      </div>

      <div class="section">
        <div class="section-title">GRILLE TARIFAIRE — MANDAT ET LOCATION</div>
        <table class="compact-pricing-table">
          <thead>
            <tr><th>Designation</th><th>HT</th><th>TVA (20%)</th><th>TTC</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Frais de Mandat et Gestion administrative</strong></td>
              <td>${fmtHT(fraisMandat)}</td>
              <td>${fmtTVA(fraisMandat)}</td>
              <td><strong>${fmtTTC(fraisMandat)}</strong></td>
            </tr>
            ${options.map(opt => `
              <tr>
                <td>+ ${opt.name}</td>
                <td>${fmtHT(opt.price || 0)}</td>
                <td>${fmtTVA(opt.price || 0)}</td>
                <td>${fmtTTC(opt.price || 0)}</td>
              </tr>
            `).join('')}
            ${discount > 0 ? `
              <tr><td>Remise accordee</td><td colspan="2"></td><td style="color:#d32f2f;">-${discount.toFixed(2)} EUR</td></tr>
            ` : ''}
            <tr class="compact-pricing-total">
              <td><strong>TOTAL</strong></td>
              <td><strong>${totalHT.toFixed(2)} EUR</strong></td>
              <td><strong>${tva.toFixed(2)} EUR</strong></td>
              <td><strong>${totalTTC.toFixed(2)} EUR</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">CONDITIONS DE PAIEMENT</div>
        <div class="compact-payment-box">
          <div style="text-align: center; margin-bottom: 8pt;">
            <strong>Montant total a regler a la signature du contrat :</strong><br>
            <span class="amount-big" style="font-size: 18px;">${totalTTC.toFixed(2)} EUR TTC</span>
          </div>
          <div style="margin-top: 8pt; padding-top: 6pt; border-top: 1px solid #ddd;">
            <strong style="font-size: 10px;">Destinataire du paiement : R'KEY PROD</strong><br>
            <span style="font-size: 10px;">
              ${companySettings.bank_name}<br>
              IBAN: ${companySettings.bank_iban}<br>
              BIC: ${companySettings.bank_bic}<br>
              Titulaire: ${companySettings.bank_titulaire}
            </span>
          </div>
        </div>
      </div>

      <div class="paraphe-box" style="color: #d0d0d0;">paraphe</div>
    </div>

    <div id="pdf-page-cgv" class="section" style="min-height: 270mm;">
      <div class="section">
        <div class="section-title">${(contract.cgv_title || "CONDITIONS GENERALES DE VENTE").toUpperCase()}</div>
        <div class="notes-section">
          ${contract.cgv_text ? contract.cgv_text.replace(/\n/g, '<br>') : `
          <p><strong>Article 1 - Objet</strong><br>
          Les presentes conditions generales definissent les droits et obligations des parties dans le cadre du mandat de recherche d'artiste et de la location de materiel evenementiel.</p>
          <p><strong>Article 2 - Prix et modalites de paiement</strong><br>
          Le prix inclut les frais de mandat et la location de materiel. Le montant total TTC est exigible a la signature du present contrat.</p>
          <p><strong>Article 3 - Obligations du mandataire</strong><br>
          R'KEY PROD s'engage a mettre a disposition le materiel decrit et a assurer la mise en relation avec l'artiste selectionne.</p>
          <p><strong>Article 4 - Annulation</strong><br>
          En cas d'annulation par le client, le montant verse reste acquis au mandataire si l'annulation intervient moins de 30 jours avant l'evenement.</p>
          <p><strong>Article 5 - Role du Mandataire</strong><br>
          R'KEY PROD agit exclusivement en qualite de mandataire pour la mise en relation entre le Client et l'Artiste DJ. R'KEY PROD n'est pas le prestataire de l'animation musicale. La prestation artistique fait l'objet d'un contrat separe et distinct entre le Client et l'Artiste.</p>
          `}
        </div>
      </div>

      ${signatureBlock(contract.client_info.name, "R'KEY PROD", "Le Mandataire")}
    </div>
  </div>`;
};

// ══════════════════════════════════════════════════════════════
// DOCUMENT 2 : CONTRAT D'ENGAGEMENT D'ARTISTE DJ
// Sans TVA, paiement le jour J
// ══════════════════════════════════════════════════════════════
export const generateArtisteHTML = (contract, resolveProfile) => {
  const _p = resolveProfile(contract);
  const cachetArtiste = contract.cachet_artiste || 0;
  const isCompany = !!(contract.client_info && contract.client_info.company && contract.client_info.company.trim() !== "");

  const resolvedEventType = (contract.client_info && contract.client_info.event_type === 'custom' && contract.client_info.custom_event_type)
    ? contract.client_info.custom_event_type
    : (contract.client_info ? contract.client_info.event_type : '');

  const isHypnose = resolvedEventType && resolvedEventType.toLowerCase().trim() === 'intervention hypnose';
  const labelPrestation = isHypnose ? "Intervention hypnose" : "Prestation artistique DJ";

  return `
  <div style="font-family: Arial, 'Noto Color Emoji', sans-serif; font-size: 12px; line-height: 1.3; color: #000; max-width: 200mm; margin: 0 auto; background: white; padding: 8px;">
    <style>
      ${CSS_COMMON}
      .artist-header { border-bottom: 2px solid #555; padding-bottom: 8pt; margin-bottom: 12pt; }
      .artist-name-big { font-size: 16pt; font-weight: bold; color: #333; margin-bottom: 2pt; }
      .artist-subtitle { font-size: 12px; color: #666; margin-bottom: 6pt; }
      .section-title { border-left-color: #555; }
    </style>

    <div id="pdf-page-1" class="paraphe-page" style="min-height: 270mm;">
      <div class="artist-header clearfix">
        <div class="header-content">
          <div class="header-left">
            ${_p.logo_url ? `<img src="${_p.logo_url}" alt="${_p.nom_artistique}" style="max-height: 50px; max-width: 250px; object-fit: contain; margin-bottom: 6pt;">` : `
              <div class="artist-name-big">${_p.nom_artistique || _p.nom_complet || _p.name}</div>
            `}
            <div class="artist-subtitle">Artiste DJ Professionnel</div>
            <div class="company-address">
              ${_p.nom_complet || _p.name}<br>
              ${_p.address || ''}${_p.address ? '<br>' : ''}
              ${_p.phone ? `Tel: ${_p.phone}<br>` : ''}
              ${_p.email ? `Email: ${_p.email}<br>` : ''}
              ${_p.siret ? `SIRET: ${_p.siret}` : ''}
            </div>
          </div>
          <div class="header-right">
            <strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}<br>
            <strong>N° Contrat:</strong> ${contract.artiste_invoice_number || (contract.invoice_number ? contract.invoice_number + '-ART' : 'ART-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-3))}<br>
            <strong>Document:</strong> 2/2
          </div>
        </div>
      </div>

      <div class="contract-title">Contrat d'Engagement<br>d'Artiste DJ Professionnel</div>

      <div class="section">
        ${clientInfoBlock(contract)}
      </div>

      <div class="section">
        <div class="section-title">GRILLE TARIFAIRE — PRESTATION ARTISTIQUE</div>
        <table class="compact-pricing-table">
          <thead>
            <tr><th>Designation</th><th>Montant</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${labelPrestation} (Forfait global)</strong><br>
                <small style="color:#555;">incluant l'infrastructure technique (son & lumiere festif) et la performance musicale</small><br>
                <small style="color:#888;">${contract.client_info.event_type || 'Evenement'} — ${contract.client_info.event_date ? new Date(contract.client_info.event_date).toLocaleDateString('fr-FR') : ''}</small>
              </td>
              <td><strong>${cachetArtiste === 0 ? "OFFERT" : cachetArtiste.toFixed(2) + " EUR"}</strong></td>
            </tr>
            <tr class="compact-pricing-total">
              <td><strong>TOTAL (TVA non applicable, art. 293 B du CGI)</strong></td>
              <td><strong>${cachetArtiste === 0 ? "OFFERT" : cachetArtiste.toFixed(2) + " EUR"}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">CONDITIONS DE PAIEMENT</div>
        <div class="compact-payment-box" style="background-color: #fafafa;">
          <div style="text-align: center; margin-bottom: 8pt;">
            <strong>Montant total a regler :</strong><br>
            <span class="amount-big" style="font-size: 18px; color: #333;">${cachetArtiste === 0 ? "OFFERT" : cachetArtiste.toFixed(2) + " EUR"}</span><br>
            ${isCompany ? '' : `<small>A regler lors de l'installation, directement a l'Artiste</small>`}
          </div>
          <div style="margin-top: 8pt; padding-top: 6pt; border-top: 1px solid #ddd;">
            <strong style="font-size: 10px;">Destinataire du paiement : ${_p.nom_complet || _p.nom_artistique || 'Artiste'}</strong><br>
            ${_p.iban ? `
            <span style="font-size: 10px;">
              IBAN: ${_p.iban}${_p.bic ? `<br>BIC: ${_p.bic}` : ''}<br>
              Titulaire: ${_p.nom_complet || _p.nom_artistique}
            </span>
            ` : `<span style="font-size: 10px; color: #999;">Coordonnees bancaires a communiquer</span>`}
          </div>
        </div>
      </div>

      <div class="paraphe-box" style="color: #d0d0d0;">paraphe</div>
    </div>

    <div id="pdf-page-cgv" class="section" style="min-height: 270mm;">
      <div class="section">
        <div class="section-title">${(contract.artiste_cgv_title || "CONDITIONS GENERALES DE L'ARTISTE").toUpperCase()}</div>
        <div class="notes-section">
          ${contract.artiste_cgv_text ? contract.artiste_cgv_text.replace(/\n/g, '<br>') : `
          <p><strong>Article 1 - Objet</strong><br>
          Le present contrat definit les conditions d'engagement de l'Artiste DJ pour la prestation artistique musicale decrite ci-dessus.</p>
          <p><strong>Article 2 - Obligations de l'Artiste</strong><br>
          L'Artiste s'engage a assurer la prestation d'animation musicale incluant l'infrastructure technique (son et lumiere festif) et la performance musicale, pour la duree et aux conditions decrites dans le present contrat.</p>
          <p><strong>Article 3 - Obligations du Client</strong><br>
          Le Client s'engage a mettre a disposition les installations electriques necessaires, a faciliter l'acces au lieu de prestation et a regler le montant convenu selon les modalites definies.</p>
          <p><strong>Article 4 - Annulation</strong><br>
          En cas d'annulation par le client moins de 30 jours avant l'evenement, le montant total reste du a l'Artiste.</p>
          <p><strong>Article 5 - Clause de sous-traitance</strong><br>
          Le present contrat lie le Client directement a l'Artiste DJ pour la prestation musicale. R'KEY PROD n'intervient qu'en tant que mandataire pour la recherche de l'artiste et ne saurait etre tenu responsable de l'execution de la prestation artistique.</p>
          `}
        </div>
      </div>

      ${signatureBlock(contract.client_info.name, _p.nom_complet || _p.nom_artistique || _p.name, "L'Artiste DJ")}
    </div>
  </div>`;
};


// ══════════════════════════════════════════════════════════════
// MODE ENTREPRISE : 1 seul contrat global R'KEY PROD
// Animateur mentionné par nom uniquement, pas de SIRET/IBAN artiste
// TVA 20% extraite des montants TTC saisis
// ══════════════════════════════════════════════════════════════
export const generateEntrepriseHTML = (contract, companySettings) => {
  const basePrice = contract.base_price || 0;
  const options = (contract.selected_options || []).filter(opt => opt.selected);
  const optionsTotal = options.reduce((sum, opt) => sum + (opt.price || 0), 0);
  const discount = contract.discount_amount || 0;
  // Mode Entreprise: base_price = TTC saisi, extraction TVA
  const totalTTC = Math.max(0, basePrice + optionsTotal - discount);
  const totalHT = Math.round((totalTTC / 1.20) * 100) / 100;
  const tva = Math.round((totalTTC - totalHT) * 100) / 100;

  const fmt = (v) => v === 0 ? 'OFFERT' : v.toFixed(2) + ' EUR';
  const fmtHT = (ttc) => ttc === 0 ? 'OFFERT' : (Math.round((ttc / 1.20) * 100) / 100).toFixed(2) + ' EUR';
  const fmtTVA = (ttc) => ttc === 0 ? '-' : (Math.round((ttc - ttc / 1.20) * 100) / 100).toFixed(2) + ' EUR';
  const fmtTTC = (ttc) => ttc === 0 ? 'OFFERT' : ttc.toFixed(2) + ' EUR';

  const djProfile = contract.dj_profile_data || {};
  const djName = djProfile.nom_complet || djProfile.name || djProfile.nom_artistique || 'Animateur';

  const acompte30 = Math.round(totalTTC * 0.30 * 100) / 100;
  const solde70 = Math.round((totalTTC - acompte30) * 100) / 100;

  const resolvedEventType = (contract.client_info && contract.client_info.event_type === 'custom' && contract.client_info.custom_event_type)
    ? contract.client_info.custom_event_type
    : (contract.client_info ? contract.client_info.event_type : '');

  const isHypnose = resolvedEventType && resolvedEventType.toLowerCase().trim() === 'intervention hypnose';
  const labelPrestation = isHypnose ? "Intervention hypnose" : "Prestation artistique DJ";

  return `
  <div style="font-family: Arial, 'Noto Color Emoji', sans-serif; font-size: 12px; line-height: 1.3; color: #000; max-width: 200mm; margin: 0 auto; background: white; padding: 8px;">
    <style>${CSS_COMMON}</style>

    <div id="pdf-page-1" class="paraphe-page" style="min-height: 270mm;">
      <div class="header clearfix">
        <div class="header-content">
          <div class="header-left">
            <div class="company-name">R'KEY PROD</div>
            <div class="company-tagline">ANIMATION DJ - LOCATION SON & LUMIERE - SHOW</div>
            <div class="company-address">
              5 rue du Hohlandsbourg<br>
              67390 Marckolsheim<br>
              Tel: 07 83 55 36 74<br>
              Email: info@rkey-prod.fr<br>
              SIRET: 99992355000019
            </div>
          </div>
          <div class="header-right">
            <strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}<br>
            <strong>N° Contrat:</strong> ${contract.invoice_number || 'CTR-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-3)}
          </div>
        </div>
      </div>

      <div class="contract-title">Contrat de Prestation<br>Evenementielle</div>

      <div class="section">
        ${clientInfoBlock(contract)}
      </div>

      <div class="section">
        <div class="section-title">PRESTATION</div>
        <p style="margin: 6pt 0; font-size: 11px;">
          Prestation assuree par <strong>${djName}</strong>
        </p>
      </div>

      <div class="section">
        <div class="section-title">GRILLE TARIFAIRE</div>
        <table class="compact-pricing-table">
          <thead>
            <tr><th>Designation</th><th>HT</th><th>TVA (20%)</th><th>TTC</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${labelPrestation} (Forfait global)</strong><br>
                <small style="color:#555;">incluant l'infrastructure technique (son & lumiere festif) et la performance musicale</small>
              </td>
              <td>${totalHT.toFixed(2)} EUR</td>
              <td>${tva.toFixed(2)} EUR</td>
              <td><strong>${totalTTC.toFixed(2)} EUR</strong></td>
            </tr>
            ${options.length > 0 ? `
              <tr><td colspan="4" style="font-size:10px; color:#666; padding-top:2pt;">
                Detail inclus : ${options.map(o => o.name + (o.price === 0 ? ' (OFFERT)' : '')).join(', ')}
              </td></tr>
            ` : ''}
            ${discount > 0 ? `
              <tr><td>Remise accordee</td><td colspan="2"></td><td style="color:#d32f2f;">-${discount.toFixed(2)} EUR</td></tr>
              <tr class="compact-pricing-total">
                <td><strong>TOTAL</strong></td>
                <td><strong>${totalHT.toFixed(2)} EUR</strong></td>
                <td><strong>${tva.toFixed(2)} EUR</strong></td>
                <td><strong>${totalTTC.toFixed(2)} EUR</strong></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">CONDITIONS DE PAIEMENT</div>
        <div class="compact-payment-box">
          <div class="clearfix" style="display:flex; gap:8pt;">
            <div style="flex:1; border: 1.5px solid #1565c0; border-radius: 6px; padding: 8px; background: #f5f9ff; text-align:center;">
              <strong>Acompte (30%)</strong><br>
              <span class="amount-big">${acompte30.toFixed(2)} EUR</span><br>
              <small>A regler a la signature</small>
            </div>
            <div style="flex:1; border: 1px solid #ccc; border-radius: 6px; padding: 8px; text-align:center;">
              <strong>Solde (70%)</strong><br>
              <span class="amount-big">${solde70.toFixed(2)} EUR</span><br>
              <small>A regler dans la semaine de l'evenement</small>
            </div>
          </div>
          <div style="margin-top: 8pt; padding-top: 6pt; border-top: 1px solid #ddd;">
            <strong style="font-size: 10px;">Destinataire du paiement : R'KEY PROD</strong><br>
            <span style="font-size: 10px;">
              ${companySettings.bank_name}<br>
              IBAN: ${companySettings.bank_iban}<br>
              BIC: ${companySettings.bank_bic}<br>
              Titulaire: ${companySettings.bank_titulaire}
            </span>
          </div>
        </div>
      </div>

      <div class="paraphe-box" style="color: #d0d0d0;">paraphe</div>
    </div>

    <div id="pdf-page-cgv" class="section" style="min-height: 270mm;">
      <div class="section">
        <div class="section-title">${(contract.cgv_title || "CONDITIONS GENERALES DE VENTE").toUpperCase()}</div>
        <div class="notes-section">
          ${contract.cgv_text ? contract.cgv_text.replace(/\n/g, '<br>') : `
          <p><strong>Article 1 - Objet</strong><br>
          Les presentes conditions generales definissent les droits et obligations des parties dans le cadre de la prestation evenementielle.</p>
          <p><strong>Article 2 - Prix et modalites de paiement</strong><br>
          Le montant total TTC est exigible a la signature du present contrat. Tout retard de paiement entrainera des penalites de retard.</p>
          <p><strong>Article 3 - Obligations du prestataire</strong><br>
          R'KEY PROD s'engage a fournir la prestation decrite, incluant l'animation musicale et le materiel evenementiel.</p>
          <p><strong>Article 4 - Annulation</strong><br>
          En cas d'annulation par le client, le montant verse reste acquis si l'annulation intervient moins de 30 jours avant l'evenement.</p>
          <p><strong>Article 5 - Responsabilite</strong><br>
          R'KEY PROD est responsable de la bonne execution de l'ensemble de la prestation contractualisee.</p>
          `}
        </div>
      </div>

      ${signatureBlock(contract.client_info.name, "R'KEY PROD", "Le Prestataire")}
    </div>
  </div>`;
};
