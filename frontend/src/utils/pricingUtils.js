/**
 * Utilitaires de calcul de prix pour Location Matériel
 * - Dégressivité des prix selon la durée de location
 * - Forfaits de livraison par zone kilométrique
 */

// ==============================
// DÉGRESSIVITÉ DES PRIX
// ==============================

/**
 * Grille de coefficients de dégressivité
 * Basée sur la durée de location
 */
export const DEGRESSION_COEFFICIENTS = {
  1: { coef: 1.0, label: '1 jour', description: '24h en semaine' },
  2: { coef: 1.3, label: '2 jours', description: '48h en semaine' },
  3: { coef: 1.6, label: '3 jours', description: '72h en semaine' },
  4: { coef: 2.0, label: '4 jours', description: '96h en semaine' },
  7: { coef: 3.0, label: '1 semaine', description: '7 jours consécutifs' },
  weekend: { coef: 1.0, label: 'Weekend', description: 'Ven. soir au Lun. matin' }
};

/**
 * Vérifie si une période correspond à un weekend (vendredi → lundi)
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @returns {boolean} - True si c'est un weekend
 */
export const isWeekendPeriod = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Vendredi = 5, Samedi = 6, Dimanche = 0, Lundi = 1
  const startDay = start.getDay();
  const endDay = end.getDay();
  
  // Vérifier si c'est un weekend typique (vendredi → lundi)
  // Le vendredi est le jour 5, le lundi est le jour 1
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  // Weekend: commence vendredi (5) ou samedi (6), termine dimanche (0) ou lundi (1)
  // et la durée est de 2-3 jours
  if (daysDiff >= 2 && daysDiff <= 3) {
    if ((startDay === 5 || startDay === 6) && (endDay === 0 || endDay === 1)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Calcule le nombre de jours de location effectifs
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @returns {number} - Nombre de jours
 */
export const calculateRentalDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Minimum 1 jour, même si la même date est sélectionnée
  return diffDays === 0 ? 1 : diffDays;
};

/**
 * Détermine le coefficient de dégressivité basé sur la durée et les dates
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @param {boolean} isWeekend - Force le mode weekend (override manuel)
 * @returns {Object} - { coef, label, description, days, isWeekendDetected }
 */
export const getDegressionInfo = (startDate, endDate, forceWeekend = null, manualCoef = null) => {
  const days = calculateRentalDays(startDate, endDate);
  
  // Forfait weekend uniquement si forcé manuellement
  const isWeekendDetected = forceWeekend === true;
  
  if (isWeekendDetected) {
    return {
      ...DEGRESSION_COEFFICIENTS.weekend,
      coef: manualCoef !== null ? parseFloat(manualCoef) : DEGRESSION_COEFFICIENTS.weekend.coef,
      days,
      effectiveDays: 1,
      isWeekendDetected: true,
      isManualOverridden: manualCoef !== null
    };
  }
  
  // Si on a un coefficient manuel
  if (manualCoef !== null) {
    return {
      coef: parseFloat(manualCoef),
      label: `Coef manuel (x${manualCoef})`,
      description: `Coefficient forcé manuellement (${days} jours)`,
      days,
      effectiveDays: days,
      isWeekendDetected: false,
      isManualOverridden: true
    };
  }
  
  // Au-delà de 7 jours, on applique une logique plus large (ex: +1.5 coef par semaine supplémentaire)
  if (days > 7) {
    const extraWeeks = (days - 7) / 7;
    // Base 7 jours = 3.0. +1.5 par semaine. Arrondi à 1 décimale près.
    const calculatedCoef = Math.round((3.0 + extraWeeks * 1.5) * 10) / 10;
    
    return {
      coef: calculatedCoef,
      label: 'Longue durée',
      description: `${days} jours consécutifs`,
      days,
      effectiveDays: days,
      isWeekendDetected: false,
      isManualOverridden: false
    };
  }
  
  // Pour 5 à 7 jours, appliquer le tarif semaine
  if (days >= 5) {
    return {
      ...DEGRESSION_COEFFICIENTS[7],
      days,
      effectiveDays: 7,
      isWeekendDetected: false,
      isManualOverridden: false
    };
  }
  
  // Sinon, utiliser le coefficient correspondant
  const coefData = DEGRESSION_COEFFICIENTS[days] || DEGRESSION_COEFFICIENTS[1];
  
  return {
    ...coefData,
    days,
    effectiveDays: days,
    isWeekendDetected: false,
    isManualOverridden: false
  };
};

/**
 * Calcule le prix avec dégressivité
 * @param {number} dailyPrice - Prix journalier unitaire
 * @param {number} quantity - Quantité
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @param {boolean} forceWeekend - Force le mode weekend
 * @returns {Object} - { subtotal, degressionInfo }
 */
export const calculateDegressionPrice = (dailyPrice, quantity, startDate, endDate, forceWeekend = null) => {
  const degressionInfo = getDegressionInfo(startDate, endDate, forceWeekend);
  
  // Prix = prix journalier × coefficient × quantité
  const subtotal = dailyPrice * degressionInfo.coef * quantity;
  
  return {
    subtotal,
    degressionInfo,
    calculation: {
      dailyPrice,
      quantity,
      coefficient: degressionInfo.coef,
      formula: `${dailyPrice}€ × ${degressionInfo.coef} (coef) × ${quantity} (qté) = ${subtotal.toFixed(2)}€`
    }
  };
};

// ==============================
// FORFAITS DE LIVRAISON
// ==============================

/**
 * Zones de livraison prédéfinies
 */
export const DELIVERY_ZONES = [
  {
    id: 'zone1',
    name: 'Zone 1 - Local',
    description: 'Moins de 20 km',
    maxKm: 20,
    price: 0,
    pricePerKm: null
  },
  {
    id: 'zone2',
    name: 'Zone 2 - Départemental',
    description: '20 à 50 km',
    maxKm: 50,
    minKm: 20,
    price: 40,
    pricePerKm: null
  },
  {
    id: 'zone3',
    name: 'Zone 3 - Régional',
    description: '50 à 70 km',
    maxKm: 70,
    minKm: 50,
    price: 70,
    pricePerKm: null
  },
  {
    id: 'hors_zone',
    name: 'Hors zone',
    description: 'Plus de 70 km',
    minKm: 70,
    price: null,
    pricePerKm: 0.70
  }
];

// Constantes pour les calculs automatiques
export const INSTALLATION_HOURLY_RATE = 35; // €/heure
export const DEPOSIT_PERCENTAGE = 0.30; // 30%
export const GUARANTEE_BASE_AMOUNT = 350; // €
export const GUARANTEE_THRESHOLD = 150; // €

/**
 * Calcule l'acompte demandé (30% du sous-total matériel)
 * Arrondi à la dizaine supérieure (ex: 76.50€ → 80€)
 * @param {number} equipmentSubtotal - Sous-total des équipements
 * @returns {number} - Montant de l'acompte arrondi
 */
export const calculateDeposit = (equipmentSubtotal) => {
  const rawDeposit = equipmentSubtotal * DEPOSIT_PERCENTAGE;
  // Arrondi à la dizaine supérieure
  return Math.ceil(rawDeposit / 10) * 10;
};

/**
 * Calcule la caution à verser
 * - Si sous-total < 150€ : Caution = 350€
 * - Si sous-total >= 150€ : Caution = 350€ + sous-total
 * Arrondi à la cinquantaine supérieure (ex: 605€ → 650€)
 * @param {number} equipmentSubtotal - Sous-total des équipements
 * @returns {number} - Montant de la caution arrondi
 */
export const calculateGuarantee = (equipmentSubtotal) => {
  let rawGuarantee;
  if (equipmentSubtotal < GUARANTEE_THRESHOLD) {
    rawGuarantee = GUARANTEE_BASE_AMOUNT;
  } else {
    rawGuarantee = GUARANTEE_BASE_AMOUNT + equipmentSubtotal;
  }
  // Arrondi à la cinquantaine supérieure
  return Math.ceil(rawGuarantee / 50) * 50;
};

/**
 * Calcule les frais d'installation
 * @param {number} hours - Nombre d'heures
 * @returns {number} - Montant des frais d'installation
 */
export const calculateInstallationCost = (hours) => {
  return hours * INSTALLATION_HOURLY_RATE;
};

/**
 * Calcule le prix de livraison selon la zone
 * @param {string} zoneId - ID de la zone sélectionnée
 * @param {number} kilometers - Nombre de km (pour hors zone uniquement)
 * @returns {Object} - { price, zone, calculation }
 */
export const calculateDeliveryPrice = (zoneId, kilometers = 0) => {
  const zone = DELIVERY_ZONES.find(z => z.id === zoneId);
  
  if (!zone) {
    return { price: 0, zone: null, calculation: null };
  }
  
  if (zone.id === 'hors_zone') {
    const price = kilometers * zone.pricePerKm;
    return {
      price,
      zone,
      calculation: `${kilometers} km × ${zone.pricePerKm}€/km = ${price.toFixed(2)}€`
    };
  }
  
  return {
    price: zone.price,
    zone,
    calculation: `Forfait ${zone.name} = ${zone.price}€`
  };
};

/**
 * Détecte automatiquement la zone en fonction du kilométrage
 * @param {number} kilometers - Distance en km
 * @returns {Object} - Zone correspondante
 */
export const detectZoneFromKm = (kilometers) => {
  if (kilometers <= 0) return null;
  
  for (const zone of DELIVERY_ZONES) {
    if (zone.maxKm && kilometers <= zone.maxKm) {
      if (!zone.minKm || kilometers > zone.minKm) {
        return zone;
      }
    }
    if (zone.id === 'hors_zone' && kilometers > 100) {
      return zone;
    }
  }
  
  return DELIVERY_ZONES[0]; // Par défaut Zone 1
};

// ==============================
// CALCUL GLOBAL DU DEVIS
// ==============================

/**
 * Calcule le total du devis avec dégressivité et frais
 * @param {Array} items - Liste des équipements [{equipment, quantity}]
 * @param {Object} dates - {startDate, endDate}
 * @param {Object} options - {discountPercent, discountAmount, deliveryZone, deliveryKm, installationCost, forceWeekend}
 * @returns {Object} - Résumé complet du calcul
 */
export const calculateQuoteTotal = (items, dates, options = {}) => {
  const {
    discountPercent = 0,
    discountAmount = 0,
    deliveryZone = null,
    deliveryKm = 0,
    installationCost = 0,
    forceWeekend = null
  } = options;
  
  // Calculer la dégressivité
  const degressionInfo = getDegressionInfo(dates.startDate, dates.endDate, forceWeekend);
  
  // Calculer le sous-total des équipements
  let subtotal = 0;
  const itemsDetail = items.map(item => {
    if (!item.equipment || !item.quantity) return null;
    
    const linePrice = item.equipment.daily_price * degressionInfo.coef * item.quantity;
    subtotal += linePrice;
    
    return {
      name: item.equipment.name,
      dailyPrice: item.equipment.daily_price,
      quantity: item.quantity,
      coefficient: degressionInfo.coef,
      lineTotal: linePrice
    };
  }).filter(Boolean);
  
  // Calculer la remise
  let discountValue = 0;
  if (discountAmount > 0) {
    discountValue = discountAmount;
  } else if (discountPercent > 0) {
    discountValue = (subtotal * discountPercent) / 100;
  }
  
  // Calculer les frais de livraison
  const deliveryResult = calculateDeliveryPrice(deliveryZone, deliveryKm);
  
  // Total final
  const total = subtotal - discountValue + deliveryResult.price + installationCost;
  
  return {
    subtotal,
    degressionInfo,
    discount: {
      type: discountAmount > 0 ? 'fixed' : 'percent',
      value: discountAmount > 0 ? discountAmount : discountPercent,
      amount: discountValue
    },
    delivery: {
      zone: deliveryResult.zone,
      kilometers: deliveryKm,
      price: deliveryResult.price,
      calculation: deliveryResult.calculation
    },
    installation: installationCost,
    total,
    itemsDetail
  };
};

export default {
  DEGRESSION_COEFFICIENTS,
  DELIVERY_ZONES,
  isWeekendPeriod,
  calculateRentalDays,
  getDegressionInfo,
  calculateDegressionPrice,
  calculateDeliveryPrice,
  detectZoneFromKm,
  calculateQuoteTotal
};
