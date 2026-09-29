import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail, Globe, MapPin, UserPlus, ExternalLink, Linkedin, Instagram, Youtube, Facebook, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import MyDjLogo from '../MyDjLogo';
import { downloadVCard } from './vcardHelper';

export default function PublicNfcCard() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#e86405]" />
        <p className="mt-4 text-sm text-gray-400 font-medium">Chargement du profil R'KEY PROD...</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-white text-center">
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

  const whatsappUrl = getWhatsAppLink(card.phone);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex justify-center items-start overflow-y-auto px-4 py-8">
      {/* Dynamic Glowing Accents */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-screen pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-b from-orange-600/10 via-[#e86405]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[40%] bg-gradient-to-t from-orange-600/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-[#111827]/90 backdrop-blur-xl border border-gray-800/60 rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col items-center">
        
        {/* Banner with R'KEY branding */}
        <div className="w-full h-32 bg-gradient-to-r from-[#e86405] to-[#FF7A00] relative flex items-center justify-center">
          <div className="absolute inset-0 bg-black/10" />
          <span className="text-white/25 font-black tracking-widest text-3xl select-none">R'KEY PROD</span>
        </div>

        {/* Profile Circle */}
        <div className="relative -mt-16 mb-4 flex justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-[#111827] bg-[#1F2937] shadow-xl overflow-hidden flex items-center justify-center">
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

        {/* Card Metadata (Unboxed, pure text separators) */}
        <div className="text-center px-6 w-full">
          <h1 className="text-2xl font-black tracking-tight text-white mb-1">
            {card.firstName} {card.lastName}
          </h1>
          <p className="text-[#e86405] text-sm font-semibold uppercase tracking-wider mb-2">
            {card.role || "R'KEY PROD TEAM"}
          </p>
          <div className="text-gray-400 text-xs font-medium flex items-center gap-1.5 justify-center">
            <span className="font-semibold text-gray-300">R'KEY PROD</span>
            {card.location && (
              <>
                <span aria-hidden="true" className="text-gray-600">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {card.location}
                </span>
              </>
            )}
          </div>

          {card.bio && (
            <p className="mt-4 text-sm text-gray-300 bg-gray-950/40 border border-gray-800/40 py-3.5 px-4 rounded-2xl italic leading-relaxed text-left">
              {card.bio}
            </p>
          )}
        </div>

        {/* Direct Action (CTA) */}
        <div className="w-full px-6 mt-6">
          <button
            onClick={() => downloadVCard(card)}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#e86405] to-[#FF7A00] hover:from-[#d15400] hover:to-[#e86405] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#e86405]/15 active:scale-[0.98] transition-all cursor-pointer"
          >
            <UserPlus className="w-5.5 h-5.5" />
            Ajouter aux contacts
          </button>
          
          <p className="text-center text-[10px] text-gray-500 mt-2">
            Incompatible ? <a href={`/api/public/nfc-cards/vcard/${card.id || card._id}`} className="text-gray-400 underline hover:text-[#e86405]">Téléchargement Direct</a>
          </p>
        </div>

        {/* Action Grid (Touch-First layout) */}
        <div className="w-full px-6 mt-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-left mb-3">Accès Rapide</h3>
          <div className="grid grid-cols-2 gap-3">
            {card.phone && (
              <a
                href={`tel:${card.phone}`}
                className="flex items-center gap-3 p-3.5 bg-gray-900/50 border border-gray-800/60 hover:border-[#e86405]/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all"
              >
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[11px] text-gray-500 font-medium">Appeler</span>
                  <span className="block text-xs font-semibold truncate text-gray-200">{card.phone}</span>
                </div>
              </a>
            )}

            {card.phone && whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-gray-900/50 border border-gray-800/60 hover:border-[#e86405]/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all"
              >
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[11px] text-gray-500 font-medium">WhatsApp</span>
                  <span className="block text-xs font-semibold truncate text-gray-200">Message</span>
                </div>
              </a>
            )}

            {card.email && (
              <a
                href={`mailto:${card.email}`}
                className="flex items-center gap-3 p-3.5 bg-gray-900/50 border border-gray-800/60 hover:border-[#e86405]/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all col-span-2 md:col-span-1"
              >
                <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <span className="block text-[11px] text-gray-500 font-medium">Email</span>
                  <span className="block text-xs font-semibold truncate text-gray-200">{card.email}</span>
                </div>
              </a>
            )}

            {card.website && (
              <a
                href={card.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-gray-900/50 border border-gray-800/60 hover:border-[#e86405]/40 hover:bg-[#1f2937]/30 rounded-2xl transition-all col-span-2 md:col-span-1"
              >
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <span className="block text-[11px] text-gray-500 font-medium">Site Web</span>
                  <span className="block text-xs font-semibold truncate text-gray-200">{card.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Socials Block (No pills, quiet borders, premium unboxed headers) */}
        {card.socials && Object.values(card.socials).some(Boolean) && (
          <div className="w-full px-6 mt-6 mb-8 text-left">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Réseaux Sociaux</h3>
            <div className="flex flex-col gap-2">
              {card.socials.linkedin && (
                <a
                  href={card.socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-gray-900/40 border border-gray-800/40 rounded-2xl hover:border-blue-500/30 hover:bg-[#1f2937]/20 transition-all text-sm group"
                >
                  <span className="flex items-center gap-2.5 text-gray-300 font-semibold group-hover:text-white">
                    <Linkedin className="w-4.5 h-4.5 text-blue-400" /> LinkedIn
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                </a>
              )}

              {card.socials.instagram && (
                <a
                  href={card.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-gray-900/40 border border-gray-800/40 rounded-2xl hover:border-pink-500/30 hover:bg-[#1f2937]/20 transition-all text-sm group"
                >
                  <span className="flex items-center gap-2.5 text-gray-300 font-semibold group-hover:text-white">
                    <Instagram className="w-4.5 h-4.5 text-pink-400" /> Instagram
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                </a>
              )}

              {card.socials.youtube && (
                <a
                  href={card.socials.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-gray-900/40 border border-gray-800/40 rounded-2xl hover:border-red-500/30 hover:bg-[#1f2937]/20 transition-all text-sm group"
                >
                  <span className="flex items-center gap-2.5 text-gray-300 font-semibold group-hover:text-white">
                    <Youtube className="w-4.5 h-4.5 text-red-500" /> YouTube
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                </a>
              )}

              {card.socials.facebook && (
                <a
                  href={card.socials.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-gray-900/40 border border-gray-800/40 rounded-2xl hover:border-blue-600/30 hover:bg-[#1f2937]/20 transition-all text-sm group"
                >
                  <span className="flex items-center gap-2.5 text-gray-300 font-semibold group-hover:text-white">
                    <Facebook className="w-4.5 h-4.5 text-blue-500" /> Facebook
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                </a>
              )}

              {card.socials.tiktok && (
                <a
                  href={card.socials.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-gray-900/40 border border-gray-800/40 rounded-2xl hover:border-gray-500/30 hover:bg-[#1f2937]/20 transition-all text-sm group"
                >
                  <span className="flex items-center gap-2.5 text-gray-300 font-semibold group-hover:text-white">
                    <span className="font-bold text-teal-400">T</span>
                    <span className="font-bold text-pink-400">T</span> TikTok
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="w-full border-t border-gray-800/50 py-4 px-6 text-center bg-gray-950/20">
          <p className="text-[10px] text-gray-500 font-medium">
            R'KEY PROD © {new Date().getFullYear()} · Tous droits réservés
          </p>
          <p className="text-[9px] text-gray-600 mt-0.5">
            Fiche connectée NFC R'KEY PROD
          </p>
        </div>

      </div>
    </div>
  );
}
