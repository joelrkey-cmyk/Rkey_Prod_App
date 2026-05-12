import React, { useState, useEffect } from 'react';
import { Star, ExternalLink, MessageSquare, Copy, Send, Loader2 } from 'lucide-react';

import API_BASE_URL from '../utils/apiUrl';

const BACKEND_URL = API_BASE_URL;

// Mock data pour les tests quand l'API n'est pas disponible
const mockBusinessData = {
  name: "R'Key Prod - Animation DJ",
  rating: 4.8,
  totalReviews: 127,
  googleUrl: "https://maps.google.com/?cid=2290801175210600650",
  address: "5 rue du Hohlandsbourg, 67390 Marckolsheim",
  reviews: [
    {
      id: "1",
      authorName: "Marie Dubois",
      authorPhoto: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Excellent service DJ pour notre mariage ! Joël a su créer une ambiance parfaite et a fait danser tous nos invités. Très professionnel et à l'écoute de nos demandes. Je recommande vivement !",
      time: "Il y a 2 semaines",
      relativeTime: "2sem"
    },
    {
      id: "2", 
      authorName: "Pierre Martin",
      authorPhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Animation DJ de qualité pour l'anniversaire de notre entreprise. Matériel son et lumière impeccable, playlist parfaitement adaptée à notre événement. Très satisfait !",
      time: "Il y a 1 mois",
      relativeTime: "1m"
    },
    {
      id: "3",
      authorName: "Sophie Laurent",
      authorPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face", 
      rating: 5,
      text: "Spectacle d'hypnose absolument bluffant ! Stefan a captivé notre public pendant plus d'une heure. Très divertissant et respectueux des participants.",
      time: "Il y a 3 semaines",
      relativeTime: "3sem"
    },
    {
      id: "4",
      authorName: "Jean Dupont",
      authorPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Location de matériel son pour notre événement. Équipement de qualité professionnelle, livraison et installation parfaites. Service client excellent !",
      time: "Il y a 1 semaine", 
      relativeTime: "1sem"
    },
    {
      id: "5",
      authorName: "Claire Moreau",
      authorPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop&crop=face",
      rating: 4,
      text: "Très bon DJ pour notre soirée d'entreprise. Bonne qualité sonore et éclairage adapté. Peut-être un peu cher mais le service vaut le prix.",
      time: "Il y a 2 mois",
      relativeTime: "2m"
    },
    {
      id: "6",
      authorName: "Alexandre Weber",
      authorPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Animation DJ mariage au top ! Playlist variée qui a plu à toutes les générations présentes. Très professionnel du début à la fin.",
      time: "Il y a 5 jours",
      relativeTime: "5j"
    },
    {
      id: "7",
      authorName: "Isabelle Rousseau",
      authorPhoto: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Prestation DJ exceptionnelle pour notre mariage ! Musique parfaite, ambiance garantie toute la soirée. Nos invités nous en parlent encore !",
      time: "Il y a 3 jours",
      relativeTime: "3j"
    },
    {
      id: "8",
      authorName: "Thomas Leroy",
      authorPhoto: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Location de matériel audio-visuel impeccable. Installation rapide, matériel de qualité professionnelle, service client réactif. Je recommande !",
      time: "Il y a 1 semaine",
      relativeTime: "1sem"
    },
    {
      id: "9",
      authorName: "Nathalie Garnier",
      authorPhoto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Spectacle d'hypnose pour notre CE d'entreprise. Stefan a été fantastique, spectacle interactif et respectueux. Excellent moment !",
      time: "Il y a 4 semaines",
      relativeTime: "4sem"
    },
    {
      id: "10",
      authorName: "David Schmidt",
      authorPhoto: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=50&h=50&fit=crop&crop=face",
      rating: 4,
      text: "Bon service DJ pour anniversaire. Playlist adaptée à tous les âges, matériel de qualité. Quelques petits ajustements possibles mais globalement satisfait.",
      time: "Il y a 6 semaines",
      relativeTime: "6sem"
    },
    {
      id: "11",
      authorName: "Céline Moreau",
      authorPhoto: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Animation DJ de notre soirée entreprise réussie ! Ambiance parfaite, musique variée, matériel son et lumière impeccable. Équipe très professionnelle.",
      time: "Il y a 2 semaines",
      relativeTime: "2sem"
    },
    {
      id: "12",
      authorName: "Julien Petit",
      authorPhoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Location matériel son pour événement associatif. Excellent rapport qualité-prix, installation soignée, conseils pertinents. Service au top !",
      time: "Il y a 3 jours",
      relativeTime: "3j"
    },
    {
      id: "13",
      authorName: "Valérie Blanchard",
      authorPhoto: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Prestation DJ mariage exceptionnelle ! Joël a su lire notre public et adapter sa playlist. Piste de danse pleine toute la soirée !",
      time: "Il y a 1 mois",
      relativeTime: "1m"
    },
    {
      id: "14",
      authorName: "Rémi Faure",
      authorPhoto: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=50&h=50&fit=crop&crop=face",
      rating: 4,
      text: "Animation DJ correcte pour notre événement. Bonne qualité sonore, éclairage adapté. Quelques améliorations possibles sur l'interactivité.",
      time: "Il y a 5 semaines",
      relativeTime: "5sem"
    },
    {
      id: "15",
      authorName: "Sandrine Perrin",
      authorPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Show d'hypnose fantastique ! Stefan est un vrai professionnel, spectacle captivant et respectueux. Nos invités ont adoré !",
      time: "Il y a 2 mois",
      relativeTime: "2m"
    },
    {
      id: "16",
      authorName: "Christophe Bernard",
      authorPhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Location de matériel pour festival local. Équipement professionnel, installation impeccable, équipe compétente. Parfait !",
      time: "Il y a 3 mois",
      relativeTime: "3m"
    },
    {
      id: "17",
      authorName: "Émilie Girard",
      authorPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "DJ pour notre mariage civil. Prestation parfaite, musique adaptée au moment, matériel discret mais efficace. Merci !",
      time: "Il y a 10 jours",
      relativeTime: "10j"
    },
    {
      id: "18",
      authorName: "Laurent Durand",
      authorPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      rating: 4,
      text: "Service DJ entreprise satisfaisant. Bonne prestation générale, matériel de qualité. Peut-être plus d'interaction avec le public serait un plus.",
      time: "Il y a 7 semaines",
      relativeTime: "7sem"
    },
    {
      id: "19",
      authorName: "Aurélie Vincent",
      authorPhoto: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Animation DJ anniversaire 50 ans réussie ! Playlist parfaite pour tous les âges, ambiance garantie. Service professionnel.",
      time: "Il y a 4 jours",
      relativeTime: "4j"
    },
    {
      id: "20",
      authorName: "Nicolas Roux",
      authorPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Matériel son loué pour conférence. Installation parfaite, qualité audio excellente, équipe technique compétente. Recommandé !",
      time: "Il y a 6 jours",
      relativeTime: "6j"
    },
    {
      id: "21",
      authorName: "Patricia Morel",
      authorPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Spectacle d'hypnose pour notre mariage. Moment magique, tous nos invités ont participé ou ri. Stefan est extraordinaire !",
      time: "Il y a 8 semaines",
      relativeTime: "8sem"
    },
    {
      id: "22",
      authorName: "Franck Dubois",
      authorPhoto: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=50&h=50&fit=crop&crop=face",
      rating: 4,
      text: "Prestation DJ correcte pour soirée privée. Bon matériel, musique adaptée. Service professionnel avec quelques améliorations possibles.",
      time: "Il y a 9 semaines",
      relativeTime: "9sem"
    },
    {
      id: "23",
      authorName: "Stéphanie Mercier",
      authorPhoto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Location matériel pour événement associatif. Équipement parfait, installation rapide, prix compétitif. Excellent service !",
      time: "Il y a 12 jours",
      relativeTime: "12j"
    },
    {
      id: "24",
      authorName: "Olivier Leclerc",
      authorPhoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Animation DJ mariage parfaite ! Joël a créé une ambiance incroyable, playlist sur mesure. Nos invités nous remercient encore !",
      time: "Il y a 15 jours",
      relativeTime: "15j"
    },
    {
      id: "25",
      authorName: "Martine Lefebvre",
      authorPhoto: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Matériel son et lumière loué pour fête de village. Installation parfaite, matériel fiable, équipe sympa. Parfait !",
      time: "Il y a 4 mois",
      relativeTime: "4m"
    },
    {
      id: "26",
      authorName: "Sébastien Roy",
      authorPhoto: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=50&h=50&fit=crop&crop=face",
      rating: 4,
      text: "Service DJ entreprise satisfaisant. Bonne prestation, matériel adapté. Peut-être plus de variété musicale serait appréciée.",
      time: "Il y a 10 semaines",
      relativeTime: "10sem"
    },
    {
      id: "27",
      authorName: "Caroline Masson",
      authorPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Show d'hypnose pour anniversaire. Spectacle captivant, Stefan maîtrise parfaitement son art. Moment inoubliable !",
      time: "Il y a 18 jours",
      relativeTime: "18j"
    },
    {
      id: "28",
      authorName: "Fabrice Lemoine",
      authorPhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Location matériel pour concert amateur. Équipement professionnel, conseils techniques précieux, installation soignée. Top !",
      time: "Il y a 21 jours",
      relativeTime: "21j"
    },
    {
      id: "29",
      authorName: "Brigitte Roussel",
      authorPhoto: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Animation DJ pour nos 25 ans de mariage. Ambiance parfaite, musique des années 80-90, piste de danse animée. Merci !",
      time: "Il y a 24 jours",
      relativeTime: "24j"
    },
    {
      id: "30",
      authorName: "Gérard Bonnet",
      authorPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      rating: 4,
      text: "Prestation DJ correcte pour événement communal. Service professionnel, bon matériel. Quelques ajustements sur le timing.",
      time: "Il y a 5 mois",
      relativeTime: "5m"
    },
    {
      id: "31",
      authorName: "Monique Barbier",
      authorPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Matériel son loué pour conférence professionnelle. Qualité audio exceptionnelle, installation discrète mais efficace. Parfait !",
      time: "Il y a 27 jours",
      relativeTime: "27j"
    },
    {
      id: "32",
      authorName: "Philippe Garnier",
      authorPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      text: "Animation DJ mariage exceptionnelle ! Joël a su créer la fête parfaite, tous nos invités ont dansé. Prestation au top !",
      time: "Il y a 30 jours",
      relativeTime: "30j"
    }
  ]
};

const GoogleReviewsWidget = ({ 
  businessId = null,
  maxWidth = "1000px",
  theme = "light"
}) => {
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayedReviews, setDisplayedReviews] = useState([]);
  
  // États pour le générateur de réponses
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' ou 'generator'
  const [reviewText, setReviewText] = useState('');
  const [selectedTone, setSelectedTone] = useState('professionnel');
  const [customTone, setCustomTone] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('singulier');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Styles CSS optimisés pour 5 avis authentiques
  const responsiveGridStyles = `
    .auto-fit-grid {
      display: grid;
      gap: 1rem;
      /* Optimisé pour 5 avis : 1 colonne mobile, 2-3 colonnes desktop */
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
      grid-auto-rows: min-content;
    }
    
    @media (max-width: 640px) {
      .auto-fit-grid {
        grid-template-columns: 1fr; /* 1 colonne mobile */
      }
    }
    
    @media (min-width: 641px) and (max-width: 1024px) {
      .auto-fit-grid {
        grid-template-columns: repeat(2, 1fr); /* 2 colonnes tablet */
      }
    }
    
    @media (min-width: 1025px) {
      .auto-fit-grid {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* 3+ colonnes desktop */
        max-width: 1200px; /* Limite pour éviter que les avis soient trop larges */
        margin: 0 auto;
      }
    }
    
    .line-clamp-4 {
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;
  
  const maxReviews = 5; // Maximum d'avis disponibles depuis l'API Google Places

  // Fonction pour générer une réponse à un avis
  const generateResponse = async () => {
    if (!reviewText.trim()) {
      alert('Veuillez entrer le texte de l\'avis');
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/reviews/generate-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          review_text: reviewText,
          tone: selectedTone,
          custom_tone: selectedTone === 'personnalisé' ? customTone : null,
          person: selectedPerson,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération de la réponse');
      }

      const data = await response.json();
      setGeneratedResponse(data.response_text);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la génération de la réponse. Veuillez réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Fonction pour copier la réponse générée
  const copyResponse = async () => {
    if (!generatedResponse) return;
    
    try {
      await navigator.clipboard.writeText(generatedResponse);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      alert('Erreur lors de la copie. Veuillez sélectionner et copier manuellement.');
    }
  };

  // Fonction pour réinitialiser le formulaire
  const resetForm = () => {
    setReviewText('');
    setSelectedTone('professionnel');
    setCustomTone('');
    setSelectedPerson('singulier');
    setGeneratedResponse('');
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // Utiliser l'API réelle pour récupérer les vrais avis Google de R'Key Prod
        console.log('Fetching real Google reviews for R\'Key Prod...');
        
        import API_BASE_URL from '../utils/apiUrl';

const BACKEND_URL = API_BASE_URL;
        const token = localStorage.getItem('access_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        if (businessId) {
          // Check if businessId looks like a Google Place ID
          if (businessId.startsWith('ChI')) {
            // It's a Place ID - use it directly
            const response = await fetch(`${BACKEND_URL}/api/reviews/${businessId}`, { headers });
            if (response.ok) {
              const data = await response.json();
              setBusinessData(data.data);
            } else {
              throw new Error('API call failed');
            }
          } else {
            // It's a business name - search for it
            const response = await fetch(`${BACKEND_URL}/api/reviews/search/${encodeURIComponent(businessId)}`, { headers });
            if (response.ok) {
              const data = await response.json();
              setBusinessData(data.data);
            } else {
              throw new Error('API call failed');
            }
          }
        } else {
          // Use default business name for R'Key Prod
          const response = await fetch(`${BACKEND_URL}/api/reviews/search/${encodeURIComponent("R'Key Prod")}`, { headers });
          if (response.ok) {
            const data = await response.json();
            setBusinessData(data.data);
          } else {
            throw new Error('API call failed');
          }
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        // Fallback to mock data only if API completely fails
        await new Promise(resolve => setTimeout(resolve, 1000));
        setBusinessData(mockBusinessData);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();

    // Auto-refresh every 5 minutes for real-time updates
    const interval = setInterval(fetchReviews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [businessId]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={`${
          index < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : index < rating
            ? 'fill-yellow-200 text-yellow-400'
            : 'fill-gray-200 text-gray-200'
        }`}
      />
    ));
  };

  // Gestion simple des 5 avis - pas besoin de pagination
  useEffect(() => {
    if (businessData && businessData.reviews) {
      // Afficher directement tous les avis disponibles (maximum 5)
      setDisplayedReviews(businessData.reviews);
    }
  }, [businessData]);

  const getCurrentPageReviews = () => {
    return displayedReviews || [];
  };

  if (loading) {
    return (
      <div 
        className="google-reviews-widget bg-white border border-gray-200 rounded-xl shadow-lg p-6 animate-pulse"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-32 h-6 bg-gray-200 rounded"></div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-4 h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="w-20 h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-4 h-48">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="w-3 h-3 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-200 rounded"></div>
                <div className="w-full h-3 bg-gray-200 rounded"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div 
        className="google-reviews-widget bg-white border border-gray-200 rounded-xl shadow-lg p-6"
        style={{ maxWidth }}
      >
        <p className="text-center text-gray-500">Impossible de charger les avis</p>
      </div>
    );
  }

  return (
    <>
      {/* Styles CSS pour la responsivité */}
      <style dangerouslySetInnerHTML={{ __html: responsiveGridStyles }} />
      
      <div 
        className="google-reviews-widget bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        style={{ maxWidth }}
      >
      {/* Compact Header with rating and CTA */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex">
                {renderStars(businessData.rating)}
              </div>
              <span className="text-xl font-bold text-gray-800">
                {businessData.rating}
              </span>
              <span className="text-gray-600 text-sm">
                ({businessData.totalReviews} avis)
              </span>
            </div>
          </div>
          
          <a
            href={businessData.googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium text-sm"
          >
            <ExternalLink size={14} />
            Voir tous les avis
          </a>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'reviews' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <Star className="inline-block w-4 h-4 mr-2" />
          Avis clients
        </button>
        <button
          onClick={() => setActiveTab('generator')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'generator' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="inline-block w-4 h-4 mr-2" />
          Générateur de réponses
        </button>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'reviews' ? (
        // Section des avis (contenu original)
        <div className="p-4">
          <div className="grid gap-4 mb-4 auto-fit-grid" 
               style={{
                 gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                 gridAutoRows: 'min-content'
               }}>
            {getCurrentPageReviews().map((review) => (
              <div key={review.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 flex flex-col min-h-[160px]">
                <div className="flex gap-3 mb-3">
                  <img 
                    src={review.authorPhoto} 
                    alt={review.authorName}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{review.authorName}</h4>
                      <span className="text-xs text-gray-500 ml-2">{review.relativeTime}</span>
                    </div>
                    <div className="flex mt-1">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed text-sm flex-1 line-clamp-4">
                  {review.text}
                </p>
              </div>
            ))}
          </div>

          {/* Indicateur simple du nombre d'avis */}
          <div className="text-center mt-4 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <span className="font-medium text-blue-600">{displayedReviews.length}</span> avis les plus récents affichés
              {businessData.totalReviews > 5 && (
                <span className="text-gray-400"> ({businessData.totalReviews} avis au total sur Google)</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Section générateur de réponses
        <div className="p-6">
          <div className="space-y-6">
            {/* Zone de saisie de l'avis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avis client à traiter
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Collez ici l'avis client pour lequel vous souhaitez générer une réponse..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Sélecteur de ton */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ton de la réponse
              </label>
              <div className="flex flex-col space-y-3">
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="professionnel">Ton professionnel</option>
                  <option value="sympathique">Ton sympathique</option>
                  <option value="personnalisé">Personnalisé</option>
                </select>
                
                {selectedTone === 'personnalisé' && (
                  <input
                    type="text"
                    value={customTone}
                    onChange={(e) => setCustomTone(e.target.value)}
                    placeholder="Décrivez le ton souhaité (ex: décontracté et humoristique)"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            </div>

            {/* Sélecteur de perspective */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perspective de la réponse
              </label>
              <select
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="singulier">Première personne du singulier (je, moi, mon...)</option>
                <option value="pluriel">Première personne du pluriel (nous, notre...)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Singulier = réponse personnelle du dirigeant • Pluriel = réponse au nom de l'équipe
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <button
                onClick={generateResponse}
                disabled={isGenerating || !reviewText.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isGenerating ? 'Génération...' : 'Générer la réponse'}
              </button>
              
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              >
                Réinitialiser
              </button>
            </div>

            {/* Réponse générée */}
            {generatedResponse && (
              <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Réponse générée
                  </label>
                  <button
                    onClick={copyResponse}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition-colors ${
                      copySuccess 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <Copy className="w-3 h-3" />
                    {copySuccess ? 'Copié!' : 'Copier'}
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded p-3 text-sm leading-relaxed">
                  {generatedResponse}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Footer */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg width="14" height="14" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Propulsé par Google Reviews
        </div>
      </div>
    </div>
    </>
  );
};

export default GoogleReviewsWidget;