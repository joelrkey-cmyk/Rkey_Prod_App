// Fonctions de calcul pour les contrats

export const isContractDirigeant = (c) => {
  if (!c) return false;
  
  // 1. Check dj_profile field (string)
  const dj_profile = (c.dj_profile || "").toLowerCase().trim();
  if (dj_profile === "joel" || dj_profile === "joël" || dj_profile.includes("r'key") || dj_profile.includes("rkey")) {
    return true;
  }

  // 2. Check dj_profile_data fields
  const p = c.dj_profile_data;
  if (p) {
    const name = (p.name || p.nom_complet || p.nom_artistique || "").toLowerCase().trim();
    const title = (p.titre || "").toLowerCase().trim();
    const statut = (p.statut_artiste || "").toLowerCase().trim();

    if (
      name.includes("joël") || 
      name.includes("joel") || 
      name.includes("r'key") || 
      name.includes("rkey") || 
      title.includes("gérant") || 
      statut === "dirigeant"
    ) {
      return true;
    }
  }

  return false;
};

export const isArtistFreelance = (profile) => {
  if (!profile || (!profile.name && !profile.nom_complet && !profile.nom_artistique)) return false;
  
  const statut = (profile.statut_artiste || "").toLowerCase().trim();
  const name = (profile.name || profile.nom_complet || profile.nom_artistique || "").toLowerCase().trim();
  const title = (profile.titre || "").toLowerCase().trim();

  // Si Joël, ou dirigeant, ou gérant, alors pas freelance
  if (name.includes("joël") || name.includes("joel") || name.includes("r'key") || name.includes("rkey") || title.includes("gérant") || statut === "dirigeant") {
    return false;
  }
  
  // Par défaut, s'il n'est pas dirigeant, c'est un freelance
  return true;
};

export const calculateCompanyMargeHT = (basePrice, selectedOptions, discountAmount, contractMode = "entreprise", djProfile = null, freelanceCachetCap = 800) => {
  const isFreelance = isArtistFreelance(djProfile);
  const isCompanyMode = contractMode === "entreprise";
  
  if (!isCompanyMode || !isFreelance) {
    return 0; // Applicable uniquement si mode = "Entreprise" et artiste = "Freelance"
  }

  const optionsTotalForDeposit = (selectedOptions || [])
    .filter(option => option.selected && !option.is_addition_post_signature && !option.added_post_signature)
    .reduce((sum, option) => sum + option.price, 0);

  const baseTTC = Math.max(0, basePrice - discountAmount);
  const baseHT = baseTTC / 1.2;

  const optionsTTC = optionsTotalForDeposit;
  const optionsHT = optionsTTC / 1.2;

  const totalTTC = baseTTC + optionsTTC;
  const totalHT = totalTTC / 1.2;

  let baseCachetDJ = 0;
  if (totalTTC > 1500) {
    baseCachetDJ = 900;
  } else {
    baseCachetDJ = baseHT * 0.6428;
  }

  const optionsCachetDJ = optionsHT * 0.20;
  const cachetDJRaw = baseCachetDJ + optionsCachetDJ;
  let cachetDJ = Math.floor(cachetDJRaw / 10) * 10;
  
  const cap = freelanceCachetCap !== undefined ? freelanceCachetCap : 800;
  if (cachetDJ > cap) {
    cachetDJ = cap;
  }

  const margeHT = totalHT - cachetDJ;
  return Math.max(0, margeHT);
};

export const calculateContractCompanyMargeHT = (contract) => {
  if (!contract) return 0;
  const basePrice = contract.base_price || 0;
  const selectedOptions = contract.selected_options || [];
  const discountAmount = contract.discount_amount || 0;
  const contractMode = contract.contract_mode || "entreprise";
  const djProfile = contract.dj_profile_data || {};
  
  const isFreelance = !isContractDirigeant(contract);
  const isCompanyMode = contractMode === "entreprise";
  if (!isCompanyMode || !isFreelance) {
    return 0;
  }
  
  const freelanceCap = contract.freelance_cachet_cap !== undefined ? contract.freelance_cachet_cap : 800;
  return calculateCompanyMargeHT(basePrice, selectedOptions, discountAmount, contractMode, djProfile, freelanceCap);
};

export const calculateTotal = (basePrice, selectedOptions, discountAmount) => {
  const optionsTotal = selectedOptions
    .filter(option => option.selected)
    .reduce((sum, option) => sum + option.price, 0);
  return Math.max(0, basePrice + optionsTotal - discountAmount);
};

export const calculateDepositAmount = (basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired, isCompany = false, contractMode = "entreprise", djProfile = null, freelanceCachetCap = 800) => {
  if (noDepositRequired) return 0;
  if (customDepositAmount > 0) return customDepositAmount;

  const isFreelance = isArtistFreelance(djProfile);
  const isCompanyMode = contractMode === "entreprise";

  if (isCompanyMode && isFreelance) {
    const optionsTotalForDeposit = (selectedOptions || [])
      .filter(option => option.selected && !option.is_addition_post_signature && !option.added_post_signature)
      .reduce((sum, option) => sum + option.price, 0);

    const baseTTC = Math.max(0, basePrice - discountAmount);
    const baseHT = baseTTC / 1.2;

    const optionsTTC = optionsTotalForDeposit;
    const optionsHT = optionsTTC / 1.2;

    const totalTTC = baseTTC + optionsTTC;
    const totalHT = totalTTC / 1.2;

    let baseCachetDJ = 0;
    if (totalTTC > 1500) {
      baseCachetDJ = 900;
    } else {
      baseCachetDJ = baseHT * 0.6428;
    }

    const optionsCachetDJ = optionsHT * 0.20;
    const cachetDJRaw = baseCachetDJ + optionsCachetDJ;
    let cachetDJ = Math.floor(cachetDJRaw / 10) * 10;
    
    const cap = freelanceCachetCap !== undefined ? freelanceCachetCap : 800;
    if (cachetDJ > cap) {
      cachetDJ = cap;
    }

    const margeHT = totalHT - cachetDJ;
    const acompteTTC = Math.ceil((margeHT * 1.2) / 5) * 5;

    return Math.max(0, acompteTTC);
  }

  const optionsTotal = selectedOptions
    .filter(option => option.selected && !option.is_addition_post_signature && !option.added_post_signature)
    .reduce((sum, option) => sum + option.price, 0);
  const ratio = isCompany ? 0.3 : 0.5;
  const deposit = (basePrice * ratio) + optionsTotal - discountAmount;
  
  if (!isFreelance) {
    return Math.max(0, deposit);
  }
  return Math.max(0, Math.round(deposit / 50) * 50);
};

export const calculateRemainingBalance = (basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired, isCompany = false, contractMode = "entreprise", djProfile = null, freelanceCachetCap = 800) => {
  const total = calculateTotal(basePrice, selectedOptions, discountAmount);
  const deposit = calculateDepositAmount(basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired, isCompany, contractMode, djProfile, freelanceCachetCap);
  return Math.max(0, total - deposit);
};

export const calculateSetupDate = (eventDate) => {
  if (!eventDate) return "";
  const date = new Date(eventDate);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

// Fonctions de calcul pour un objet contrat complet (utilisées dans les templates HTML)
export const calculateContractDepositAmount = (contract) => {
  if (contract.no_deposit_required) return 0;
  if (contract.custom_deposit_amount > 0) return contract.custom_deposit_amount;

  const contractMode = contract.contract_mode || "entreprise";
  const isFreelance = !isContractDirigeant(contract);
  const isCompanyMode = contractMode === "entreprise";

  if (isCompanyMode && isFreelance) {
    const basePrice = contract.base_price || 0;
    const selectedOptions = contract.selected_options || [];
    const discountAmount = contract.discount_amount || 0;

    const optionsTotalForDeposit = selectedOptions
      .filter(option => option.selected !== false && !option.is_addition_post_signature && !option.added_post_signature)
      .reduce((sum, option) => sum + option.price, 0);

    const baseTTC = Math.max(0, basePrice - discountAmount);
    const baseHT = baseTTC / 1.2;

    const optionsTTC = optionsTotalForDeposit;
    const optionsHT = optionsTTC / 1.2;

    const totalTTC = baseTTC + optionsTTC;
    const totalHT = totalTTC / 1.2;

    let baseCachetDJ = 0;
    if (totalTTC > 1500) {
      baseCachetDJ = 900;
    } else {
      baseCachetDJ = baseHT * 0.6428;
    }

    const optionsCachetDJ = optionsHT * 0.20;
    const cachetDJRaw = baseCachetDJ + optionsCachetDJ;
    let cachetDJ = Math.floor(cachetDJRaw / 10) * 10;
    
    const freelanceCap = contract.freelance_cachet_cap !== undefined ? contract.freelance_cachet_cap : 800;
    if (cachetDJ > freelanceCap) {
      cachetDJ = freelanceCap;
    }

    const margeHT = totalHT - cachetDJ;
    const acompteTTC = Math.ceil((margeHT * 1.2) / 5) * 5;

    return Math.max(0, acompteTTC);
  }

  const optionsTotal = (contract.selected_options || [])
    .filter(option => option.selected !== false && !option.is_addition_post_signature && !option.added_post_signature)
    .reduce((sum, option) => sum + option.price, 0);
  const isCompany = !!(contract.client_info?.company && contract.client_info.company.trim().length > 0);
  const ratio = isCompany ? 0.3 : 0.5;
  const deposit = (contract.base_price * ratio) + optionsTotal - (contract.discount_amount || 0);
  
  if (isContractDirigeant(contract)) {
    return Math.max(0, deposit);
  }
  return Math.max(0, Math.round(deposit / 50) * 50);
};

export const calculateContractTotal = (contract) => {
  const optionsTotal = (contract.selected_options || [])
    .filter(option => option.selected)
    .reduce((sum, option) => sum + option.price, 0);
  return Math.max(0, contract.base_price + optionsTotal - (contract.discount_amount || 0));
};

export const calculateContractRemainingBalance = (contract) => {
  const total = calculateContractTotal(contract);
  const deposit = calculateContractDepositAmount(contract);
  return Math.max(0, total - deposit);
};
