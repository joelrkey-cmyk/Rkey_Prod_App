// Catalogue Widget - R'Key Prod
// Script de gestion du catalogue de location de matériel

var parsedUrl = new URL(document.currentScript ? document.currentScript.src : window.location.href);
var BASE_URL = parsedUrl.protocol + '//' + parsedUrl.host;
var API_URL = BASE_URL + '/api/catalogue/equipements';
var CATEGORIES_URL = BASE_URL + '/api/location/categories/public';

var allEquipment = [];
var allEquipmentMap = {};
var publicCategories = [];
var currentExpandedCard = null;

// --- Diaporama / Slideshow state & controller ---
var activeSlideshows = {};

function clearAllSlideshows() {
    Object.keys(activeSlideshows).forEach(function(id) {
        if (activeSlideshows[id] && activeSlideshows[id].timer) {
            clearInterval(activeSlideshows[id].timer);
        }
    });
    activeSlideshows = {};
}

function getItemPhotos(item) {
    if (!item) return [];
    var rawList = [];
    if (Array.isArray(item.photos) && item.photos.length > 0) {
        rawList = item.photos;
    } else if (item.photo_url) {
        rawList = [item.photo_url];
    }
    return rawList.map(function(url) {
        if (!url) return '';
        url = String(url).trim();
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        return BASE_URL + (url.startsWith('/') ? '' : '/') + url;
    }).filter(Boolean);
}

function initSlideshows(equipmentList) {
    clearAllSlideshows();
    if (!Array.isArray(equipmentList)) return;
    equipmentList.forEach(function(item) {
        var photos = getItemPhotos(item);
        if (photos.length > 1) {
            activeSlideshows[item.id] = {
                currentIndex: 0,
                total: photos.length,
                timer: null,
                isHovered: false
            };
            startSlideshowTimer(item.id);
        }
    });
}

function startSlideshowTimer(itemId) {
    var state = activeSlideshows[itemId];
    if (!state || state.total <= 1) return;
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function() {
        if (!state.isHovered) {
            goToSlide(itemId, (state.currentIndex + 1) % state.total);
        }
    }, 3000);
}

function pauseSlideshow(itemId) {
    var state = activeSlideshows[itemId];
    if (state) state.isHovered = true;
}

function resumeSlideshow(itemId) {
    var state = activeSlideshows[itemId];
    if (state) state.isHovered = false;
}

function goToSlide(itemId, nextIndex, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var state = activeSlideshows[itemId];
    if (!state) return;
    
    var container = document.getElementById('slideshow-' + itemId);
    if (!container) return;
    
    state.currentIndex = (nextIndex + state.total) % state.total;
    
    // Mettre à jour les slides avec fondu
    var slides = container.querySelectorAll('.slideshow-slide');
    slides.forEach(function(slide, idx) {
        if (idx === state.currentIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    // Mettre à jour les petites boules
    var dots = container.querySelectorAll('.slideshow-dot');
    dots.forEach(function(dot, idx) {
        if (idx === state.currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Mettre à jour le badge discret
    var badge = document.getElementById('badge-' + itemId);
    if (badge) {
        var badgeText = badge.querySelector('.badge-text');
        if (badgeText) badgeText.textContent = (state.currentIndex + 1) + '/' + state.total;
    }
    
    // Réinitialiser le cycle du timer
    startSlideshowTimer(itemId);
}

function nextSlide(itemId, event) {
    var state = activeSlideshows[itemId];
    if (!state) return;
    goToSlide(itemId, state.currentIndex + 1, event);
}

function prevSlide(itemId, event) {
    var state = activeSlideshows[itemId];
    if (!state) return;
    goToSlide(itemId, state.currentIndex - 1, event);
}

function handleImageError(img) {
    var slide = img.closest('.slideshow-slide');
    if (slide) {
        slide.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#9ca3af;font-size:12px;">Image non disponible</div>';
    }
}

// --- Robust resize logic ---
var _lastSentHeight = 0;
var _resizeTimer = null;
var _firstResizeDone = false;

function sendHeightToParent() {
    if (window.parent === window) return;
    var container = document.querySelector('.widget-container');
    if (!container) return;

    function send() {
        var rect = container.getBoundingClientRect();
        var h = rect.height > 0 ? Math.ceil(rect.height) + 2 : document.body.scrollHeight;
        if (h < 50) return;
        if (Math.abs(h - _lastSentHeight) < 3 && _firstResizeDone) return;
        _lastSentHeight = h;
        _firstResizeDone = true;
        window.parent.postMessage({ type: 'rkey-widget-resize', height: h }, '*');
    }

    if (!_firstResizeDone) {
        send();
    } else {
        if (_resizeTimer) clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(function() {
            _resizeTimer = null;
            send();
        }, 80);
    }
}

// ResizeObserver on widget container
if (typeof ResizeObserver !== 'undefined') {
    var _wc = document.querySelector('.widget-container');
    if (_wc) new ResizeObserver(sendHeightToParent).observe(_wc);
}

// Aggressive initial checks (images, fonts, late layout)
requestAnimationFrame(function() {
    sendHeightToParent();
    requestAnimationFrame(sendHeightToParent);
});
var _checkCount = 0;
var _checkInterval = setInterval(function() {
    sendHeightToParent();
    if (++_checkCount >= 20) clearInterval(_checkInterval);
}, 250);

async function loadCategories() {
    try {
        var response = await fetch(CATEGORIES_URL);
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des catégories');
        }
        var data = await response.json();
        publicCategories = data.categories || [];
        renderFilterButtons();
    } catch (error) {
        console.error('Erreur catégories:', error);
        publicCategories = [];
        renderFilterButtons();
    }
}

function renderFilterButtons() {
    var filterBar = document.getElementById('filter-bar');
    var html = '<button class="filter-btn active" data-filter="all" onclick="toggleFilter(\'all\', this)">Tout</button>';
    
    html += '<button class="filter-btn" data-filter="pack" onclick="toggleFilter(\'pack\', this)">📦 Packs</button>';
    
    publicCategories.forEach(function(cat) {
        if (cat.name.toLowerCase() === 'packs') return;
        
        var icon = cat.icon || '📁';
        html += '<button class="filter-btn" data-filter="' + cat.name + '" onclick="toggleFilter(\'' + cat.name + '\', this)">';
        html += icon + ' ' + cat.name;
        html += '</button>';
    });
    
    filterBar.innerHTML = html;
}

async function loadEquipment() {
    try {
        await loadCategories();
        
        var response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Erreur lors du chargement');
        }
        
        allEquipment = await response.json();
        
        allEquipment.forEach(function(eq) {
            allEquipmentMap[eq.id] = eq;
        });
        
        renderEquipment(allEquipment);
        setTimeout(sendHeightToParent, 100);
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('equipment-container').innerHTML = 
            '<div class="error">' +
                '❌ Impossible de charger le catalogue.<br>' +
                'Veuillez réessayer plus tard.' +
            '</div>';
        setTimeout(sendHeightToParent, 100);
    }
}

function renderEquipment(equipment) {
    var container = document.getElementById('equipment-container');
    currentExpandedCard = null;
    clearAllSlideshows();
    
    if (equipment.length === 0) {
        container.innerHTML = 
            '<div class="no-equipment">' +
                '📦 Aucun équipement disponible dans cette catégorie.' +
            '</div>';
        setTimeout(sendHeightToParent, 100);
        return;
    }
    
    var html = '<div class="equipment-grid">';
    
    equipment.forEach(function(item) {
        var cardId = 'card-' + item.id;
        var displayDescription = item.catalogue_description || item.description || '';
        var photos = getItemPhotos(item);
        
        html += '<div id="' + cardId + '" class="equipment-card">';
        
        // Section Photos / Diaporama
        if (photos.length === 0) {
            html += '<div class="card-image-placeholder">' + (item.is_pack ? '📦' : '🎛️') + '</div>';
        } else if (photos.length === 1) {
            html += '<div class="card-image-container">';
            html += '<img src="' + photos[0] + '" alt="' + item.name + '" class="card-image" onerror="this.parentElement.outerHTML=\'<div class=card-image-placeholder>' + (item.is_pack ? '📦' : '🎛️') + '</div>\'">';
            html += '</div>';
        } else {
            // Diaporama avec défilement automatique (3s), flèches discrètes et petites boules de navigation
            html += '<div class="card-image-container" id="slideshow-' + item.id + '" onmouseenter="pauseSlideshow(\'' + item.id + '\')" onmouseleave="resumeSlideshow(\'' + item.id + '\')">';
            
            // Slides superposées avec fondu fluide
            photos.forEach(function(pUrl, pIdx) {
                var activeClass = pIdx === 0 ? ' active' : '';
                html += '<div class="slideshow-slide' + activeClass + '" data-slide-index="' + pIdx + '">';
                html += '<img src="' + pUrl + '" alt="' + item.name + ' - photo ' + (pIdx + 1) + '" class="card-image" onerror="handleImageError(this)">';
                html += '</div>';
            });
            
            // Flèches discrètes précédent / suivant au survol
            html += '<button type="button" class="slideshow-arrow prev" onclick="prevSlide(\'' + item.id + '\', event)" aria-label="Photo précédente" title="Photo précédente">';
            html += '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
            html += '</button>';
            html += '<button type="button" class="slideshow-arrow next" onclick="nextSlide(\'' + item.id + '\', event)" aria-label="Photo suivante" title="Photo suivante">';
            html += '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';
            html += '</button>';
            
            // Petites boules discrètes de navigation en bas
            html += '<div class="slideshow-dots" onclick="event.stopPropagation()">';
            photos.forEach(function(_, pIdx) {
                var activeDot = pIdx === 0 ? ' active' : '';
                html += '<button type="button" class="slideshow-dot' + activeDot + '" onclick="goToSlide(\'' + item.id + '\', ' + pIdx + ', event)" title="Photo ' + (pIdx + 1) + '/' + photos.length + '" aria-label="Photo ' + (pIdx + 1) + '"></button>';
            });
            html += '</div>';
            
            // Badge discret 1/N
            html += '<div class="slideshow-badge" id="badge-' + item.id + '">';
            html += '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';
            html += '<span class="badge-text">1/' + photos.length + '</span>';
            html += '</div>';
            
            html += '</div>';
        }
        
        html += '<div class="card-content">';
        html += '<span class="card-category">' + item.category + '</span>';
        if (item.is_pack) {
            html += '<span class="card-badge-pack">📦 Pack</span>';
        }
        html += '<div class="card-header">';
        html += '<h3 class="card-title">' + item.name + '</h3>';
        html += '<span class="card-price">' + item.daily_price + '€/j</span>';
        if (item.youtube_url) {
            html += '<a href="' + item.youtube_url + '" target="_blank" rel="noopener noreferrer" class="youtube-btn" title="Voir la vidéo" onclick="event.stopPropagation()">';
            html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>';
            html += '</a>';
        }
        html += '</div>';
        
        // Preview description
        if (displayDescription) {
            html += '<p class="card-description-preview">' + displayDescription + '</p>';
        }
        
        // Voir plus button
        html += '<button class="voir-plus-btn" onclick="toggleCard(\'' + item.id + '\')">';
        html += 'Voir plus <span class="arrow">▼</span>';
        html += '</button>';
        
        html += '</div>'; // end card-content
        
        // Expandable content
        html += '<div class="card-expanded-content">';
        
        // Full description
        if (displayDescription) {
            html += '<div class="expanded-section">';
            html += '<div class="expanded-section-title">📝 Description</div>';
            html += '<p class="expanded-description">' + displayDescription + '</p>';
            html += '</div>';
        }
        
        // Pack contents
        if (item.is_pack && item.pack_items && item.pack_items.length > 0) {
            html += '<div class="expanded-section">';
            html += '<div class="expanded-section-title">📦 Contenu du pack</div>';
            html += '<ul class="expanded-pack-list">';
            item.pack_items.forEach(function(packItem) {
                var equipName = packItem.name || 
                    (allEquipmentMap[packItem.equipment_id] ? allEquipmentMap[packItem.equipment_id].name : packItem.equipment_id);
                html += '<li>• ' + packItem.quantity + 'x ' + equipName + '</li>';
            });
            html += '</ul>';
            html += '</div>';
        }
        
        // YouTube link in expanded
        if (item.youtube_url) {
            html += '<div class="expanded-section">';
            html += '<a href="' + item.youtube_url + '" target="_blank" rel="noopener noreferrer" class="youtube-link-expanded">';
            html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>';
            html += 'Voir la vidéo';
            html += '</a>';
            html += '</div>';
        }
        
        html += '</div>'; // end expanded content
        html += '</div>'; // end card
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Initialiser les diaporamas automatiques pour les produits multi-photos
    initSlideshows(equipment);
    
    setTimeout(sendHeightToParent, 100);
}

function toggleCard(itemId) {
    var cardElement = document.getElementById('card-' + itemId);
    
    // Close previously expanded card if different
    if (currentExpandedCard && currentExpandedCard !== cardElement) {
        currentExpandedCard.classList.remove('expanded');
    }
    
    // Toggle current card
    cardElement.classList.toggle('expanded');
    
    // Update current expanded card reference
    if (cardElement.classList.contains('expanded')) {
        currentExpandedCard = cardElement;
    } else {
        currentExpandedCard = null;
    }
    
    // Update height after animation
    setTimeout(sendHeightToParent, 450);
}

function toggleFilter(filter, button) {
    var buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(function(btn) { 
        btn.classList.remove('active'); 
    });
    
    button.classList.add('active');
    
    if (filter === 'all') {
        renderEquipment(allEquipment);
    } else {
        var filtered = allEquipment.filter(function(item) {
            if (filter === 'pack') {
                return item.is_pack === true;
            }
            if (filter === 'Lumière') {
                return (item.category === 'Lumière' || item.category === 'Éclairage');
            }
            if (filter === 'Structure et pieds') {
                return (item.category === 'Structure et pieds' || item.category === 'Structure Truss');
            }
            return item.category === filter;
        });
        renderEquipment(filtered);
    }
}

// Load equipment on page load
loadEquipment();
