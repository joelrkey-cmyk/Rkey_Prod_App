// Génération du HTML pour les contrats PDF
// Ce fichier contient la logique de génération du template HTML multi-pages

import { calculateContractDepositAmount, calculateContractTotal, calculateContractRemainingBalance } from './calculations';

// Génération du HTML SÉPARÉ par page pour PDF correct
export const generateContractHTML = (contract, clientSignature, signatureImages, companySettings, predefinedNotes, resolveProfile, options = {}) => {
  const { mode = 'full' } = options || {}; // 'full', 'contract-only', 'technical-only'
  
  const _p = resolveProfile(contract);

  // Fonctions utilitaires pour vérifier si les sections ont du contenu
  const hasEventScheduleContent = () => {
    const hasEvents = contract.event_order && contract.event_order.length > 0;
    const hasEventNotes = contract.event_notes && contract.event_notes.trim().length > 0;
    return hasEvents || hasEventNotes;
  };

  const hasDJNotesContent = () => {
    const hasMusicStyles = contract.selected_music_styles && contract.selected_music_styles.length > 0;
    const hasBlacklist = contract.blacklist && contract.blacklist.trim().length > 0;
    const hasAperitifMusic = contract.background_music_aperitif && contract.background_music_aperitif.trim().length > 0;
    return hasMusicStyles || hasBlacklist || hasAperitifMusic;
  };

  const hasTechnicalNotesContent = () => {
    return contract.selected_notes && contract.selected_notes.length > 0;
  };

  const hasTechnicalRoomInfo = contract.has_limiteur_son || contract.has_detecteur_fumee || contract.has_no_limiteur_ni_detecteur || contract.has_wifi || contract.has_4g_5g;

  // PAGE 1 - INFOS CLIENT + GRILLE TARIFAIRE + CONDITIONS PAIEMENT
  const page1HTML = `
    <div id="pdf-page-1" class="paraphe-page" style="min-height: 270mm;">
      <div class="header clearfix">
        <div class="header-content">
          <div class="header-left">
            <div class="company-name">R'KEY PROD</div>
            <div class="company-tagline">ANIMATION DJ - LOCATION SON & LUMIÈRE - SHOW</div>
            <div class="company-address">
              5 rue du Hohlandsbourg<br>
              67390 Marckolsheim<br>
              📞 07 83 55 36 74<br>
              ✉ info@rkey-prod.fr<br>
              SIRET: 99992355000019
            </div>
          </div>
          <div class="header-right">
            <strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}<br>
            <strong>N° Contrat:</strong> ${contract.invoice_number || 'CTR-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-3)}<br><br>
            <div style="font-size: 11px;">
              <strong>Prestataire:</strong><br>
              ${_p.name}<br>
              ${_p.phone ? `${_p.phone}<br>` : ''}
              ${_p.email ? `${_p.email}<br>` : ''}
              ${_p.siret ? `SIRET: ${_p.siret}` : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div class="contract-title">Contrat de Prestation Artistique</div>
      
      <div class="section">
        <div class="two-columns clearfix">
          <div class="column-left">
            <div class="section-title">INFORMATIONS CLIENT PRINCIPAL</div>
            <div class="info-item"><span class="info-label">Nom:</span> ${contract.client_info.name}</div>
            ${contract.client_info.company ? `<div class="info-item"><span class="info-label">Entreprise:</span> ${contract.client_info.company}</div>` : ''}
            <div class="info-item"><span class="info-label">Email:</span> ${contract.client_info.email}</div>
            <div class="info-item"><span class="info-label">Téléphone:</span> ${contract.client_info.phone || 'Non renseigné'}</div>
            ${contract.client_info.phone2 ? `<div class="info-item"><span class="info-label">Téléphone 2:</span> ${contract.client_info.phone2}</div>` : ''}
            ${contract.client_info.address ? `<div class="info-item"><span class="info-label">Adresse:</span> ${contract.client_info.address}</div>` : ''}
          </div>
          
          <div class="column-right">
            <div class="section-title">DÉTAILS ÉVÉNEMENT</div>
            <div class="info-item"><span class="info-label">Type:</span> ${contract.client_info.event_type === 'custom' && contract.client_info.custom_event_type ? contract.client_info.custom_event_type : contract.client_info.event_type}${contract.client_info.event_note ? ` — ${contract.client_info.event_note}` : ''}</div>
            <div class="info-item"><span class="info-label">Date:</span> ${new Date(contract.client_info.event_date).toLocaleDateString('fr-FR')}</div>
            <div class="info-item"><span class="info-label">Lieu:</span> ${contract.client_info.event_location}</div>
            ${contract.client_info.guest_count ? `<div class="info-item"><span class="info-label">Invités:</span> ${contract.client_info.guest_count}</div>` : ''}
            <div class="info-item"><span class="info-label">Début:</span> ${contract.client_info.start_time || 'À définir'}</div>
            <div class="info-item"><span class="info-label">Fin:</span> ${contract.client_info.unlimited_time ? 'Sans limite' : (contract.client_info.end_time || 'À définir')}</div>
            
            ${contract.client_info.setup_date || contract.client_info.setup_time ? `
            <div style="margin-top: 8pt; padding-top: 4pt; border-top: 1px solid #ddd;">
              <div class="info-item"><span class="info-label">Installation :</span> ${contract.client_info.setup_date ? new Date(contract.client_info.setup_date).toLocaleDateString('fr-FR') : 'À définir'} ${contract.client_info.setup_time ? 'à ' + contract.client_info.setup_time : ''}</div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      
      ${contract.selected_options && contract.selected_options.filter(opt => opt.selected).length > 0 ? `
      <div class="section">
        <div class="section-title">GRILLE TARIFAIRE</div>
        <table class="compact-pricing-table">
          <thead>
            <tr>
              <th>Prestation</th>
              <th>Prix</th>
            </tr>
          </thead>
          <tbody>
            ${contract.contract_mode === 'mandataire' ? `
              <tr>
                <td><strong>Frais de Mandat & Gestion (R'KEY PROD)</strong></td>
                <td><strong>${(contract.frais_mandat || 0).toFixed(2)} €</strong></td>
              </tr>
              <tr>
                <td><strong>Cachet Artiste (Part DJ)</strong></td>
                <td><strong>${(contract.cachet_artiste || 0).toFixed(2)} €</strong></td>
              </tr>
            ` : `
              <tr>
                <td><strong>Prestation artistique ${contract.client_info.unlimited_time ? '(sans limite horaire)' : (contract.client_info.end_time ? `(jusqu'à ${contract.client_info.end_time})` : '')}</strong></td>
                <td><strong>${(contract.base_price || 0).toFixed(2)} €</strong></td>
              </tr>
            `}
            ${contract.selected_options.filter(opt => opt.selected).map(option => `
              <tr>
                <td>+ ${option.name}</td>
                <td>${(option.price || 0).toFixed(2)} €</td>
              </tr>
            `).join('')}
            ${contract.discount_amount > 0 ? `
            <tr>
              <td><strong>Remise accordée sur acompte</strong></td>
              <td style="color: #d32f2f;">-${(contract.discount_amount || 0).toFixed(2)} €</td>
            </tr>
            ` : ''}
            <tr class="compact-pricing-total">
              <td><strong>TOTAL TTC</strong></td>
              <td><strong>${calculateContractTotal(contract).toFixed(2)} €</strong></td>
            </tr>
          </tbody>
        </table>
        <div style="font-size: 9px; color: #666; text-align: right; margin-top: 2px;">
          TVA non applicable, article 293 B du CGI
        </div>
        ${contract.options_tarif_notes ? `
        <div style="margin-top: 8px; padding: 6px; background-color: #f8f9fa; border-left: 3px solid #2196F3; border-radius: 3px;">
          <div style="font-size: 10px; font-weight: bold; color: #1976D2; margin-bottom: 3px;">Notes :</div>
          <div style="font-size: 9px; color: #424242; line-height: 1.4; white-space: pre-wrap;">${contract.options_tarif_notes}</div>
        </div>
        ` : ''}
      </div>
      ` : `
      <div class="section">
        <div class="section-title">GRILLE TARIFAIRE</div>
        <table class="compact-pricing-table">
          <thead>
            <tr>
              <th>Prestation</th>
              <th>Prix</th>
            </tr>
          </thead>
          <tbody>
            ${contract.contract_mode === 'mandataire' ? `
              <tr>
                <td><strong>Frais de Mandat & Gestion (R'KEY PROD)</strong></td>
                <td><strong>${(contract.frais_mandat || 0).toFixed(2)} €</strong></td>
              </tr>
              <tr>
                <td><strong>Cachet Artiste (Part DJ)</strong></td>
                <td><strong>${(contract.cachet_artiste || 0).toFixed(2)} €</strong></td>
              </tr>
            ` : `
              <tr>
                <td><strong>Prestation artistique ${contract.client_info.unlimited_time ? '(sans limite horaire)' : (contract.client_info.end_time ? `(jusqu'à ${contract.client_info.end_time})` : '')}</strong></td>
                <td><strong>${(contract.base_price || 0).toFixed(2)} €</strong></td>
              </tr>
            `}
            ${contract.discount_amount > 0 ? `
            <tr>
              <td><strong>Remise accordée sur acompte</strong></td>
              <td style="color: #d32f2f;">-${(contract.discount_amount || 0).toFixed(2)} €</td>
            </tr>
            ` : ''}
            <tr class="compact-pricing-total">
              <td><strong>TOTAL TTC</strong></td>
              <td><strong>${calculateContractTotal(contract).toFixed(2)} €</strong></td>
            </tr>
          </tbody>
        </table>
        <div style="font-size: 9px; color: #666; text-align: right; margin-top: 2px;">
          TVA non applicable, article 293 B du CGI
        </div>
        ${contract.options_tarif_notes ? `
        <div style="margin-top: 8px; padding: 6px; background-color: #f8f9fa; border-left: 3px solid #2196F3; border-radius: 3px;">
          <div style="font-size: 10px; font-weight: bold; color: #1976D2; margin-bottom: 3px;">Notes :</div>
          <div style="font-size: 9px; color: #424242; line-height: 1.4; white-space: pre-wrap;">${contract.options_tarif_notes}</div>
        </div>
        ` : ''}
      </div>
      `}
      
      <div class="section">
        <div class="section-title">CONDITIONS DE PAIEMENT</div>
        <div class="compact-payment-box">
          ${contract.no_deposit_required ? `
            <!-- Client de confiance - Pas d'acompte -->
            <div class="payment-amounts clearfix">
              <div class="payment-center" style="text-align: center; width: 100%;">
                <strong>Client de confiance - Aucun acompte requis</strong><br>
                <span class="amount-big">${calculateContractTotal(contract).toFixed(2)} €</span><br>
                <small>Montant total à régler le jour de l'événement</small>
              </div>
            </div>
          ` : `
            <!-- Paiement standard avec acompte -->
            <div class="payment-amounts clearfix">
              <div class="payment-left" style="${_p.statut_artiste === 'freelance' ? 'border: 1.5px solid #1565c0; border-radius: 6px; padding: 8px; background: #f5f9ff;' : ''}">
                <strong>Acompte :</strong><br>
                <span class="amount-big">${calculateContractDepositAmount(contract).toFixed(2)} €</span><br>
                ${contract.deposit_paid ? `
                  <div style="background-color: #e8f5e9; border: 1px solid #4caf50; border-radius: 4px; padding: 6px; margin-top: 5px;">
                    <strong style="font-size: 9px; color: #2e7d32;">ACOMPTE DÉJÀ RÉGLÉ</strong><br>
                    <span style="font-size: 9px; color: #333;">
                      Mode : ${contract.deposit_payment_method === 'virement' ? 'Virement bancaire' : 
                               contract.deposit_payment_method === 'especes' ? 'Espèces' : 
                               contract.deposit_payment_method === 'cheque' ? 'Chèque' : 
                               contract.deposit_payment_method === 'carte' ? 'Carte bancaire' : 'Non précisé'}
                      ${contract.deposit_paid_date ? `<br>Date : ${new Date(contract.deposit_paid_date).toLocaleDateString('fr-FR')}` : ''}
                    </span>
                  </div>
                ` : `<small>À la signature du contrat</small>`}
                ${_p.statut_artiste === 'freelance' ? `<br><small style="font-style: italic; color: #666; font-size: 9px; margin-top: 4px; display: block;">Le versement de l'acompte est destiné à la couverture des frais de location de matériel et des frais administratifs, et n'est pas remboursable.</small>` : ''}
                ${_p.statut_artiste === 'freelance' ? `
                  <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #bbdefb;">
                    <strong style="font-size: 9px;">Coordonnées bancaires (acompte) :</strong><br>
                    <span style="font-size: 9px;">${companySettings.bank_name}<br>IBAN: ${companySettings.bank_iban}<br>BIC: ${companySettings.bank_bic}<br>Titulaire: ${companySettings.bank_titulaire}</span>
                  </div>
                ` : ''}
              </div>
              <div class="payment-right" style="${_p.statut_artiste === 'freelance' ? 'border: 1.5px solid #2e7d32; border-radius: 6px; padding: 8px; background: #f5fdf5;' : ''}">
                <strong>Solde :</strong><br>
                <span class="amount-big">${calculateContractRemainingBalance(contract).toFixed(2)} €</span><br>
                <small>À régler lors de l'installation</small>
                ${_p.statut_artiste === 'freelance' && _p.iban ? `
                  <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #a5d6a7;">
                    <strong style="font-size: 9px;">Coordonnées bancaires (solde) :</strong><br>
                    <span style="font-size: 9px;">IBAN: ${_p.iban}${_p.bic ? `<br>BIC: ${_p.bic}` : ''}<br>Titulaire: ${_p.nom_complet || _p.nom_artistique || 'Artiste'}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `}
          
          ${_p.statut_artiste !== 'freelance' ? `
          <!-- Section coordonnées bancaires pour dirigeant -->
          <div style="margin-top: 8pt; padding-top: 6pt; border-top: 1px solid #ddd;">
            <div class="payment-amounts clearfix">
              <div class="payment-left">
                <strong style="font-size: 10px;">Coordonnées bancaires :</strong><br>
                <span style="font-size: 10px;">${companySettings.bank_name}<br>IBAN: ${companySettings.bank_iban}<br>BIC: ${companySettings.bank_bic}<br>Titulaire: ${companySettings.bank_titulaire}</span>
              </div>
              <div class="payment-right">
                <div style="font-size: 10px;">&nbsp;</div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>

      ${(contract.catering_notes || contract.catering_drinks || contract.catering_hot_meal_no_table) ? `
      <div style="margin-top: 10px; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9; border-radius: 4px; font-size: 11px;">
        <span style="font-weight: bold; color: #555; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">🍽️ Catering :</span>
        <span style="color: #333;">
          ${contract.catering_notes ? `${contract.catering_notes}. ` : ''}
          ${contract.catering_drinks ? 'Boissons comprises. ' : ''}
          ${contract.catering_hot_meal_no_table ? `Repas chaud sans place à table prévu (${contract.catering_hot_meal_no_table_qty || 1} repas).` : ''}
        </span>
      </div>
      ` : ''}
      
      <div class="paraphe-box" style="color: #d0d0d0;">paraphe</div>
    </div>
  `;

  // PAGE 2 - DÉROULEMENT SOIRÉE + NOTES DJ (ou Programme Show Hypnose)
  const page2HTML = contract.client_info.event_type === 'Show Hypnose' ? `
    <div id="pdf-page-2" class="paraphe-page">
      <div class="section">
        <div class="section-title">PROGRAMME SHOW HYPNOSE - DÉROULEMENT DU JOUR J</div>
        
        <div style="background-color: #f3e5f5; border: 1px solid #9c27b0; border-radius: 4px; padding: 8px; margin: 8px 0;">
          <h4 style="color: #7b1fa2; font-size: 11px; margin: 0 0 6px 0;">Horaires du Spectacle</h4>
          <div style="font-size: 10px; line-height: 1.4;">
            <div><strong>Début du spectacle :</strong> ${contract.hypnosis_program?.showStartTime || '20:30'}</div>
            <div><strong>Entracte :</strong> ${contract.hypnosis_program?.intermissionTime || '21:30'} (durée: ${contract.hypnosis_program?.intermissionDuration || '25'} min)</div>
            <div><strong>Reprise 2ème partie :</strong> ${contract.hypnosis_program?.secondPartTime || '22:00'}</div>
            <div><strong>Fin du spectacle :</strong> ${contract.hypnosis_program?.showEndTime || '23:30'}</div>
          </div>
        </div>

        <div style="background-color: #e8f5e8; border: 1px solid #4caf50; border-radius: 4px; padding: 8px; margin: 8px 0;">
          <h4 style="color: #388e3c; font-size: 11px; margin: 0 0 6px 0;">🔧 Planning Technique</h4>
          <div style="font-size: 10px; line-height: 1.4;">
            <div><strong>Arrivée techniciens :</strong> ${contract.hypnosis_program?.techniciansArrival || '09:00'}</div>
            <div><strong>Pause déjeuner :</strong> ${contract.hypnosis_program?.techniciansLunch || '12:00'}</div>
            <div><strong>Réglages son/lumières :</strong> ${contract.hypnosis_program?.soundLightAdjustments || '13:00-18:30'}</div>
            <div><strong>Arrivée artiste :</strong> ${contract.hypnosis_program?.artistArrival || '18:30'}</div>
            <div><strong>Ouverture des portes :</strong> ${contract.hypnosis_program?.doorsOpen || '19:30'}</div>
            <div><strong>Fin démontage :</strong> ${contract.hypnosis_program?.dismantlingEnd || '01:00'}</div>
          </div>
        </div>

        ${contract.technician_contact && (contract.technician_contact.name || contract.technician_contact.email || contract.technician_contact.phone) ? `
        <div style="background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; padding: 8px; margin: 8px 0;">
          <h4 style="color: #1976d2; font-size: 11px; margin: 0 0 6px 0;">👨‍🔧 Contact Technicien de Salle</h4>
          <div style="font-size: 10px; line-height: 1.4;">
            ${contract.technician_contact.name ? `<div><strong>Nom :</strong> ${contract.technician_contact.name}</div>` : ''}
            ${contract.technician_contact.email ? `<div><strong>Email :</strong> ${contract.technician_contact.email}</div>` : ''}
            ${contract.technician_contact.phone ? `<div><strong>Téléphone :</strong> ${contract.technician_contact.phone}</div>` : ''}
          </div>
        </div>
        ` : ''}

        ${(contract.hypnosis_program?.cateringLunchCount || contract.hypnosis_program?.cateringDinnerCount) ? `
        <div style="background-color: #ffeaa7; border: 1px solid #fdcb6e; border-radius: 4px; padding: 8px; margin: 8px 0;">
          <h4 style="color: #e17055; font-size: 11px; margin: 0 0 6px 0;">Catering pour les Techniciens</h4>
          <div style="font-size: 10px; line-height: 1.4;">
            ${contract.hypnosis_program.cateringLunchCount ? `<div><strong>Repas midi :</strong> ${contract.hypnosis_program.cateringLunchCount} personne(s)</div>` : ''}
            ${contract.hypnosis_program.cateringDinnerCount ? `<div><strong>Repas soir :</strong> ${contract.hypnosis_program.cateringDinnerCount} personne(s)</div>` : ''}
          </div>
        </div>
        ` : ''}

        <div style="margin-top: 15px; padding: 8px; background-color: #fff3e0; border-left: 3px solid #ff9800; font-size: 10px;">
          <strong>Points importants :</strong><br>
          • Ce planning est adaptable selon vos contraintes<br>
          • La coordination avec le technicien de salle est essentielle<br>
          • Les horaires techniques sont indicatifs et ajustables
        </div>
      </div>
      
      <div class="paraphe-box" style="color: #d0d0d0;">paraphe</div>
    </div>
  ` : (hasEventScheduleContent() || hasDJNotesContent()) ? `
    <div id="pdf-page-2" class="paraphe-page" style="min-height: 270mm;">
      <div class="section" style="margin-top: 5pt; margin-bottom: 15pt; display: flex; justify-content: center;">
        <div style="display: flex; gap: 15pt; background: #fffaf0; border: 1px solid #ffe8cc; padding: 8pt 20pt; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="text-align: center;">
            <div style="text-transform: uppercase; font-size: 8px; font-weight: bold; color: #FF6B00; margin-bottom: 2pt;">🕒 Installation</div>
            <div style="font-size: 11px; font-weight: 600;">${contract.client_info.setup_date ? new Date(contract.client_info.setup_date).toLocaleDateString('fr-FR') : 'À définir'} ${contract.client_info.setup_time ? 'à ' + contract.client_info.setup_time : ''}</div>
          </div>
          <div style="width: 1px; background: #ffe8cc;"></div>
          <div style="text-align: center;">
            <div style="text-transform: uppercase; font-size: 8px; font-weight: bold; color: #FF6B00; margin-bottom: 2pt;">🎵 Début Prestation</div>
            <div style="font-size: 11px; font-weight: 600;">${contract.client_info.start_time || 'À définir'}</div>
          </div>
        </div>
      </div>

      <div class="section infographic-section">
        <div class="infographic-header">ORGANISATION DE LA SOIRÉE</div>
        
        ${contract.event_order && contract.event_order.length > 0 ? `
        <div class="infographic-container">
          ${contract.event_order.map((event) => `
            <div class="infographic-item">
              <span class="infographic-icon">${event.icon || '•'}</span>
              <span class="infographic-label">${event.label}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${contract.event_notes ? `
        <div style="margin-top: 12pt; padding: 8pt; background-color: #fdfdfd; border-top: 1px solid #eee; border-bottom: 1px solid #eee; font-size: 11px; color: #444; width: 94%; margin-left: auto; margin-right: auto; text-align: center;">
          <div style="text-transform: uppercase; font-weight: bold; color: #FF6B00; margin-bottom: 5pt; letter-spacing: 1px; font-size: 10px;">Notes sur le déroulement</div>
          <div style="line-height: 1.5; font-style: italic;">${contract.event_notes.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}
      </div>

      <div class="section" style="margin-top: 15pt;">
        <div class="two-columns clearfix">
          <div class="column-left">
            <div class="section-title">OPTIONS VALIDÉES</div>
            <div style="font-size: 11px; line-height: 1.5; margin-bottom: 12pt;">
              ${contract.selected_options && contract.selected_options.filter(opt => opt.selected).length > 0 
                ? contract.selected_options.filter(opt => opt.selected).map(opt => `• ${opt.name}`).join('<br>')
                : 'Aucune option supplémentaire'}
            </div>
            
            <div class="section-title">CONTRAINTES TECHNIQUES SALLE</div>
            <div style="font-size: 11px; line-height: 1.5;">
              ${contract.has_limiteur_son ? '⚠️ Salle équipée d\'un limiteur de son<br>' : ''}
              ${contract.has_detecteur_fumee ? '🚫 Détecteur de fumée : Machines à fumée proscrites<br>' : ''}
              ${contract.has_no_limiteur_ni_detecteur ? '✅ Aucune contrainte sonore ou fumée spécifique<br>' : ''}
              ${contract.has_wifi ? '📶 Wi-Fi disponible dans la salle<br>' : ''}
              ${contract.has_4g_5g ? '📱 Réseau 4G/5G disponible<br>' : ''}
              ${!hasTechnicalRoomInfo ? 'Non renseigné' : ''}
            </div>
          </div>
          
          <div class="column-right">
            <div class="section-title">NOTES DJ & MUSIQUE</div>
            <div style="font-size: 11px; line-height: 1.5;">
              ${contract.selected_music_styles && contract.selected_music_styles.length > 0 ? `
                <strong>Styles souhaités :</strong> ${contract.selected_music_styles.join(', ')}<br>
              ` : ''}
              ${contract.background_music_aperitif ? `
                <div style="margin-top: 4pt;"><strong>🍸 Ambiance apéritif :</strong> ${contract.background_music_aperitif}</div>
              ` : ''}
              ${contract.blacklist ? `
                <div style="color: #d32f2f; margin-top: 6pt; background: #fff5f5; padding: 4pt; border: 1px solid #fed7d7; border-radius: 4px;">
                  <strong>🚫 À ÉVITER :</strong> ${contract.blacklist}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div class="paraphe-box" style="color: #d0d0d0;">paraphe</div>
    </div>
  ` : '';

  // PAGE 3+ - NOTES TECHNIQUES (Backup/Hidden if using mode filters)
  const NOTES_PER_PAGE = 3;
  let page3HTML = '';
  const hasSelectedNotes = contract.selected_notes && contract.selected_notes.length > 0;

  if (contract.client_info.event_type !== 'Show Hypnose' && (hasTechnicalNotesContent() && hasSelectedNotes)) {
    const notesWithContent = contract.selected_notes.map(noteKey => {
      const contractNote = contract.predefined_notes && contract.predefined_notes[noteKey];
      const dbNote = predefinedNotes && predefinedNotes[noteKey];
      return contractNote || dbNote;
    }).filter(note => note);

    const noteGroups = [];
    for (let i = 0; i < notesWithContent.length; i += NOTES_PER_PAGE) {
      noteGroups.push(notesWithContent.slice(i, i + NOTES_PER_PAGE));
    }

    page3HTML = noteGroups.map((group, groupIndex) => {
      const pageId = groupIndex === 0 ? 'pdf-page-3' : `pdf-page-3-${String.fromCharCode(98 + groupIndex - 1)}`;
      const isFirstPage = groupIndex === 0;
      const isLastPage = groupIndex === noteGroups.length - 1;

      return `
      <div id="${pageId}" class="paraphe-page" style="min-height: 270mm;">
        <div class="section">
          ${isFirstPage ? '<div class="section-title">NOTES TECHNIQUES</div>' : '<div class="section-title">NOTES TECHNIQUES (suite)</div>'}
          ${group.map(note => `
            <div class="technical-note">
              <strong>${note.title}</strong><br>
              ${note.content.replace(/\n/g, '<br>')}
            </div>
          `).join('')}
          ${isLastPage && hasTechnicalRoomInfo ? `
            <div class="technical-note" style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #6c757d;">
              <strong>🔧 Informations techniques de la salle</strong><br>
              ${contract.has_limiteur_son ? '• La salle dispose d\'un <strong>limiteur de son</strong> - Le DJ adaptera son matériel en conséquence<br>' : ''}
              ${contract.has_detecteur_fumee ? '• 🚨 La salle dispose d\'un <strong>détecteur de fumée</strong> - L\'utilisation de fumigènes/machines à fumée est à proscrire<br>' : ''}
              ${contract.has_no_limiteur_ni_detecteur ? '• La salle ne dispose <strong>ni de limiteur de son, ni de détecteur de fumée</strong><br>' : ''}
              ${contract.has_wifi ? '• La salle dispose d\'une connexion <strong>Wi-Fi</strong> disponible<br>' : ''}
              ${contract.has_4g_5g ? '• La salle dispose d\'une couverture réseau <strong>4G/5G</strong> disponible<br>' : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="paraphe-box" style="color: #d0d0d0;">paraphe</div>
      </div>
      `;
    }).join('');

    if (page3HTML === '' && hasTechnicalRoomInfo) {
      page3HTML = `
      <div id="pdf-page-3" class="paraphe-page" style="min-height: 270mm;">
        <div class="section">
          <div class="section-title">NOTES TECHNIQUES</div>
          <div class="technical-note" style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #6c757d;">
            <strong>🔧 Informations techniques de la salle</strong><br>
            ${contract.has_limiteur_son ? '• La salle dispose d\'un <strong>limiteur de son</strong> - Le DJ adaptera son matériel en conséquence<br>' : ''}
            ${contract.has_detecteur_fumee ? '• 🚨 La salle dispose d\'un <strong>détecteur de fumée</strong> - L\'utilisation de fumigènes/machines à fumée est à proscrire<br>' : ''}
            ${contract.has_no_limiteur_ni_detecteur ? '• La salle ne dispose <strong>ni de limiteur de son, ni de détecteur de fumée</strong><br>' : ''}
            ${contract.has_wifi ? '• La salle dispose d\'une connexion <strong>Wi-Fi</strong> disponible<br>' : ''}
            ${contract.has_4g_5g ? '• La salle dispose d\'une couverture réseau <strong>4G/5G</strong> disponible<br>' : ''}
          </div>
        </div>
        
        <div class="paraphe-box" style="color: #d0d0d0;">paraphe</div>
      </div>
      `;
    }
  }

  // PAGE CGV + SIGNATURES
  const page4HTML = `
    <div id="pdf-page-cgv" class="section" style="min-height: 270mm;">
      <div class="section">
        <div class="section-title">CONDITIONS GÉNÉRALES DE VENTE</div>
        <div class="notes-section">
          ${contract.cgv_text ? contract.cgv_text.replace(/\n/g, '<br>') : `
          <p><strong>Article 1 - Objet</strong><br>
          Les présentes conditions générales ont pour objet de définir les droits et obligations des parties dans le cadre de la prestation de services d'animation DJ.</p>
          
          <p><strong>Article 2 - Prix et modalités de paiement</strong><br>
          Le prix de la prestation est celui convenu dans le présent contrat. Un acompte de 30% est exigé à la signature, le solde étant payable le jour de la prestation.</p>
          
          <p><strong>Article 3 - Obligations du prestataire</strong><br>
          Le prestataire s'engage à fournir le matériel et les services décrits dans le contrat avec le professionnalisme requis.</p>
          
          <p><strong>Article 4 - Obligations du client</strong><br>
          Le client s'engage à mettre à disposition les installations électriques nécessaires et à faciliter l'accès au lieu de prestation.</p>
          
          <p><strong>Article 5 - Annulation</strong><br>
          En cas d'annulation par le client, l'acompte reste acquis au prestataire si l'annulation intervient moins de 30 jours avant l'événement.</p>
          `}
        </div>
      </div>
      
      <div class="signatures clearfix" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 4mm;">
        <div class="signature-left" style="flex: 1; max-width: 48%;">
          <div style="text-align: center; padding: 8pt; border: 1pt solid #ccc; min-height: 25mm; height: 35mm;">
            <strong>Le Client</strong><br><br>
            Nom: ${contract.client_info.name}<br>
            Date: _______________<br>
            <div style="border-bottom: 1pt solid #000; height: 12mm; margin: 8pt 8pt 4pt 8pt;"></div>
            Signature<br>
            <small>Précédée de "Lu et approuvé"</small>
          </div>
        </div>
        
        <div class="signature-right" style="flex: 1; max-width: 48%;">
          <div style="text-align: center; padding: 8pt; border: 1pt solid #ccc; min-height: 25mm; height: 35mm;">
            <strong>Le Prestataire</strong><br><br>
            Date: ${new Date().toLocaleDateString('fr-FR')}<br>
            <strong style="font-size: 10px;">${_p.name}</strong><br>
            <small>${_p.titre || 'Animateur DJ'}</small>
          </div>
        </div>
      </div>
    </div>
  `;

  // CSS + Assembly
  const contractHTML = `
    <div style="font-family: Arial, 'Noto Color Emoji', sans-serif; font-size: 12px; line-height: 1.3; color: #000; max-width: 200mm; margin: 0 auto; background: white; padding: 4px;">
      <style>
          .header { border-bottom: 2px solid #FF6B00; padding-bottom: 8pt; margin-bottom: 12pt; page-break-after: avoid; }
          .header-content { width: 100%; }
          .header-left { float: left; width: 65%; }
          .header-right { float: right; width: 32%; text-align: right; font-size: 11px; }
          .company-name { font-size: 18pt; font-weight: bold; color: #FF6B00; margin-bottom: 2pt; }
          .company-tagline { font-size: 12px; font-weight: bold; margin-bottom: 6pt; }
          .company-address { font-size: 11px; line-height: 1.3; }
          .contract-title { text-align: center; font-size: 15pt; font-weight: bold; margin: 8pt 0; text-transform: uppercase; }
          .section { margin: 6pt 0; clear: both; }
          .section-title { background-color: #f0f0f0; padding: 4pt 6pt; font-weight: bold; font-size: 12px; border-left: 3px solid #FF6B00; margin-bottom: 6pt; }
          .two-columns { width: 100%; }
          .column-left { float: left; width: 48%; margin-right: 2%; }
          .column-right { float: right; width: 48%; }
          .info-item { margin-bottom: 2pt; font-size: 11px; }
          .info-label { font-weight: bold; display: inline-block; width: 18mm; }
          .compact-pricing-table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 11px; }
          .compact-pricing-table th, .compact-pricing-table td { border: 1px solid #ccc; padding: 3pt; text-align: left; }
          .compact-pricing-table th { background-color: #f0f0f0; font-weight: bold; }
          .compact-pricing-table td:last-child { text-align: right; font-weight: bold; width: 20mm; }
          .compact-pricing-total { background-color: #e6f3ff; font-weight: bold; }
          .compact-payment-box { background-color: #f0f8ff; border: 1pt solid #ccc; padding: 6pt; margin: 6pt 0; font-size: 11px; }
          .payment-amounts { width: 100%; }
          .payment-left { float: left; width: 48%; margin-right: 2%; }
          .payment-right { float: right; width: 48%; }
          .amount-big { font-size: 14px; font-weight: bold; color: #0066cc; }
          .event-schedule-table table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          .infographic-section { text-align: center; margin-top: 5pt; }
          .infographic-header { font-size: 14pt; font-weight: bold; color: #FF6B00; letter-spacing: 2px; margin-bottom: 12pt; border-bottom: 2px solid #f0f0f0; display: inline-block; padding-bottom: 3pt; text-transform: uppercase; font-family: 'Segoe UI', Roboto, sans-serif; }
          .infographic-container { display: flex; flex-direction: column; align-items: center; width: 100%; gap: 1pt; }
          .infographic-item { background: #fff; padding: 3pt 10pt; border-radius: 3px; border: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: center; gap: 8pt; width: 95%; max-width: 600px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin: 0 auto; }
          .infographic-icon { font-size: 12pt; color: #FF6B00; }
          .infographic-label { font-size: 10pt; font-weight: 600; color: #333; }
          .infographic-separator { display: none; }
          .technical-note { margin: 4px 0; padding: 6px; background: #f8f9fa; border-left: 3px solid #007bff; font-size: 10px; line-height: 1.3; }
          .technical-note strong { font-size: 11px; }
          .signatures { width: 100%; margin-top: 15pt; clear: both; }
          .signature-left { float: left; width: 48%; margin-right: 2%; text-align: center; border: 1pt solid #ccc; padding: 8pt; min-height: 25mm; font-size: 11px; }
          .signature-right { float: right; width: 48%; text-align: center; border: 1pt solid #ccc; padding: 8pt; min-height: 25mm; font-size: 11px; }
          .paraphe-box { position: absolute; right: 8px; bottom: 8px; width: 15mm; height: 8mm; border: 1px solid #000; text-align: center; font-size: 9px; line-height: 8mm; font-weight: bold; }
          .paraphe-page { position: relative; min-height: 270mm; }
          .paraphe-page + .paraphe-page { page-break-before: always; }
          .paraphe-page + .section { page-break-before: always; }
          .clearfix::after { content: ""; display: table; clear: both; }
          .notes-section { font-size: 10px; line-height: 1.3; }
      </style>
      
      ${mode === 'technical-only' ? '' : page1HTML}
      ${mode === 'contract-only' ? '' : page2HTML}
      ${mode === 'contract-only' ? '' : page3HTML}
      ${mode === 'technical-only' ? '' : page4HTML}
      
    </div>`;

  return contractHTML;
};
