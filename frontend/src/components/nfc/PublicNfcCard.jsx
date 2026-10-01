import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Phone, Mail, Globe, MapPin, UserPlus, ExternalLink, Linkedin, Instagram, 
  Youtube, Facebook, MessageSquare, AlertCircle, Loader2, Send, CheckCircle2, UserCheck,
  Star, Navigation, MessageCircle
} from 'lucide-react';
import MyDjLogo from '../MyDjLogo';
import { downloadVCard } from './vcardHelper';

export default function PublicNfcCard() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Exchange contact form state
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [showNewsletterDrawer, setShowNewsletterDrawer] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [exchangeSuccess, setExchangeSuccess] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    note: ''
  });

  useEffect(() => {
    const fetchCard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/nfc-cards/${id}`);
        if (!res.ok) {
          throw new Error("Carte de visite introuvable");
        }
        const data = await res.json();
        setCard(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching NFC card:", err);
        setError(err.message || "Impossible de charger la carte de visite.");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchCard();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#e86405]" />
        <p className="mt-4 text-sm text-gray-400 font-medium">Chargement du profil R'KEY PROD...</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3 animate-bounce" />
          <h2 className="text-lg font-bold text-red-400 mb-1">Oups !</h2>
          <p className="text-sm text-gray-300">{error || "Cette carte de visite n'existe pas."}</p>
        </div>
        <a 
          href="https://rkeyprod.fr" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-6 text-[#e86405] hover:underline text-sm font-semibold flex items-center gap-1.5"
        >
          Visiter rkeyprod.fr <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const getWhatsAppLink = (phone) => {
    if (!phone) return null;
    let clean = phone.replace(/[\s\-()]/g, '');
    if (clean.startsWith('0')) {
      clean = '33' + clean.slice(1);
    }
    return `https://wa.me/${clean}`;
  };

  const formatExternalLink = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleExchangeInputChange = (field, val) => {
    setExchangeForm(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();
    if (!exchangeForm.firstName || !exchangeForm.lastName) {
      alert("Le prénom et le nom sont requis pour échanger vos coordonnées.");
      return;
    }

    try {
      setExchanging(true);
      const res = await fetch(`/api/public/nfc-cards/${id}/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exchangeForm)
      });

      if (res.ok) {
        setExchangeSuccess(true);
        setExchangeForm({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          company: '',
          note: ''
        });
      } else {
        alert("Une erreur est survenue lors de l'envoi.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setExchanging(false);
    }
  };

  const whatsappUrl = getWhatsAppLink(card.phone);
  
  // Navigation URL using exact Google Maps directory parameters
  const navigationUrl = card.location 
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(card.location)}` 
    : '';

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-start overflow-y-auto px-4 py-8">
      {/* High-fidelity Subtle Glow (Pure black theme optimized) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-screen pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[110%] h-[35%] bg-gradient-to-b from-[#e86405]/12 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[110%] h-[35%] bg-gradient-to-t from-orange-600/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-[#09090b] border border-zinc-800/80 rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col items-center pt-16">
        
        {/* Banner with R'KEY branding (curved floating design) */}
        <div className="w-[calc(100%-32px)] h-28 bg-gradient-to-r from-[#e86405] to-[#FF7A00] relative flex items-center justify-center rounded-2xl overflow-hidden shadow-inner mx-4">
          <div className="absolute inset-0 bg-black/20" />
          <span className="text-white/20 font-black tracking-widest text-3xl select-none">R'KEY PROD</span>
        </div>

        {/* Profile Circle & Avatar (extended/overlapping above top edge of the banner) */}
        <div className="relative -mt-32 mb-4 flex justify-center z-20">
          <div className="w-44 h-44 rounded-full border-4 border-[#09090b] bg-[#18181b] shadow-xl overflow-hidden flex items-center justify-center">
            {card.avatarUrl ? (
              <img 
                src={card.avatarUrl} 
                alt={`${card.firstName} ${card.lastName}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center text-3xl font-extrabold text-white bg-gradient-to-br from-[#e86405] to-orange-500">' + card.firstName[0] + card.lastName[0] + '</div>';
                }}
              />
            ) : (
              <MyDjLogo className="w-full h-full p-2" glow={false} />
            )}
          </div>
        </div>

        {/* Name and description (Clean unboxed metadata) */}
        <div className="text-center px-6 w-full">
          <h1 className="text-2xl font-black tracking-tight text-white mb-1">
            {card.firstName} {card.lastName}
          </h1>
          <p className="text-[#e86405] text-sm font-semibold uppercase tracking-wider mb-2">
            {card.role || "R'KEY PROD TEAM"}
          </p>
          <div className="text-zinc-500 text-xs font-medium flex items-center gap-1.5 justify-center flex-wrap">
            <span className="font-semibold text-zinc-300">R'KEY PROD</span>
            {card.location && (
              <>
                <span aria-hidden="true" className="text-zinc-700">·</span>
                {/* Location text click trigger for Instant GPS navigation */}
                <a 
                  href={navigationUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-zinc-400 hover:text-[#e86405] transition-colors"
                  title="Lancer l'itinéraire GPS"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#e86405]" /> 
                  <span className="underline decoration-dotted">{card.location}</span>
                </a>
              </>
            )}
          </div>

          {/* Premium Google Reviews Rating Badge */}
          {card.googleReviewsUrl && (
            <div className="mt-4 flex justify-center">
              <a 
                href={formatExternalLink(card.googleReviewsUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/40 rounded-full transition-all text-xs text-yellow-500 font-bold"
              >
                <div className="flex gap-0.5 text-yellow-500">
                  <Star className="w-3.5 h-3.5 fill-yellow-500" />
                  <Star className="w-3.5 h-3.5 fill-yellow-500" />
                  <Star className="w-3.5 h-3.5 fill-yellow-500" />
                  <Star className="w-3.5 h-3.5 fill-yellow-500" />
                  <Star className="w-3.5 h-3.5 fill-yellow-500" />
                </div>
                <span>Avis Google · Laissez-nous une note</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {card.bio && (
            <p className="mt-4 text-sm text-zinc-300 bg-zinc-950/80 border border-zinc-800/50 py-3.5 px-4 rounded-2xl italic leading-relaxed text-left">
              {card.bio}
            </p>
          )}
        </div>

        {/* Primary Action Row */}
        <div className="w-full px-6 mt-6 space-y-3">
          <button
            onClick={() => downloadVCard(card)}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#e86405] to-[#FF7A00] hover:from-[#d15400] hover:to-[#e86405] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#e86405]/15 active:scale-[0.98] transition-all cursor-pointer"
          >
            <UserPlus className="w-5.5 h-5.5" />
            Enregistrer le contact
          </button>
          
          <button
            onClick={() => {
              setShowExchangeForm(!showExchangeForm);
              setExchangeSuccess(false);
              setShowNewsletterDrawer(false);
            }}
            className="w-full h-14 rounded-2xl border-2 border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 hover:border-[#e86405]/50 text-white font-bold text-base flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <UserCheck className="w-5.5 h-5.5 text-[#e86405]" />
            Échanger nos coordonnées
          </button>

          <p className="text-center text-[10px] text-zinc-600 mt-2">
            Problème de téléchargement ? <a href={`/api/public/nfc-cards/vcard/${card.id || card._id}`} className="text-[#e86405] underline hover:text-orange-400">Télécharger la vCard (.vcf)</a>
          </p>
        </div>

        {/* TWO-WAY CONTACT EXCHANGE DRAWER/ACCORDION */}
        {showExchangeForm && (
          <div className="w-full px-6 mt-4 transition-all duration-300">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-left relative overflow-hidden">
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                Partager vos coordonnées
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Remplissez ce formulaire pour envoyer instantanément vos coordonnées à {card.firstName} en retour.
              </p>

              {exchangeSuccess ? (
                <div className="py-4 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-400">Coordonnées partagées !</p>
                  <p className="text-[11px] text-zinc-400">Merci, vos coordonnées ont bien été transmises.</p>
                  <button
                    onClick={() => setShowExchangeForm(false)}
                    className="mt-3 text-xs text-[#e86405] font-semibold hover:underline"
                  >
                    Fermer le formulaire
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExchangeSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">Prénom *</label>
                      <input
                        type="text"
                        required
                        value={exchangeForm.firstName}
                        onChange={(e) => handleExchangeInputChange('firstName', e.target.value)}
                        className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-[#e86405]"
                        placeholder="ex: Marie"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">Nom *</label>
                      <input
                        type="text"
                        required
                        value={exchangeForm.lastName}
                        onChange={(e) => handleExchangeInputChange('lastName', e.target.value)}
                        className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-[#e86405]"
                        placeholder="ex: Dupont"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">Téléphone</label>
                      <input
                        type="tel"
                        value={exchangeForm.phone}
                        onChange={(e) => handleExchangeInputChange('phone', e.target.value)}
                        className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-[#e86405]"
                        placeholder="ex: 06 12 34 56 78"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">E-mail</label>
                      <input
                        type="email"
                        value={exchangeForm.email}
                        onChange={(e) => handleExchangeInputChange('email', e.target.value)}
                        className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-[#e86405]"
                        placeholder="ex: marie.dupont@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">Entreprise</label>
                      <input
                        type="text"
                        value={exchangeForm.company}
                        onChange={(e) => handleExchangeInputChange('company', e.target.value)}
                        className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-[#e86405]"
                        placeholder="ex: Ma Société"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">Note / Message</label>
                    <textarea
                      value={exchangeForm.note}
                      onChange={(e) => handleExchangeInputChange('note', e.target.value)}
                      rows="2"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#e86405] resize-none"
                      placeholder="ex: Ravi de notre rencontre au salon !"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={exchanging}
                    className="w-full h-10 rounded-xl bg-[#e86405] hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {exchanging ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Envoyer mes coordonnées
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* EMBEDDED HOSTINGER REACH NEWSLETTER DRAWER */}
        {card.newsletterUrl && showNewsletterDrawer && (
          <div className="w-full px-6 mt-4 transition-all duration-300">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-left relative overflow-hidden">
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-orange-500" />
                S'abonner à la Newsletter
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Inscrivez-vous directement ci-dessous pour recevoir nos nouveautés, offres et événements.
              </p>

              {/* Responsive Iframe Container */}
              <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-white" style={{ height: '480px' }}>
                <iframe 
                  src={formatExternalLink(card.newsletterUrl)}
                  title="Formulaire d'inscription à la newsletter"
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </div>

              <div className="mt-4 text-center">
                <a 
                  href={formatExternalLink(card.newsletterUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#e86405] hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Ouvrir le formulaire dans un nouvel onglet <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Quick Taps (Touch-First Communication grid with SMS and Maps integrated) */}
        <div className="w-full px-6 mt-6">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-left mb-3">Accès Rapide</h3>
          <div className="grid grid-cols-2 gap-3">
            {card.phone && (
              <a
                href={`tel:${card.phone}`}
                className="flex items-center gap-3 p-3.5 bg-zinc-950/80 border border-zinc-800/80 hover:border-[#e86405]/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all"
              >
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[11px] text-zinc-500 font-medium">Appeler</span>
                  <span className="block text-xs font-semibold truncate text-zinc-200">{card.phone}</span>
                </div>
              </a>
            )}

            {card.phone && (
              <a
                href={`sms:${card.phone}`}
                className="flex items-center gap-3 p-3.5 bg-zinc-950/80 border border-zinc-800/80 hover:border-[#e86405]/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all"
              >
                <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[11px] text-zinc-500 font-medium">SMS</span>
                  <span className="block text-xs font-semibold truncate text-zinc-200">Envoyer SMS</span>
                </div>
              </a>
            )}

            {card.phone && whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-zinc-950/80 border border-zinc-800/80 hover:border-[#e86405]/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all"
              >
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[11px] text-zinc-500 font-medium">WhatsApp</span>
                  <span className="block text-xs font-semibold truncate text-zinc-200">Message</span>
                </div>
              </a>
            )}

            {card.email && (
              <a
                href={`mailto:${card.email}`}
                className="flex items-center gap-3 p-3.5 bg-zinc-950/80 border border-zinc-800/80 hover:border-[#e86405]/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all"
              >
                <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <span className="block text-[11px] text-zinc-500 font-medium">Email</span>
                  <span className="block text-xs font-semibold truncate text-zinc-200">{card.email}</span>
                </div>
              </a>
            )}

            {card.website && (
              <a
                href={formatExternalLink(card.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-zinc-950/80 border border-zinc-800/80 hover:border-[#e86405]/45 hover:bg-orange-950/10 rounded-2xl transition-all col-span-2 shadow-inner"
              >
                <div className="p-2 bg-orange-500/10 rounded-xl text-[#e86405]">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <span className="block text-[11px] text-[#e86405] font-bold">Visiter notre Site Web</span>
                  <span className="block text-xs font-semibold truncate text-zinc-300">{card.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </div>
              </a>
            )}

            {card.location && navigationUrl && (
              <a
                href={navigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-zinc-950/80 border border-zinc-800/80 hover:border-cyan-500/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all col-span-2"
              >
                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                  <Navigation className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <span className="block text-[11px] text-cyan-400 font-bold">Calculer l'itinéraire</span>
                  <span className="block text-xs font-semibold truncate text-zinc-300">Let's Go !</span>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Social Links Panel (Centered elegant app pastilles row to save space) */}
        {card.socials && Object.values(card.socials).some(Boolean) && (
          <div className="w-full px-6 mt-6 mb-8 text-center">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3.5">Réseaux Sociaux</h3>
            <div className="flex items-center justify-center gap-3.5 flex-wrap">
              {card.socials.linkedin && (
                <a
                  href={formatExternalLink(card.socials.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-blue-500/50 hover:bg-blue-500/10 flex items-center justify-center transition-all group"
                  title="LinkedIn"
                >
                  <Linkedin className="w-5.5 h-5.5 text-blue-400 group-hover:scale-110 transition-transform" />
                </a>
              )}

              {card.socials.instagram && (
                <a
                  href={formatExternalLink(card.socials.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-pink-500/50 hover:bg-pink-500/10 flex items-center justify-center transition-all group"
                  title="Instagram"
                >
                  <Instagram className="w-5.5 h-5.5 text-pink-400 group-hover:scale-110 transition-transform" />
                </a>
              )}

              {card.socials.youtube && (
                <a
                  href={formatExternalLink(card.socials.youtube)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-red-500/50 hover:bg-red-500/10 flex items-center justify-center transition-all group"
                  title="YouTube"
                >
                  <Youtube className="w-5.5 h-5.5 text-red-500 group-hover:scale-110 transition-transform" />
                </a>
              )}

              {card.socials.facebook && (
                <a
                  href={formatExternalLink(card.socials.facebook)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-blue-600/50 hover:bg-blue-600/10 flex items-center justify-center transition-all group"
                  title="Facebook"
                >
                  <Facebook className="w-5.5 h-5.5 text-blue-500 group-hover:scale-110 transition-transform" />
                </a>
              )}

              {card.socials.tiktok && (
                <a
                  href={formatExternalLink(card.socials.tiktok)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-teal-500/50 hover:bg-teal-500/10 flex items-center justify-center transition-all group"
                  title="TikTok"
                >
                  <span className="font-extrabold text-sm text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-pink-500 group-hover:scale-110 transition-transform">TT</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Newsletter Section (Right below Social Icons) */}
        {card.newsletterUrl && (
          <div className="w-full px-6 mt-4 mb-6 text-center animate-fade-in">
            <button
              onClick={() => {
                setShowNewsletterDrawer(!showNewsletterDrawer);
                setShowExchangeForm(false);
              }}
              className="w-full h-14 rounded-2xl border-2 border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 hover:border-orange-500/50 text-white font-bold text-base flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-orange-500/5"
            >
              <Mail className="w-5.5 h-5.5 text-orange-500 animate-pulse" />
              S'abonner à la Newsletter
            </button>
          </div>
        )}

        {/* Second Activity Block (Separated beautifully with custom label indicator) */}
        {card.hasSecondActivity && (
          <div className="w-full px-6 mt-20 mb-8 text-center animate-fade-in">
            {/* Beautiful visual red banner behind the photo */}
            <div className="w-full h-24 bg-gradient-to-r from-red-600 to-rose-700 relative flex items-center justify-center rounded-2xl overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-black/20" />
              <span className="text-white/20 font-black tracking-widest text-lg select-none uppercase">
                {card.secondActivityLabel || 'Deuxième Activité'}
              </span>
            </div>

            {/* Secondary Profile Picture on Public Page overlapping the banner */}
            {card.secondAvatarUrl && (
              <div className="relative -mt-[156px] mb-6 flex justify-center z-20">
                <div className="w-[216px] h-[216px] rounded-full border-4 border-[#09090b] bg-[#18181b] shadow-xl overflow-hidden flex items-center justify-center">
                  <img 
                    src={card.secondAvatarUrl} 
                    alt={card.secondActivityLabel || 'Deuxième Activité'} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}

            {/* Second Activity Name and Role / Title below the photo */}
            <div className="mb-6 mt-2 text-center">
              {card.secondActivityName && (
                <h3 className="text-lg font-bold tracking-tight text-white mb-1 uppercase font-sans">
                  {card.secondActivityName}
                </h3>
              )}
              <p className="text-red-500 text-xs font-black uppercase tracking-widest leading-relaxed">
                {card.secondActivityLabel || 'Deuxième Activité'}
              </p>
            </div>

            {/* Website of Second Activity - Red Theme */}
            {card.secondWebsite && (
              <div className="mb-6">
                <a
                  href={formatExternalLink(card.secondWebsite)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-zinc-950/80 border border-zinc-800/80 hover:border-red-500/50 hover:bg-red-950/10 rounded-2xl transition-all shadow-inner text-left"
                >
                  <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <span className="block text-[11px] text-red-500 font-bold">Visiter le Site Web</span>
                    <span className="block text-xs font-semibold truncate text-zinc-300">
                      {card.secondWebsite.replace(/^https?:\/\/(www\.)?/, '')}
                    </span>
                  </div>
                </a>
              </div>
            )}

            {/* Social handles for Second Activity */}
            {card.secondSocials && Object.values(card.secondSocials).some(Boolean) && (
              <div className="flex items-center justify-center gap-3.5 flex-wrap">
                {card.secondSocials.linkedin && (
                  <a
                    href={formatExternalLink(card.secondSocials.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-blue-500/50 hover:bg-blue-500/10 flex items-center justify-center transition-all group"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-5.5 h-5.5 text-blue-400 group-hover:scale-110 transition-transform" />
                  </a>
                )}

                {card.secondSocials.instagram && (
                  <a
                    href={formatExternalLink(card.secondSocials.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-pink-500/50 hover:bg-pink-500/10 flex items-center justify-center transition-all group"
                    title="Instagram"
                  >
                    <Instagram className="w-5.5 h-5.5 text-pink-400 group-hover:scale-110 transition-transform" />
                  </a>
                )}

                {card.secondSocials.facebook && (
                  <a
                    href={formatExternalLink(card.secondSocials.facebook)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-blue-600/50 hover:bg-blue-600/10 flex items-center justify-center transition-all group"
                    title="Facebook"
                  >
                    <Facebook className="w-5.5 h-5.5 text-blue-500 group-hover:scale-110 transition-transform" />
                  </a>
                )}

                {card.secondSocials.tiktok && (
                  <a
                    href={formatExternalLink(card.secondSocials.tiktok)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-teal-500/50 hover:bg-teal-500/10 flex items-center justify-center transition-all group"
                    title="TikTok"
                  >
                    <span className="font-extrabold text-sm text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-pink-500 group-hover:scale-110 transition-transform">TT</span>
                  </a>
                )}

                {card.secondSocials.youtube && (
                  <a
                    href={formatExternalLink(card.secondSocials.youtube)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800/80 hover:border-red-500/50 hover:bg-red-500/10 flex items-center justify-center transition-all group"
                    title="YouTube"
                  >
                    <Youtube className="w-5.5 h-5.5 text-red-500 group-hover:scale-110 transition-transform" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div className="w-full border-t border-zinc-800/50 py-4 px-6 text-center bg-zinc-950/20">
          <p className="text-[10px] text-zinc-500 font-medium">
            R'KEY PROD © {new Date().getFullYear()} · Tous droits réservés
          </p>
          <p className="text-[9px] text-zinc-600 mt-0.5">
            Fiche connectée NFC R'KEY PROD
          </p>
        </div>

      </div>
    </div>
  );
}
