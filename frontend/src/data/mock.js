// Hypnosis intervention duration options
export const hypnosisInterventionDurations = [
  { id: '45min', label: '45 minutes', value: '45 minutes' },
  { id: '45min-1h', label: '45 minutes à 1 heure', value: '45 minutes à 1 heure' },
  { id: '1h-1h30', label: '1h à 1h30', value: '1h à 1h30' },
  { id: '1h30-2h', label: '1h30 à 2h', value: '1h30 à 2h' },
  { id: '2h', label: '2h', value: '2h' }
];

// Hypnosis intervention technical equipment options
export const hypnosisInterventionEquipment = [
  { id: 'son-lumiere-inclus', label: 'Son et lumière inclus', value: 'Son et lumière inclus' },
  { id: 'son-lumiere-organisateur', label: 'Son et lumière fournis par l\'organisateur', value: 'Son et lumière fournis par l\'organisateur' },
  { id: 'sonorisation-inclus', label: 'Sonorisation inclus', value: 'Sonorisation inclus' },
  { id: 'sonorisation-organisateur', label: 'Sonorisation fourni par l\'organisateur', value: 'Sonorisation fourni par l\'organisateur' },
  { id: 'a-definir', label: 'À définir', value: 'À définir' },
  { id: 'a-definir-surcout', label: 'À définir (un surcoût peut s\'appliquer)', value: 'À définir (un surcoût peut s\'appliquer)' }
];

// Available animators
export const animators = [
  {
    id: 'joel',
    name: 'Joël R\'Key',
    specialties: ['DJ', 'Hypnose', 'Animation'],
    canDoHypnosis: true
  },
  {
    id: 'stefan',
    name: 'Stefan Edison', 
    specialties: ['DJ', 'Animation'],
    canDoHypnosis: false
  }
];

// Mock data for DJ quote application - Joël R'Key

export const eventTypes = [
  {
    id: 'wedding',
    name: 'Mariage',
    icon: '💒',
    basePrice: 1400,
    description: 'Animation complète pour votre mariage avec ambiance romantique et festive',
    requiresHypnosis: false
  },
  {
    id: 'birthday',
    name: 'Anniversaire',
    icon: '🎂',
    basePrice: 800,
    description: 'Animation personnalisée pour fête d\'anniversaire privée',
    requiresHypnosis: false
  },
  {
    id: 'corporate_committee',
    name: 'Comité d\'entreprise',
    icon: '🏢',
    basePrice: 1400,
    description: 'Animation professionnelle pour événements de comité d\'entreprise',
    requiresHypnosis: false
  },
  {
    id: 'association_event',
    name: 'Événement associatif',
    icon: '🤝',
    basePrice: 800,
    description: 'Animation pour événements associatifs et festivités locales',
    requiresHypnosis: false
  },
  {
    id: 'hypnosis_intervention',
    name: 'Intervention show hypnose',
    icon: '🎭',
    basePrice: 800,
    description: 'Intervention avec spectacle d\'hypnose dans votre établissement',
    requiresHypnosis: true
  },
  {
    id: 'hypnosis_show_association',
    name: 'Show Hypnose Association',
    icon: '🎭',
    basePrice: 2000,
    description: 'Spectacle d\'hypnose complet pour associations avec animation musicale et technique incluse',
    requiresHypnosis: true
  },
];

export const equipmentOptions = [
  {
    id: 'sound_system',
    name: 'Sonorisation professionnelle',
    price: 0,
    description: 'Système de sonorisation haute qualité avec enceintes et microphones',
    included: true
  },
  {
    id: 'lighting_premium',
    name: 'Éclairage professionnel',
    price: 0,
    description: 'Éclairage d\'ambiance et effets lumineux',
    included: true
  },
  {
    id: 'microphone_wireless',
    name: 'Microphone sans fil',
    price: 0,
    description: 'Microphone professionnel pour discours et animation',
    included: true
  },
  {
    id: 'sound_aperitif',
    name: 'Sonorisation vin d\'honneur',
    price: 50,
    description: 'Haut-parleurs 200W sur batterie, lecteur USB/Bluetooth (8h autonomie)'
  },
  {
    id: 'ceremony_sound',
    name: 'Cérémonie extérieure',
    price: 100,
    description: '2 enceintes sur pieds, micros sans fil et filaire pour officiant'
  },
  {
    id: 'room_lighting',
    name: 'Éclairage de salle',
    price: 150,
    description: 'Jusqu\'à 16 projecteurs LED sur batterie, pilotés en wifi'
  },
  {
    id: 'video_projector',
    name: 'Vidéoprojecteur / Écran',
    price: 50,
    description: 'Vidéoprojecteur 3500 lumens + écran 3,5m diagonal'
  },
  {
    id: 'bubble_machine',
    name: 'Machine à bulles',
    price: 50,
    description: '2 machines à bulles sur batterie, liquide fourni'
  },
  {
    id: 'spark_machine_2',
    name: 'Machine à étincelles froides (2)',
    price: 100,
    description: '2 machines projettent des fontaines d\'étincelles non-brûlantes'
  },
  {
    id: 'spark_machine_4',
    name: 'Machine à étincelles froides (4)',
    price: 170,
    description: '4 machines pour effet "Wahou" magique, sécuritaire intérieur/extérieur'
  },
  {
    id: 'heavy_smoke',
    name: 'Machine à fumée lourde',
    price: 140,
    description: 'Tapis de fumée au sol, effet "nuage" pour première danse'
  },
  {
    id: 'smoke_bubble',
    name: 'Machine à bulles de fumée',
    price: 150,
    description: 'Bulles remplies de brume pour effet onirique et poétique'
  }
];

export const durationOptions = [
  { id: '6h', name: '6 heures', multiplier: 0.8 },
  { id: '8h', name: '8 heures', multiplier: 1 },
  { id: 'unlimited', name: 'Sans limite horaire', multiplier: 1.2 },
  { id: 'full_day', name: 'Journée complète', multiplier: 1.5 }
];

export const guestRanges = [
  { id: 'small', name: '0-80 invités', multiplier: 0.9 },
  { id: 'medium', name: '81-150 invités', multiplier: 1 },
  { id: 'large', name: '151-250 invités', multiplier: 1.2 },
  { id: 'xlarge', name: '250+ invités', multiplier: 1.4 }
];

export const additionalServices = [
  {
    id: 'consultation',
    name: 'Entretien préalable personnalisé',
    price: 0,
    description: 'Rendez-vous gratuit en présentiel ou visioconférence pour planification détaillée',
    included: true
  },
  {
    id: 'travel',
    name: 'Déplacement inclus',
    price: 0,
    description: 'Transport et installation sur le lieu de l\'événement',
    included: true
  },
  {
    id: 'custom_playlist',
    name: 'Playlist sur-mesure',
    price: 0,
    description: 'Création d\'une playlist personnalisée selon vos goûts musicaux',
    included: true
  },
  {
    id: 'karaoke',
    name: 'Karaoké (option sans surcoût)',
    price: 0,
    description: 'Libérez les stars qui sommeillent en vous avec notre option karaoké ! Accompagné par un animateur professionnel qui saura mettre tout le monde à l\'aise, vous aurez accès à plus de 500 000 titres sur un matériel de qualité (vidéoprojecteur avec écran ou TV 65 pouces et deux micros). Ambiance garantie !',
    image: 'https://primary.jwwb.nl/public/z/u/c/temp-wxekxoenaqqmrukbzmwq/image-high-rihj3n.png?enable-io=true&enable=upscale&crop=1193%2C720%2Cx44%2Cy0%2Csafe&width=800&height=483',
    availableFor: ['birthday', 'corporate_committee']
  },
  {
    id: 'buzzers',
    name: 'Buzzers (option sans surcoût)',
    price: 0,
    description: 'Testez vos connaissances et votre rapidité avec nos blind tests musicaux et nos jeux de culture générale ! Nos 10 buzzers sans fil promettent des moments de suspense et d\'excitation.',
    image: 'https://primary.jwwb.nl/public/z/u/c/temp-wxekxoenaqqmrukbzmwq/buzzers-standard.png',
    availableFor: ['birthday', 'corporate_committee']
  },
  {
    id: 'quiz_interactif',
    name: 'Quiz interactif (option sans surcoût)',
    price: 0,
    description: 'Plongez dans l\'univers des jeux télévisés avec notre quiz interactif ! En scannant un simple QR Code, vos invités participent sur leur smartphone à des questions de culture générale ou sur des thèmes précis. Pour les entreprises, nous proposons un format entièrement personnalisable, alliant rapidité et justesse des réponses pour un challenge dynamique et convivial.',
    image: 'https://primary.jwwb.nl/public/z/u/c/temp-wxekxoenaqqmrukbzmwq/quiz-interactifs-standard.png',
    availableFor: ['birthday', 'corporate_committee']
  },
  {
    id: 'mini_hypnosis_show',
    name: 'Mini Show d\'hypnose - 45 min (option sans surcoût)',
    price: 0,
    description: 'Spectacle d\'hypnose avec volontaires, rires garantis (min. 50 adultes) - option sans surcoût avec votre prestation',
    requiresHypnosis: true,
    availableFor: ['wedding', 'birthday', 'corporate_committee'],
    hasSubOption: true,
    subOptionId: 'mini_hypnosis_show_detailed',
    subOptionName: 'Description détaillée du spectacle',
    subOptionDescription: '🎉 Envie d\'une expérience unique et mémorable ? Plongez vos invités dans l\'univers fascinant de l\'hypnose de spectacle, orchestré par un professionnel.\n\n✨ Au début du show, une brève introduction expliquera ce qu\'est l\'hypnose, un état de conscience modifié qui ne repose que sur le volontariat. Absolument personne n\'est forcé de participer, et le spectacle s\'adresse à un public de tout âge, dans une ambiance de respect et de bienveillance.\n\n🧠 Les participants intéressés seront ensuite invités à un test de réceptivité pour identifier les esprits les plus suggestibles. L\'objectif est d\'utiliser la suggestibilité naturelle de chacun pour créer des moments amusants et surprenants.\n\n🤩 Les plus réceptifs seront conviés à monter sur scène. Sans jamais les mettre dans des situations ridicules, ils seront guidés dans un voyage captivant entre rêve et imagination, pour le plus grand plaisir de l\'ensemble du public. Ce spectacle est une expérience positive et agréable, conçue dans le respect de l\'intégrité de chacun.'
  }
];

// Mock quotes data
export const mockQuotes = [
  {
    id: 1,
    clientName: 'Marie & Pierre Dubois',
    clientEmail: 'marie.dubois@email.com',
    clientPhone: '+33 6 12 34 56 78',
    eventType: 'wedding',
    eventDate: '2024-12-15',
    venue: 'Château de Malmaison, Rueil-Malmaison',
    eventDescription: 'Mariage élégant avec 120 invités, ambiance romantique et festive',
    totalPrice: 1450,
    status: 'sent',
    createdAt: '2024-07-20',
    sentAt: '2024-07-22T14:30:00',
    duration: 'unlimited',
    guests: 'medium',
    equipment: ['sound_system', 'lighting_premium', 'microphone_wireless', 'room_lighting'],
    services: ['consultation', 'travel', 'interactive_animation', 'custom_playlist'],
    validityDays: 15,
    depositPercentage: 50
  },
  {
    id: 2,
    clientName: 'Entreprise TechCorp',
    clientEmail: 'events@techcorp.fr',
    clientPhone: '+33 1 42 34 56 78',
    eventType: 'corporate_committee',
    eventDate: '2024-10-18',
    venue: 'Hôtel Marriott Paris Champs-Élysées',
    eventDescription: 'Soirée de fin d\'année du comité d\'entreprise, 80 collaborateurs',
    totalPrice: 1400,
    status: 'draft',
    createdAt: '2024-07-21',
    sentAt: null,
    duration: 'unlimited',
    guests: 'small',
    equipment: ['sound_system', 'lighting_premium', 'microphone_wireless'],
    services: ['consultation', 'travel', 'interactive_animation', 'custom_playlist'],
    validityDays: 15,
    depositPercentage: 50
  },
  {
    id: 3,
    clientName: 'Sophie Martin',
    clientEmail: 'sophie.martin@gmail.com',
    clientPhone: '+33 6 98 76 54 32',
    eventType: 'birthday',
    eventDate: '2024-11-25',
    venue: 'Domaine de la Rose, Versailles',
    eventDescription: '40 ans de Sophie, ambiance années 90-2000',
    totalPrice: 950,
    status: 'sent',
    createdAt: '2024-07-18',
    sentAt: '2024-07-25T09:15:00',
    duration: '8h',
    guests: 'small',
    equipment: ['sound_system', 'lighting_premium', 'microphone_wireless'],
    services: ['consultation', 'travel', 'custom_playlist'],
    validityDays: 15,
    depositPercentage: 50
  },
  {
    id: 4,
    clientName: 'Casino de Deauville',
    clientEmail: 'events@casino-deauville.fr',
    clientPhone: '+33 2 31 14 31 14',
    eventType: 'hypnosis_show',
    eventDate: '2024-12-31',
    venue: 'Casino Barrière de Deauville',
    eventDescription: 'Spectacle du Nouvel An avec show d\'hypnose et animation musicale',
    totalPrice: 1200,
    status: 'sent',
    createdAt: '2024-07-25',
    sentAt: '2024-07-26T16:45:00',
    duration: 'unlimited',
    guests: 'xlarge',
    equipment: ['sound_system', 'lighting_premium', 'microphone_wireless', 'video_projector'],
    services: ['consultation', 'travel', 'mini_hypnosis_show', 'setup_day_before'],
    validityDays: 15,
    depositPercentage: 50
  },
  {
    id: 5,
    clientName: 'Restaurant Le Gourmet',
    clientEmail: 'contact@legourmet.fr',
    clientPhone: '+33 1 45 67 89 12',
    eventType: 'hypnosis_intervention',
    eventDate: '2024-11-15',
    venue: 'Restaurant Le Gourmet, Paris 16e',
    eventDescription: 'Soirée à thème avec intervention hypnose pour divertir la clientèle',
    totalPrice: 750,
    status: 'draft',
    createdAt: '2024-07-22',
    sentAt: null,
    duration: '6h',
    guests: 'medium',
    equipment: ['sound_system', 'microphone_wireless'],
    services: ['consultation', 'travel', 'mini_hypnosis_show'],
    validityDays: 15,
    depositPercentage: 50
  },
  {
    id: 6,
    animator: 'stefan',
    clientName: 'Claire & Thomas Martin',
    clientEmail: 'claire.martin@gmail.com',
    clientPhone: '+33 6 78 90 12 34',
    eventType: 'wedding',
    eventDate: '2024-08-10',
    venue: 'Domaine de la Roseraie, Bordeaux',
    eventDescription: 'Mariage champêtre avec ambiance des années 80-90 et musique intergénérationnelle',
    totalPrice: 1400,
    status: 'sent',
    createdAt: '2024-07-15',
    sentAt: '2024-07-16T10:45:00',
    duration: 'unlimited',
    guestCount: '85',
    equipment: ['sound_system', 'lighting_premium', 'microphone_wireless'],
    services: ['consultation', 'travel', 'custom_playlist'],
    validityDays: 15,
    depositPercentage: 50
  }
];

export const companyInfo = {
  id: 'joel',
  name: 'Joël R\'Key - Animation DJ',
  djName: 'Joël R\'Key',
  photo: 'https://customer-assets.emergentagent.com/job_devis-dj-pro/artifacts/iqh1ynfu_Design%20sans%20titre%20%285%29.png',
  email: 'info@rkey-prod.fr',
  phone: '0783553674',
  address: 'R\'Key Prod, 5 rue du Hohlandsbourg, 67390 Marckolsheim',
  siret: '99992355000019',
  website: 'www.joelrkey-dj.fr',
  experience: 'plus de 17 ans d\'expérience',
  eventsCount: 'plus de 1300 événements (dont 600+ mariages) animés',
  weddingsCount: '600+ mariages',
  otherEventsCount: '600+ événements divers',
  diploma: 'Diplômé UCPA de Lyon',
  googleReviews: '165 avis positifs',
  satisfactionRate: '100%',
  googleMapsUrl: 'https://maps.google.com/reviews',
  meetingHours: 'du lundi au vendredi de 9h à 19h',
  meetingOptions: ['En personne au 5 rue du Hohlandsbourg, Marckolsheim', 'En visioconférence via Google Meet'],
  tagline: 'Plus qu\'une simple prestation, une ambiance créée sur mesure pour un événement inoubliable.',
  philosophy: 'Avec plus de 17 ans d\'expérience et plus de 1300 événements (dont 600+ mariages) animés, Joël R\'Key est avant tout un créateur de cohésion.\n\nSon talent réside dans sa capacité à utiliser l\'animation au micro de manière dynamique, souriante et jamais vulgaire, pour créer une ambiance sincère entre tous les invités. Joël prend toujours le soin d\'établir un déroulement sur mesure avec ses clients pour une projection parfaite de la soirée. En véritable DJ "Open Format", il utilise ensuite son expertise musicale et sa technique irréprochable pour s\'assurer que la piste de danse ne s\'éteigne jamais. Joël R\'Key s\'engage ainsi à faire de votre événement une réussite où l\'animation est reine, sans aucun temps mort.'
};

// Stefan Edison - DJ Animator (no hypnosis)
export const stefanEdisonInfo = {
  id: 'stefan',
  name: 'Stefan Edison',
  title: 'DJ Animateur Professionnel',
  photo: 'https://customer-assets.emergentagent.com/job_djquotemaster/artifacts/nqz195ox_Design%20sans%20titre%20%287%29.png',
  experience: '20+ années d\'expérience',
  eventsCount: '1000+ événements animés',
  email: 'info@rkey-prod.fr',
  phone: '0783553674',
  address: 'R\'Key Prod, 5 rue du Hohlandsbourg, 67390 Marckolsheim',
  siret: '42121827200019',
  specialties: [
    'Animation DJ pour mariages',
    'Événements d\'entreprise', 
    'Anniversaires et fêtes privées',
    'Bars et boîtes de nuit',
    'Sélection musicale intergénérationnelle'
  ],
  testimonials: [
    {
      name: 'Laurent & Marie',
      event: 'Mariage',
      text: 'Stefan a su créer une ambiance parfaite pour notre mariage. Très professionnel et à l\'écoute !',
      rating: 5
    },
    {
      name: 'Entreprise ModernTech',
      event: 'Événement d\'entreprise',
      text: 'Animation de qualité pour notre soirée d\'entreprise. Stefan maîtrise parfaitement son art.',
      rating: 5
    }
  ],
  googleReviews: '165 avis positifs',
  satisfactionRate: '100%',
  googleMapsUrl: 'https://maps.google.com/reviews',
  meetingHours: 'du lundi au vendredi de 9h à 19h',
  meetingOptions: ['En personne au 5 rue du Hohlandsbourg, Marckolsheim', 'En visioconférence via Google Meet'],
  tagline: 'Professionnel de l\'animation depuis plus de 20 ans avec une sélection musicale ultra-variée.',
  philosophy: 'Avec 20+ années d\'expérience et 1000+ événements animés, Stefan Edison est un DJ professionnel passionné spécialisé dans l\'animation d\'événements.\n\nProfessionnel de l\'animation depuis plus de 20 ans. Fort de son expérience dans les bars, les boîtes de nuit et les événements privés (anniversaires, mariages, soirées d\'entreprise, etc.), il saura adapter la musique et l\'ambiance à vos envies et à celles de vos invités. Sélection musicale personnalisée ultra-variée : des grands classiques des années 80 aux derniers hits du moment, en passant par les musiques de danse de salon et tous les styles intergénérationnels. Grâce à sa culture musicale très élargie, Stefan Edison saura créer une ambiance festive qui conviendra à tous, des plus jeunes aux plus anciens.'
};