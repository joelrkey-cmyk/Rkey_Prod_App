export const INSTALLATION_HOURLY_RATE = 35;

export const DEGRESSION_COEFFICIENTS = [
  { days: 1, coef: 1.0, label: '1 jour', description: 'Tarif standard 1 jour' },
  { days: 2, coef: 1.5, label: '2 jours', description: 'Tarif dégressif 2 jours' },
  { days: 3, coef: 2.0, label: '3 jours', description: 'Tarif dégressif 3 jours' },
  { days: 4, coef: 2.4, label: '4 jours', description: 'Tarif dégressif 4 jours' },
  { days: 5, coef: 2.8, label: '5 jours', description: 'Tarif dégressif 5 jours' },
  { days: 7, coef: 3.0, label: '1 semaine', description: 'Forfait 1 semaine' },
  { days: 14, coef: 5.0, label: '2 semaines', description: 'Forfait 2 semaines' },
  { days: 30, coef: 10.0, label: '1 mois', description: 'Forfait mensuel' }
];

export const DELIVERY_ZONES = [
  { id: 'zone_1', name: 'Zone 1', description: 'Moins de 10km de l\'agence', price: 15, pricePerKm: null },
  { id: 'zone_2', name: 'Zone 2', description: 'De 10 à 30km de l\'agence', price: 30, pricePerKm: null },
  { id: 'zone_3', name: 'Zone 3', description: 'De 30 à 50km de l\'agence', price: 50, pricePerKm: null },
  { id: 'zone_4', name: 'Zone 4', description: 'De 50 à 100km de l\'agence', price: 100, pricePerKm: null },
  { id: 'hors_zone', name: 'Hors Zone', description: 'Plus de 100km (au km)', price: null, pricePerKm: 1.5 }
];

export function isWeekendPeriod(startDate, endDate) {
  if (!startDate || !endDate) return false;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startDay = start.getDay(); // 0 = Sunday, 6 = Saturday
    const endDay = end.getDay();
    // Friday (5), Saturday (6), Sunday (0) are weekend days
    const isStartWeekend = startDay === 0 || startDay === 5 || startDay === 6;
    const isEndWeekend = endDay === 0 || endDay === 1 || endDay === 6;
    return isStartWeekend && isEndWeekend;
  } catch (err) {
    return false;
  }
}

export function getDegressionInfo(startDate, endDate, forceWeekend = false, manualCoef = null) {
  if (manualCoef !== null && manualCoef !== undefined && manualCoef !== '' && !isNaN(manualCoef)) {
    const parsed = parseFloat(manualCoef);
    return {
      coef: parsed,
      isWeekendDetected: false,
      label: 'Coefficient manuel',
      description: `Coefficient personnalisé de ×${parsed}`
    };
  }

  let days = 1;
  if (startDate && endDate) {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e - s);
      days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch (err) {
      days = 1;
    }
  }

  const isWeekend = forceWeekend || isWeekendPeriod(startDate, endDate);
  
  if (isWeekend) {
    return {
      coef: 1.5,
      isWeekendDetected: true,
      label: 'Forfait Weekend',
      description: 'Tarif préférentiel weekend (×1.5)'
    };
  }

  // Find defined match or interpolate
  const definedCoeff = DEGRESSION_COEFFICIENTS.find(c => c.days === days);
  if (definedCoeff) {
    return {
      coef: definedCoeff.coef,
      isWeekendDetected: false,
      label: definedCoeff.label,
      description: definedCoeff.description
    };
  }

  let coef = 1.0;
  let label = `${days} jours`;
  let description = `Tarif dégressif pour ${days} jours`;

  if (days < 1) {
    coef = 1.0;
  } else if (days < 7) {
    // Interpolate roughly
    coef = 1.0 + (days - 1) * 0.45;
  } else if (days < 14) {
    coef = 3.0 + (days - 7) * 0.28;
  } else if (days < 30) {
    coef = 5.0 + (days - 14) * 0.31;
  } else {
    coef = 10.0 + (days - 30) * 0.25;
  }

  // Cap coefficient max to 20
  coef = Math.min(20.0, parseFloat(coef.toFixed(2)));

  return {
    coef,
    isWeekendDetected: false,
    label,
    description
  };
}

export function calculateDeliveryPrice(zoneId, km = 0) {
  if (!zoneId) {
    return { price: 0, zone: 'Retrait Agence', calculation: 'Retrait et retour en agence (gratuit)' };
  }
  const zone = DELIVERY_ZONES.find(z => z.id === zoneId);
  if (!zone) {
    return { price: 0, zone: 'Inconnu', calculation: 'Zone inconnue' };
  }
  if (zone.id === 'hors_zone') {
    const distance = parseFloat(km) || 0;
    const price = distance * (zone.pricePerKm || 1.5);
    return { 
      price, 
      zone: zone.name, 
      calculation: `${distance} km × ${zone.pricePerKm}€/km` 
    };
  }
  return { 
    price: zone.price, 
    zone: zone.name, 
    calculation: `Forfait fixe ${zone.name}` 
  };
}

export function calculateDeposit(subtotal) {
  // standard R'KEY PROD deposit (acompte) of 30% of subtotal
  return parseFloat((subtotal * 0.3).toFixed(2));
}

export function calculateGuarantee(subtotal) {
  // standard scaling guarantee cover (caution) based on quote size
  if (subtotal <= 150) return 300;
  if (subtotal <= 500) return 500;
  if (subtotal <= 1000) return 1000;
  if (subtotal <= 2500) return 1500;
  return 2500;
}

export function calculateInstallationCost(hours) {
  return (parseFloat(hours) || 0) * INSTALLATION_HOURLY_RATE;
}
