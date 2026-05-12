// Fonctions de calcul pour les contrats

export const calculateTotal = (basePrice, selectedOptions, discountAmount) => {
  const optionsTotal = selectedOptions
    .filter(option => option.selected)
    .reduce((sum, option) => sum + option.price, 0);
  return Math.max(0, basePrice + optionsTotal - discountAmount);
};

export const calculateDepositAmount = (basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired) => {
  if (noDepositRequired) return 0;
  if (customDepositAmount > 0) return customDepositAmount;

  const optionsTotal = selectedOptions
    .filter(option => option.selected)
    .reduce((sum, option) => sum + option.price, 0);
  const deposit = (basePrice * 0.5) + optionsTotal - discountAmount;
  return Math.max(0, Math.round(deposit * 100) / 100);
};

export const calculateRemainingBalance = (basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired) => {
  const total = calculateTotal(basePrice, selectedOptions, discountAmount);
  const deposit = calculateDepositAmount(basePrice, selectedOptions, discountAmount, customDepositAmount, noDepositRequired);
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
    .filter(option => option.selected)
    .reduce((sum, option) => sum + option.price, 0);
  const deposit = (contract.base_price * 0.5) + optionsTotal - (contract.discount_amount || 0);
  return Math.max(0, Math.round(deposit * 100) / 100);
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
