import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Camera } from 'lucide-react';
import { getImageUrl } from '../location/helpers';

/**
 * ImageSlideshow - Diaporama avec transition automatique (3s) et petites boules discrètes de navigation
 *
 * @param {Array<string>|string} images - Liste des URLs des images ou URL unique
 * @param {string} alt - Texte alternatif de l'image
 * @param {number} interval - Délai en millisecondes entre chaque image (par défaut 3000ms / 3 secondes)
 * @param {boolean} autoPlay - Défilement automatique actif ou non
 * @param {string} className - Classes CSS appliquées au conteneur externe
 * @param {string} imageClassName - Classes CSS appliquées à l'élément <img>
 * @param {boolean} showDots - Afficher les petites boules de navigation en bas
 * @param {boolean} showArrows - Afficher les flèches discrètes précédent/suivant au survol
 * @param {boolean} showCountBadge - Afficher le badge discret "1/3" au survol ou permanent
 * @param {React.ReactNode} fallbackIcon - Icône ou élément affiché si aucune image n'est disponible
 * @param {function} onClick - Événement au clic sur l'image active
 */
export default function ImageSlideshow({
  images,
  alt = "Visuel",
  interval = 3000,
  autoPlay = true,
  className = "w-full h-44",
  imageClassName = "w-full h-full object-cover",
  showDots = true,
  showArrows = true,
  showCountBadge = true,
  fallbackIcon = null,
  onClick = null,
}) {
  // Normaliser la liste des images
  const validImages = useMemo(() => {
    if (!images) return [];
    const list = Array.isArray(images) ? images : [images];
    return list
      .map(img => {
        if (!img) return null;
        if (typeof img === 'string') return img.trim();
        if (typeof img === 'object' && img.url) return img.url.trim();
        if (typeof img === 'object' && img.photo_url) return img.photo_url.trim();
        if (typeof img === 'object' && img.image_url) return img.image_url.trim();
        return null;
      })
      .filter(Boolean)
      .map(url => getImageUrl(url) || url);
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasError, setHasError] = useState({});
  const timerRef = useRef(null);

  const total = validImages.length;

  // Réinitialiser l'index si la liste d'images change et que l'index actuel dépasse
  useEffect(() => {
    if (currentIndex >= total) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  // Gestion du défilement automatique toutes les 3 secondes
  useEffect(() => {
    if (!autoPlay || total <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % total);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, total, interval, isHovered]);

  const goToIndex = (index) => {
    setCurrentIndex(index);
  };

  const handlePrev = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex(prev => (prev === 0 ? total - 1 : prev - 1));
  };

  const handleNext = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex(prev => (prev + 1) % total);
  };

  // Cas : aucune image valide
  if (total === 0) {
    return (
      <div 
        className={`relative flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg overflow-hidden select-none ${className}`}
        onClick={onClick}
      >
        {fallbackIcon ? (
          <div className="text-3xl">{fallbackIcon}</div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ImageIcon className="w-8 h-8 opacity-40 text-slate-400" />
            <span className="text-[10px] text-slate-400">Aucune photo</span>
          </div>
        )}
      </div>
    );
  }

  const currentImg = validImages[currentIndex];

  return (
    <div
      className={`relative group overflow-hidden select-none rounded-lg bg-slate-900/5 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image active avec transition fluide */}
      <div 
        className="w-full h-full relative cursor-pointer"
        onClick={onClick}
      >
        {hasError[currentIndex] ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 text-center">
            <ImageIcon className="w-6 h-6 opacity-40 mb-1" />
            <span className="text-[11px]">Image non disponible</span>
          </div>
        ) : (
          <img
            key={currentImg}
            src={currentImg}
            alt={`${alt} - vue ${currentIndex + 1}/${total}`}
            className={`${imageClassName} transition-opacity duration-300`}
            onError={() => setHasError(prev => ({ ...prev, [currentIndex]: true }))}
          />
        )}
      </div>

      {/* Badge discret du nombre de photos (visible si plus d'une photo) */}
      {total > 1 && showCountBadge && (
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium backdrop-blur-xs flex items-center gap-1 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
          <Camera className="w-3 h-3" />
          <span>{currentIndex + 1}/{total}</span>
        </div>
      )}

      {/* Flèches discrètes de navigation au survol */}
      {total > 1 && showArrows && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Image précédente"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm backdrop-blur-xs focus:outline-none"
          >
            <ChevronLeft className="w-4 h-4 -ml-0.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Image suivante"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm backdrop-blur-xs focus:outline-none"
          >
            <ChevronRight className="w-4 h-4 -mr-0.5" />
          </button>
        </>
      )}

      {/* Petites boules de navigation en bas (très discrètes et cliquables) */}
      {total > 1 && showDots && (
        <div 
          className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-auto px-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-xs">
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToIndex(idx);
                }}
                className={`transition-all duration-300 rounded-full focus:outline-none ${
                  idx === currentIndex
                    ? 'w-2.5 h-2.5 bg-white shadow ring-1 ring-white/90 scale-110'
                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/95'
                }`}
                aria-label={`Aller à la photo ${idx + 1}`}
                title={`Photo ${idx + 1} sur ${total}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
