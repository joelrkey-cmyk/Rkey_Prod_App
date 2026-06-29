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
    "Entrée des mariés",
    "Ouverture de bal",
    "Danse de couple",
    "Musique de 80 à début 2000",
    "Musique de 80 à aujourd'hui"
  ],
  animations: [
    "Blind test",
    "Chasse au trésor",
    "Quiz interactif",
    "Confessionnal"
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
