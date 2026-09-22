// Grille Tarifaire Détaillée — Saisons 2027 / 2028 (Formules Mariage Joël Dirigeant)

export const WEDDING_FORMULAS = {
  essentielle: {
    id: 'essentielle',
    name: 'Essentielle',
    badge: null,
    badgeColor: '',
    endTime: '03:00',
    unlimitedTime: false,
    prices: {
      haute: 1790,
      basse: 1490
    },
    summaryItems: [
      'Prestation DJ & Animation Micro',
      'Sonorisation Piste & Soirée',
      'Éclairage Piste de Danse DMX',
      'Fin de soirée : 3h00'
    ],
    includedOptionKeys: []
  },
  confort: {
    id: 'confort',
    name: 'Confort',
    badge: null,
    badgeColor: '',
    endTime: '04:00',
    unlimitedTime: false,
    prices: {
      haute: 1990,
      basse: 1790
    },
    summaryItems: [
      'Tout le pack Essentielle',
      'Fin de soirée étendue jusqu’à 4h00',
      'Sonorisation Vin d’Honneur (Nomade)',
      'Mise en Lumière de Salle (16 LED)'
    ],
    includedOptionKeys: ['vin_honneur', 'mise_en_lumiere']
  },
  signature: {
    id: 'signature',
    name: 'Signature',
    badge: 'BEST-SELLER',
    badgeColor: 'bg-orange-500 text-white',
    endTime: '04:00',
    unlimitedTime: false,
    prices: {
      haute: 2190,
      basse: 1990
    },
    summaryItems: [
      'Tout le pack Confort (4h00 + Vin d’Honneur + 16 LED)',
      'Fumée Lourde (Nuage au sol 3000W)',
      '2x Fontaines d’Étincelles Froides'
    ],
    includedOptionKeys: ['vin_honneur', 'mise_en_lumiere', 'fumee_lourde', 'etincelles_froides']
  },
  prestige: {
    id: 'prestige',
    name: 'Prestige',
    badge: 'SANS LIMITE',
    badgeColor: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black',
    endTime: '',
    unlimitedTime: true,
    prices: {
      haute: 2590,
      basse: 2290
    },
    summaryItems: [
      'Tout le pack Signature',
      'Soirée SANS LIMITE horaire',
      'Régie Cérémonie Laïque',
      'Assistant / Régisseur dédié sur place'
    ],
    includedOptionKeys: [
      'vin_honneur',
      'mise_en_lumiere',
      'fumee_lourde',
      'etincelles_froides',
      'ceremonie_laique',
      'assistant_regisseur'
    ]
  }
};

export const WEDDING_OPTION_DEFINITIONS = [
  {
    key: 'vin_honneur',
    label: "Sonorisation Vin d'Honneur (Nomade)",
    defaultPrice: 150,
    matches: (name) => {
      const n = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n.includes("vin d'honneur") || n.includes("vin d honneur") || n.includes("aperitif") || (n.includes("sonorisation") && n.includes("nomade"));
    }
  },
  {
    key: 'mise_en_lumiere',
    label: "Mise en Lumière de Salle (16 LED)",
    defaultPrice: 150,
    matches: (name) => {
      const n = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n.includes("mise en lumiere") || n.includes("eclairage salle") || n.includes("16 led") || n.includes("15 spots");
    }
  },
  {
    key: 'fumee_lourde',
    label: "Fumée Lourde (Nuage au sol 3000W)",
    defaultPrice: 140,
    matches: (name) => {
      const n = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n.includes("fumee lourde") || n.includes("nuage au sol");
    }
  },
  {
    key: 'etincelles_froides',
    label: "2x Fontaines d'Étincelles Froides",
    defaultPrice: 100,
    matches: (name) => {
      const n = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return (n.includes("etincelles froides") && (n.includes("x2") || n.includes("2x") || !n.includes("x4"))) || n.includes("fontaines d'etincelles");
    }
  },
  {
    key: 'ceremonie_laique',
    label: "Régie Cérémonie Laïque",
    defaultPrice: 100,
    matches: (name) => {
      const n = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n.includes("ceremonie laique") || n.includes("ceremonie exterieure") || n.includes("regie ceremonie");
    }
  },
  {
    key: 'assistant_regisseur',
    label: "Assistant / Régisseur dédié sur place",
    defaultPrice: 300,
    matches: (name) => {
      const n = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n.includes("assistant") || n.includes("regisseur") || n.includes("accompagnement depuis la ceremonie");
    }
  }
];

export const isDateHighSeason = (dateStr) => {
  if (!dateStr) return true; // Mai à Octobre par défaut
  try {
    const parts = String(dateStr).split('-');
    if (parts.length >= 2) {
      const month = parseInt(parts[1], 10);
      return month >= 5 && month <= 10;
    }
  } catch (e) {
    // fallback
  }
  return true;
};
