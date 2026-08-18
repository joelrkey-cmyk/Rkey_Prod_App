// Constantes et données prédéfinies pour les contrats

export const defaultClientInfo = {
  name: "",
  company: "",
  address: "",
  phone: "",
  phone2: "",
  email: "",
  event_date: "",
  event_location: "",
  event_type: "",
  custom_event_type: "",
  event_note: "",
  setup_date: "",
  setup_time: "À définir",
  start_time: "",
  end_time: "",
  unlimited_time: false,
  guest_count: ""
};

export const defaultHypnosisProgram = {
  showStartTime: "20:30",
  intermissionTime: "21:30",
  intermissionDuration: "25",
  secondPartTime: "22:00",
  showEndTime: "23:30",
  techniciansArrival: "09:00",
  techniciansLunch: "12:00",
  soundLightAdjustments: "13:00-18:30",
  artistArrival: "18:30",
  doorsOpen: "19:30",
  dismantlingEnd: "01:00",
  cateringLunchCount: "",
  cateringDinnerCount: ""
};

export const defaultCompanySettings = {
  company_name: "R'KEY PROD",
  bank_name: "Tiime",
  bank_iban: "FR76 1679 8000 0100 0192 2357 858",
  bank_bic: "TRZOFR21XXX",
  bank_titulaire: "R'KEY PROD",
  youtube_tutorial_url: "",
  fiche_visite_pdf_url: "",
  fiche_visite_pdf_name: "Fiche_de_visite.pdf",
  fiche_visite_pdf_uploaded_at: null,
};

export const defaultTechnicianContact = {
  name: "",
  email: "",
  phone: ""
};

// Notes prédéfinies avec titre court et contenu détaillé (fallback hardcodé)
export const fallbackPredefinedNotes = {
  "Montage ODB": {
    title: "Montage ODB",
    content: `MONTAGE AUDIO POUR L'OUVERTURE DE BAL

Si vous souhaitez un montage audio personnalisé (enchaînement de plusieurs extraits musicaux pour l'ouverture de bal), merci de m'envoyer :

ÉLÉMENTS REQUIS :
  • Les liens YouTube des morceaux
  • Les timings précis (heure de début et de fin pour chaque extrait)
  • Le tout dans l'ordre chronologique souhaité

DÉLAI IMPORTANT :
  • Ce montage doit être finalisé au plus tard 3 MOIS avant le mariage
  • Je ne prendrai plus aucun montage au-delà de ce délai
  • Pensez donc à l'anticiper !`
  },
  "Playlist personnalisée": {
    title: "Playlist personnalisée",
    content: `CRÉER VOTRE PLAYLIST
• Choisissez votre plateforme de streaming préférée ( Spotify, Deezer, Apple, ...)
• Créez une playlist avec le nom suivant :
  [Type d'événement] [Prénom(s)] [Date de l'événement]
 Exemple : Mariage Carole et Maxime 23.04.24
• Ajoutez au minimum un titre à cette playlist
PARTAGER ET METTRE À JOUR
Une fois votre playlist créée, partagez-nous simplement le lien
Votre playlist sera mise à jour automatiquement dans notre système
Vous pouvez modifier, ajouter ou supprimer des titres jusqu'à 2 jours avant l'événement. Cette méthode nous permet d'assurer une ambiance parfaite le jour J

SPÉCIFIQUE AUX MARIAGES
Si l'événement est un mariage, assurez-vous d'inclure :
  - La musique d'entrée des mariés dans la salle du repas
  - La musique d'ouverture de bal
  - La musique du dessert`
  },
  "Interventions invités": {
    title: "Intervention des invités",
    content: `Vos invités souhaitent prendre la parole ? C'est possible ! Nous pouvons intégrer au programme (discours, chanson, sketch, vidéo-projection, etc.).
Pour une coordination optimale et ne pas perturber le repas, nous vous recommandons de prévoir ces moments entre le service des plats.
Merci de nous prévenir à l'avance pour que nous puissions organiser cela au mieux !
Contact & Infos sur le contrat.`
  },
  "Lieu de l'événement": {
    title: "Lieu de l'événement (+d'infos)",
    content: `INFORMATIONS TECHNIQUES ESSENTIELLES POUR VOTRE ÉVÉNEMENT

Pour garantir une installation technique parfaite et le bon déroulement de votre événement, nous aurions besoin des informations suivantes concernant le lieu :

PHOTOS DE LA SALLE :
  • Pourriez-vous nous envoyer des photos des quatre coins de la salle où l'événement est prévu ?
  • Cela nous aidera à visualiser l'espace et à planifier au mieux l'agencement du matériel

CONTRAINTES TECHNIQUES :
  • Y a-t-il un détecteur de fumée ou un limiteur de son installé dans la salle ?
  • Ces informations sont cruciales pour l'utilisation de certains équipements

ACCÈS À LA SALLE :
  • Pour évaluer la logistique d'acheminement du matériel, pourriez-vous nous décrire la facilité d'accès à la salle ?
  • Par exemple : escaliers, ascenseur, quai de chargement, ou toute autre particularité à prendre en compte

Ces détails nous permettront de préparer le matériel le plus adapté et d'assurer une installation fluide et efficace le jour J.`
  },
  "Repas (demande DJ)": {
    title: "Repas du DJ : Garantie de Service Continu",
    content: `Afin d'assurer une présence constante, une réactivité immédiate et de maintenir l'ambiance musicale et l'animation sans interruption (sans "blanc") tout au long du repas, nous demandons qu'un repas soit prévu pour le DJ :
Type de repas : Repas chaud et rapide si possible.
Placement : Pas de place assise à la table des invités, mais un emplacement à proximité des platines.
Timing : Le repas sera pris à un moment à convenir ensemble selon le planning de la soirée.
Votre collaboration sur ce point nous permet de rester acteur de votre événement et d'assurer une transition fluide entre chaque temps fort.`
  },
  "Sonorisation fourni par l'organisateur": {
    title: "Sonorisation fourni par l'organisateur",
    content: `SONORISATION FOURNIE PAR L'ORGANISATEUR

L'organisateur s'engage à fournir une sonorisation suffisante au nombre de personnes invitées.

EXIGENCES TECHNIQUES REQUISES :
  • Deux entrées XLR pour deux micros
  • Une entrée stéréo RCA ou jack pour brancher un ordinateur
  • Niveau sonore adapté à la taille de la salle
  • Test du matériel avant la prestation

COORDINATION :
  • Prévoir un temps de réglage avant l'intervention
  • Accès au matériel son pour l'artiste
  • Responsable technique présent si besoin

Merci de confirmer la disponibilité de ces éléments techniques.`
  },
  "Installation intervention hypnose": {
    title: "Installation intervention hypnose",
    content: `INSTALLATION INTERVENTION HYPNOSE

Exigences spécifiques pour l'aménagement de l'espace d'intervention.

AMÉNAGEMENT REQUIS :
  • Environ 10 chaises disposées face à l'artiste
  • Espace suffisant pour les participants (possibilité de s'allonger)
  • Zone dégagée pour les déplacements

ACCÈS À LA SCÈNE (si applicable) :
  • Accès facile via escalier ou rampe
  • Idéalement : escalier central pour un accès optimal
  • Sécurisation des zones de passage

ESPACE DE PERFORMANCE :
  • Surface plane et propre pour les volontaires
  • Éclairage suffisant sur la zone d'intervention
  • Espace libre de tout obstacle

Ces aménagements sont essentiels au bon déroulement de l'intervention hypnose.`
  }
};

// Styles musicaux pour les notes DJ
export const musicStyles = [
  "Valse", "Marche", "Rock n' roll", "Twist", "80's", "90's",
  "00's", "Allemand", "Soleil", "Latino", "Rock", "RnB", "Électro"
];

// Événements prédéfinis pour le déroulement de soirée
export const eventCategories = {
  repas: [
    "Apéritif",
    "Entrée",
    "Plat",
    "Fromage",
    "Dessert"
  ],
  musique: [
    "Musique",
    "Entrée des mariés",
    "Ouverture de bal",
    "Danse de couple",
    "Musique de 80 à début 2000",
    "Musique de 80 à aujourd'hui"
  ],
  animations: [
    "Blind test",
    "Chasse aux trésors",
    "Quiz interactif",
    "Confessionnal",
    "Discours des mariés",
    "Discours organisateur(trice)"
  ]
};

// Mapping événement → modèle CGV
export const eventToCgvMapping = {
  'Mariage': 'mariage',
  'Anniversaire': 'anniversaire',
  'Comité d\'entreprise': 'comite_entreprise',
  'Show Hypnose': 'show_hypnose',
  'Intervention hypnose': 'intervention_hypnose'
};

// Départements de France (Métropole + DROM-COM) et codes INSEE
export const FRENCH_DEPARTMENTS = [
  { code: "01", name: "01 - Ain", label: "Ain" },
  { code: "02", name: "02 - Aisne", label: "Aisne" },
  { code: "03", name: "03 - Allier", label: "Allier" },
  { code: "04", name: "04 - Alpes-de-Haute-Provence", label: "Alpes-de-Haute-Provence" },
  { code: "05", name: "05 - Hautes-Alpes", label: "Hautes-Alpes" },
  { code: "06", name: "06 - Alpes-Maritimes", label: "Alpes-Maritimes" },
  { code: "07", name: "07 - Ardèche", label: "Ardèche" },
  { code: "08", name: "08 - Ardennes", label: "Ardennes" },
  { code: "09", name: "09 - Ariège", label: "Ariège" },
  { code: "10", name: "10 - Aube", label: "Aube" },
  { code: "11", name: "11 - Aude", label: "Aude" },
  { code: "12", name: "12 - Aveyron", label: "Aveyron" },
  { code: "13", name: "13 - Bouches-du-Rhône", label: "Bouches-du-Rhône" },
  { code: "14", name: "14 - Calvados", label: "Calvados" },
  { code: "15", name: "15 - Cantal", label: "Cantal" },
  { code: "16", name: "16 - Charente", label: "Charente" },
  { code: "17", name: "17 - Charente-Maritime", label: "Charente-Maritime" },
  { code: "18", name: "18 - Cher", label: "Cher" },
  { code: "19", name: "19 - Corrèze", label: "Corrèze" },
  { code: "2A", name: "2A - Corse-du-Sud", label: "Corse-du-Sud" },
  { code: "2B", name: "2B - Haute-Corse", label: "Haute-Corse" },
  { code: "21", name: "21 - Côte-d'Or", label: "Côte-d'Or" },
  { code: "22", name: "22 - Côtes-d'Armor", label: "Côtes-d'Armor" },
  { code: "23", name: "23 - Creuse", label: "Creuse" },
  { code: "24", name: "24 - Dordogne", label: "Dordogne" },
  { code: "25", name: "25 - Doubs", label: "Doubs" },
  { code: "26", name: "26 - Drôme", label: "Drôme" },
  { code: "27", name: "27 - Eure", label: "Eure" },
  { code: "28", name: "28 - Eure-et-Loir", label: "Eure-et-Loir" },
  { code: "29", name: "29 - Finistère", label: "Finistère" },
  { code: "30", name: "30 - Gard", label: "Gard" },
  { code: "31", name: "31 - Haute-Garonne", label: "Haute-Garonne" },
  { code: "32", name: "32 - Gers", label: "Gers" },
  { code: "33", name: "33 - Gironde", label: "Gironde" },
  { code: "34", name: "34 - Hérault", label: "Hérault" },
  { code: "35", name: "35 - Ille-et-Vilaine", label: "Ille-et-Vilaine" },
  { code: "36", name: "36 - Indre", label: "Indre" },
  { code: "37", name: "37 - Indre-et-Loire", label: "Indre-et-Loire" },
  { code: "38", name: "38 - Isère", label: "Isère" },
  { code: "39", name: "39 - Jura", label: "Jura" },
  { code: "40", name: "40 - Landes", label: "Landes" },
  { code: "41", name: "41 - Loir-et-Cher", label: "Loir-et-Cher" },
  { code: "42", name: "42 - Loire", label: "Loire" },
  { code: "43", name: "43 - Haute-Loire", label: "Haute-Loire" },
  { code: "44", name: "44 - Loire-Atlantique", label: "Loire-Atlantique" },
  { code: "45", name: "45 - Loiret", label: "Loiret" },
  { code: "46", name: "46 - Lot", label: "Lot" },
  { code: "47", name: "47 - Lot-et-Garonne", label: "Lot-et-Garonne" },
  { code: "48", name: "48 - Lozère", label: "Lozère" },
  { code: "49", name: "49 - Maine-et-Loire", label: "Maine-et-Loire" },
  { code: "50", name: "50 - Manche", label: "Manche" },
  { code: "51", name: "51 - Marne", label: "Marne" },
  { code: "52", name: "52 - Haute-Marne", label: "Haute-Marne" },
  { code: "53", name: "53 - Mayenne", label: "Mayenne" },
  { code: "54", name: "54 - Meurthe-et-Moselle", label: "Meurthe-et-Moselle" },
  { code: "55", name: "55 - Meuse", label: "Meuse" },
  { code: "56", name: "56 - Morbihan", label: "Morbihan" },
  { code: "57", name: "57 - Moselle", label: "Moselle" },
  { code: "58", name: "58 - Nièvre", label: "Nièvre" },
  { code: "59", name: "59 - Nord", label: "Nord" },
  { code: "60", name: "60 - Oise", label: "Oise" },
  { code: "61", name: "61 - Orne", label: "Orne" },
  { code: "62", name: "62 - Pas-de-Calais", label: "Pas-de-Calais" },
  { code: "63", name: "63 - Puy-de-Dôme", label: "Puy-de-Dôme" },
  { code: "64", name: "64 - Pyrénées-Atlantiques", label: "Pyrénées-Atlantiques" },
  { code: "65", name: "65 - Hautes-Pyrénées", label: "Hautes-Pyrénées" },
  { code: "66", name: "66 - Pyrénées-Orientales", label: "Pyrénées-Orientales" },
  { code: "67", name: "67 - Bas-Rhin", label: "Bas-Rhin" },
  { code: "68", name: "68 - Haut-Rhin", label: "Haut-Rhin" },
  { code: "69", name: "69 - Rhône", label: "Rhône" },
  { code: "70", name: "70 - Haute-Saône", label: "Haute-Saône" },
  { code: "71", name: "71 - Saône-et-Loire", label: "Saône-et-Loire" },
  { code: "72", name: "72 - Sarthe", label: "Sarthe" },
  { code: "73", name: "73 - Savoie", label: "Savoie" },
  { code: "74", name: "74 - Haute-Savoie", label: "Haute-Savoie" },
  { code: "75", name: "75 - Paris", label: "Paris" },
  { code: "76", name: "76 - Seine-Maritime", label: "Seine-Maritime" },
  { code: "77", name: "77 - Seine-et-Marne", label: "Seine-et-Marne" },
  { code: "78", name: "78 - Yvelines", label: "Yvelines" },
  { code: "79", name: "79 - Deux-Sèvres", label: "Deux-Sèvres" },
  { code: "80", name: "80 - Somme", label: "Somme" },
  { code: "81", name: "81 - Tarn", label: "Tarn" },
  { code: "82", name: "82 - Tarn-et-Garonne", label: "Tarn-et-Garonne" },
  { code: "83", name: "83 - Var", label: "Var" },
  { code: "84", name: "84 - Vaucluse", label: "Vaucluse" },
  { code: "85", name: "85 - Vendée", label: "Vendée" },
  { code: "86", name: "86 - Vienne", label: "Vienne" },
  { code: "87", name: "87 - Haute-Vienne", label: "Haute-Vienne" },
  { code: "88", name: "88 - Vosges", label: "Vosges" },
  { code: "89", name: "89 - Yonne", label: "Yonne" },
  { code: "90", name: "90 - Territoire de Belfort", label: "Territoire de Belfort" },
  { code: "91", name: "91 - Essonne", label: "Essonne" },
  { code: "92", name: "92 - Hauts-de-Seine", label: "Hauts-de-Seine" },
  { code: "93", name: "93 - Seine-Saint-Denis", label: "Seine-Saint-Denis" },
  { code: "94", name: "94 - Val-de-Marne", label: "Val-de-Marne" },
  { code: "95", name: "95 - Val-d'Oise", label: "Val-d'Oise" },
  { code: "971", name: "971 - Guadeloupe", label: "Guadeloupe" },
  { code: "972", name: "972 - Martinique", label: "Martinique" },
  { code: "973", name: "973 - Guyane", label: "Guyane" },
  { code: "974", name: "974 - La Réunion", label: "La Réunion" },
  { code: "976", name: "976 - Mayotte", label: "Mayotte" },
  { code: "", name: "Autre département", label: "Autre département" }
];

export const FRENCH_DEPARTMENTS_CODES = FRENCH_DEPARTMENTS.reduce((acc, d) => {
  if (d.code) {
    acc[d.name] = d.code;
    acc[d.label] = d.code;
    acc[d.code] = d.code;
    acc[`${d.label} (${d.code})`] = d.code;
    acc[`${d.code} - ${d.label}`] = d.code;
  }
  return acc;
}, {});

// Alias pour rétrocompatibilité
export const GRAND_EST_DEPARTMENTS = FRENCH_DEPARTMENTS;
export const GRAND_EST_DEPARTMENTS_CODES = FRENCH_DEPARTMENTS_CODES;

