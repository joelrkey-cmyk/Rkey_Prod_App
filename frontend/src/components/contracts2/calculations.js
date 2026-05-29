// Fonctions de calcul pour les contrats

export const calculateTotal = (basePrice, selectedOptions, discountAmount) => {
  const optionsTotal = selectedOptions
    .filter(option => option.selected)
    .reduce((sum, option) => sum + option.price, 0);
  return Math.max(0, basePrice + optionsTotal - discountAmount);
};

export const calculateDepositAmount = (basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired, isCompany = false) => {
  if (noDepositRequired) return 0;
  if (customDepositAmount > 0) return customDepositAmount;

  const optionsTotal = selectedOptions
    .filter(option => option.selected && !option.is_addition_post_signature && !option.added_post_signature)
    .reduce((sum, option) => sum + option.price, 0);
  const ratio = isCompany ? 0.3 : 0.5;
  const deposit = (basePrice * ratio) + optionsTotal - discountAmount;
  return Math.max(0, Math.round(deposit / 50) * 50);
};

export const calculateRemainingBalance = (basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired, isCompany = false) => {
  const total = calculateTotal(basePrice, selectedOptions, discountAmount);
  const deposit = calculateDepositAmount(basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired, isCompany);
  return Math.max(0, total - deposit);
};

export const calculateSetupDate = (eventDate) => {
  if (!eventDate) return "";
  const date = new Date(eventDate);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

// Fonctions de calcul pour un objet contrat complet (utilisées dans les templates HTML)
export const calculateContractDepositAmount = (contract) => {
  if (contract.no_deposit_required) return 0;
  if (contract.custom_deposit_amount > 0) return contract.custom_deposit_amount;

  const optionsTotal = (contract.selected_options || [])
    .filter(option => option.selected !== false && !option.is_addition_post_signature && !option.added_post_signature)
    .reduce((sum, option) => sum + option.price, 0);
  const isCompany = !!(contract.client_info?.company && contract.client_info.company.trim().length > 0);
  const ratio = isCompany ? 0.3 : 0.5;
  const deposit = (contract.base_price * ratio) + optionsTotal - (contract.discount_amount || 0);
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
