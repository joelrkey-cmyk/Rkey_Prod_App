export const INSTALLATION_HOURLY_RATE = 45;

export const DEGRESSION_COEFFICIENTS = [
  { days: 1, coef: 1.0, label: "1 jour" },
  { days: 2, coef: 1.5, label: "2 jours" },
  { days: 3, coef: 2.0, label: "3 jours" },
  { days: 4, coef: 2.3, label: "4 jours" },
  { days: 5, coef: 2.5, label: "5 jours" },
  { days: 6, coef: 2.8, label: "6 jours" },
  { days: 7, coef: 3.0, label: "1 semaine" },
  { days: 14, coef: 5.0, label: "2 semaines" },
  { days: 30, coef: 8.0, label: "1 mois" }
];

export const DELIVERY_ZONES = [
  { id: 'zone_a', name: 'Zone A', description: 'Moins de 10km de l\'agence', price: 25, pricePerKm: null },
  { id: 'zone_b', name: 'Zone B', description: 'Entre 10km et 25km de l\'agence', price: 45, pricePerKm: null },
  { id: 'zone_c', name: 'Zone C', description: 'Entre 25km et 50km de l\'agence', price: 80, pricePerKm: null },
  { id: 'hors_zone', name: 'Hors Zone', description: 'Plus de 50km (sur devis au km)', price: null, pricePerKm: 1.2 }
];

export function isWeekendPeriod(startDate, endDate) {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startDay = start.getDay();
  const endDay = end.getDay();
  
  const isStartWeekend = startDay === 5 || startDay === 6 || startDay === 0;
  const isEndWeekend = endDay === 0 || endDay === 1 || endDay === 6;
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return isStartWeekend && isEndWeekend && diffDays <= 4;
}

export function getDegressionInfo(startDate, endDate, forceWeekend, manualCoef) {
  if (manualCoef !== undefined && manualCoef !== null) {
    return {
      coef: parseFloat(manualCoef),
      label: 'manuel',
      isWeekendDetected: false
    };
  }

  if (forceWeekend || isWeekendPeriod(startDate, endDate)) {
    return {
      coef: 1.5,
      label: 'weekend',
      isWeekendDetected: true
    };
  }

  let days = 1;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  let matched = DEGRESSION_COEFFICIENTS[0];
  for (let c of DEGRESSION_COEFFICIENTS) {
    if (days >= c.days) {
      matched = c;
    }
  }

  let coef = matched.coef;
  if (days > matched.days) {
    const factor = (days - matched.days) * 0.2;
    coef = matched.coef + factor;
  }

  return {
    coef: Math.round(coef * 100) / 100,
    label: `${days} jour${days > 1 ? 's' : ''}`,
    isWeekendDetected: false
  };
}

export function calculateDeliveryPrice(zoneId, km) {
  if (!zoneId) return { price: 0 };
  
  const zone = DELIVERY_ZONES.find(z => z.id === zoneId);
  if (!zone) return { price: 0 };

  if (zone.price !== null) {
    return { price: zone.price };
  }

  if (zone.pricePerKm !== null && km) {
    const distance = parseFloat(km) || 0;
    return { price: Math.round(distance * zone.pricePerKm * 100) / 100 };
  }

  return { price: 0 };
}

export function calculateInstallationCost(hours) {
  return parseFloat(hours || 0) * INSTALLATION_HOURLY_RATE;
}

export function calculateDeposit(subtotal) {
  return Math.round(parseFloat(subtotal || 0) * 0.3 * 100) / 100;
}

export function calculateGuarantee(subtotal) {
  const amount = parseFloat(subtotal || 0);
  if (amount <= 0) return 300;
  if (amount <= 150) return 500;
  if (amount <= 400) return 1000;
  if (amount <= 800) return 1500;
  return 2000;
}
