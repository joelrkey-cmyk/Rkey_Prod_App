// Catalogue Widget - R'Key Prod
// Script de gestion du catalogue de location de matériel (Format Petites Icônes avec Modal de Détails)

var parsedUrl = new URL(document.currentScript ? document.currentScript.src : window.location.href);
var BASE_URL = parsedUrl.protocol + '//' + parsedUrl.host;
var API_URL = BASE_URL + '/api/catalogue/equipements';
var CATEGORIES_URL = BASE_URL + '/api/location/categories/public';

var allEquipment = [];
var allEquipmentMap = {};
var publicCategories = [];
var activeFilter = 'all';

// --- Carousel / Slideshow state inside the details modal ---
var modalSlideshowState = {
    currentIndex: 0,
    photos: [],
    timer: null
};

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

// --- Robust resize logic for iframe auto-height ---
var _lastSentHeight = 0;
var _resizeTimer = null;
var _firstResizeDone = false;

function sendHeightToParent() {
    if (window.parent === window) return;
    var container = document.querySelector('.widget-container');
    if (!container) return;

    function send() {
        var rect = container.getBoundingClientRect();
        var h = rect.height > 0 ? Math.ceil(rect.height) + 20 : document.body.scrollHeight;
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
    var html = '<button class="filter-btn active" data-filter="all" onclick="toggleFilter(\'all\', this)"><span>Tout</span></button>';
    
    html += '<button class="filter-btn" data-filter="pack" onclick="toggleFilter(\'pack\', this)"><span class="filter-icon">📦</span><span>Packs</span></button>';
    
    publicCategories.forEach(function(cat) {
        if (cat.name.toLowerCase() === 'packs') return;
        
        var icon = cat.icon || '📁';
        html += '<button class="filter-btn" data-filter="' + cat.name + '" onclick="toggleFilter(\'' + cat.name + '\', this)">';
        html += '<span class="filter-icon">' + icon + '</span><span>' + cat.name + '</span>';
        html += '</button>';
    });
    
    filterBar.innerHTML = html;
}

async function loadEquipment() {
    try {
        await loadCategories();
        
        var response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Erreur lors du chargement du catalogue');
        }
        
        allEquipment = await response.json();
        
        allEquipment.forEach(function(eq) {
            allEquipmentMap[eq.id] = eq;
        });
        
        renderEquipment(allEquipment);
        setTimeout(sendHeightToParent, 120);
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('equipment-container').innerHTML = 
            '<div class="error">' +
                '❌ Impossible de charger le catalogue.<br>' +
                'Veuillez réessayer plus tard.' +
            '</div>';
        setTimeout(sendHeightToParent, 120);
    }
}

function renderEquipment(equipment) {
    var container = document.getElementById('equipment-container');
    
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
        var photos = getItemPhotos(item);
        var primaryPhoto = photos[0];
        
        html += '<div class="equipment-card" onclick="openDetailsModal(\'' + item.id + '\')">';
        
        // Image Thumbnail
        html += '<div class="card-thumbnail-container">';
        if (primaryPhoto) {
            html += '<img src="' + primaryPhoto + '" alt="' + (item.name || '').replace(/"/g, '&quot;') + '" class="card-thumbnail" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">';
            html += '<div class="card-thumbnail-placeholder" style="display:none;">' + (item.is_pack ? '📦' : '🎛️') + '</div>';
        } else {
            html += '<div class="card-thumbnail-placeholder">' + (item.is_pack ? '📦' : '🎛️') + '</div>';
        }
        
        // Pack Badge
        if (item.is_pack) {
            html += '<div class="pack-badge">Pack</div>';
        }
        
        // Photos Counter Badge
        if (photos.length > 1) {
            html += '<div class="photo-count-badge">📷 ' + photos.length + '</div>';
        }
        html += '</div>'; // end thumbnail container
        
        // Card details
        html += '<div class="card-info">';
        html += '<h4 class="card-title" title="' + item.name + '">' + item.name + '</h4>';
        
        html += '<div class="card-meta-row">';
        html += '<span class="card-price">' + item.daily_price + '€/j</span>';
        html += '</div>';
        
        html += '<div class="card-action-indicator">Voir le détail →</div>';
        
        html += '</div>'; // end card-info
        html += '</div>'; // end equipment-card
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    setTimeout(sendHeightToParent, 100);
}

function toggleFilter(filter, button) {
    activeFilter = filter;
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

// --- Details Modal Actions ---

function openDetailsModal(itemId) {
    var item = allEquipmentMap[itemId];
    if (!item) return;
    
    var modal = document.getElementById('details-modal');
    
    // Set headers, name, prices, guarantee
    document.getElementById('modal-title').textContent = item.name;
    document.getElementById('modal-price').innerHTML = (item.daily_price || 0) + '€<span> / jour</span>';
    
    var guaranteeText = item.guarantee ? 'Caution : ' + item.guarantee + '€' : '';
    document.getElementById('modal-guarantee').textContent = guaranteeText;
    
    // Build badges
    var badgesHtml = '';
    if (item.is_pack) {
        badgesHtml += '<span class="modal-badge modal-badge-pack">📦 Pack Matériel</span>';
    }
    if (item.category) {
        badgesHtml += '<span class="modal-badge modal-badge-category">' + item.category + '</span>';
    }
    badgesHtml += '<span class="modal-badge modal-badge-published"><span class="modal-badge-dot"></span>Publié sur le catalogue</span>';
    document.getElementById('modal-badges').innerHTML = badgesHtml;
    
    // Build body content
    var bodyHtml = '';
    var photos = getItemPhotos(item);
    
    // 1. Slideshow / Image container
    if (photos.length > 0) {
        bodyHtml += '<div class="modal-slideshow-container" id="modal-slideshow">';
        
        photos.forEach(function(pUrl, idx) {
            var activeClass = idx === 0 ? ' active' : '';
            bodyHtml += '<div class="modal-slide' + activeClass + '" data-slide-index="' + idx + '">';
            bodyHtml += '<img src="' + pUrl + '" alt="' + item.name + ' - Photo ' + (idx + 1) + '" onerror="this.outerHTML=\'<div class=card-thumbnail-placeholder>🎛️</div>\'">';
            bodyHtml += '</div>';
        });
        
        // Slideshow controls if multiple photos
        if (photos.length > 1) {
            bodyHtml += '<button type="button" class="modal-arrow prev" onclick="prevModalSlide(event)">';
            bodyHtml += '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
            bodyHtml += '</button>';
            bodyHtml += '<button type="button" class="modal-arrow next" onclick="nextModalSlide(event)">';
            bodyHtml += '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';
            bodyHtml += '</button>';
            
            bodyHtml += '<div class="modal-dots">';
            photos.forEach(function(_, idx) {
                var activeDot = idx === 0 ? ' active' : '';
                bodyHtml += '<button type="button" class="modal-dot' + activeDot + '" onclick="goToModalSlide(' + idx + ', event)"></button>';
            });
            bodyHtml += '</div>';
            
            bodyHtml += '<div class="modal-count-badge" id="modal-slideshow-count">1/' + photos.length + '</div>';
        }
        
        bodyHtml += '</div>';
    } else {
        bodyHtml += '<div style="height:120px; border: 1px dashed #e2e8f0; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:12px; margin-bottom:20px;">';
        bodyHtml += '<span>Aucune photo disponible</span>';
        bodyHtml += '</div>';
    }
    
    // 2. Description
    var displayDescription = item.observations || item.catalogue_description || item.description || '';
    bodyHtml += '<div class="modal-section">';
    bodyHtml += '<div class="modal-section-title">📝 Descriptif &amp; Caractéristiques</div>';
    if (displayDescription) {
        bodyHtml += '<div class="modal-section-content">' + displayDescription + '</div>';
    } else {
        bodyHtml += '<div class="modal-section-content" style="font-style:italic; color:#94a3b8;">Aucune description détaillée disponible pour cet équipement.</div>';
    }
    
    // YouTube link
    if (item.youtube_url) {
        bodyHtml += '<a href="' + item.youtube_url + '" target="_blank" rel="noopener noreferrer" class="modal-youtube-link">';
        bodyHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>';
        bodyHtml += 'Voir la vidéo de présentation';
        bodyHtml += '</a>';
    }
    bodyHtml += '</div>';
    
    // 3. Pack content
    if (item.is_pack && Array.isArray(item.pack_items) && item.pack_items.length > 0) {
        bodyHtml += '<div class="modal-pack-box">';
        bodyHtml += '<div class="modal-pack-title">📦 Matériel inclus dans ce pack</div>';
        bodyHtml += '<div class="modal-pack-grid">';
        
        item.pack_items.forEach(function(pi) {
            var piName = pi.name || pi.equipment_name || 'Équipement';
            bodyHtml += '<div class="modal-pack-item" title="' + piName + '">';
            bodyHtml += '<div class="modal-pack-qty">' + (pi.quantity || 1) + '×</div>';
            bodyHtml += '<div class="modal-pack-item-name">' + piName + '</div>';
            bodyHtml += '</div>';
        });
        
        bodyHtml += '</div>'; // end grid
        bodyHtml += '</div>'; // end pack-box
    }
    
    document.getElementById('modal-body-content').innerHTML = bodyHtml;
    
    // Reset and initialize slideshow state for this modal
    modalSlideshowState.currentIndex = 0;
    modalSlideshowState.photos = photos;
    if (modalSlideshowState.timer) clearInterval(modalSlideshowState.timer);
    
    // Auto-advance modal slideshow if multiple photos
    if (photos.length > 1) {
        startModalSlideshowTimer();
    }
    
    var modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.scrollTop = 0;
    modal.scrollTop = 0;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Ensure modal appears directly in view on mobile
    if (window.innerWidth <= 640) {
      try {
        modal.scrollIntoView({ behavior: 'auto', block: 'start' });
      } catch(e) {}
    }
}

function closeDetailsModal() {
    var modal = document.getElementById('details-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    
    if (modalSlideshowState.timer) {
        clearInterval(modalSlideshowState.timer);
        modalSlideshowState.timer = null;
    }
}

function closeModalOnBackdrop(event) {
    if (event.target.id === 'details-modal') {
        closeDetailsModal();
    }
}

// --- Modal Slideshow controller ---

function startModalSlideshowTimer() {
    if (modalSlideshowState.timer) clearInterval(modalSlideshowState.timer);
    modalSlideshowState.timer = setInterval(function() {
        nextModalSlide();
    }, 3500);
}

function goToModalSlide(nextIndex, event) {
    if (event) {
        event.stopPropagation();
    }
    var total = modalSlideshowState.photos.length;
    if (total <= 1) return;
    
    modalSlideshowState.currentIndex = (nextIndex + total) % total;
    
    var container = document.getElementById('modal-slideshow');
    if (!container) return;
    
    // Update slides
    var slides = container.querySelectorAll('.modal-slide');
    slides.forEach(function(slide, idx) {
        if (idx === modalSlideshowState.currentIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    // Update dots
    var dots = container.querySelectorAll('.modal-dot');
    dots.forEach(function(dot, idx) {
        if (idx === modalSlideshowState.currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Update counter badge
    var countBadge = document.getElementById('modal-slideshow-count');
    if (countBadge) {
        countBadge.textContent = (modalSlideshowState.currentIndex + 1) + '/' + total;
    }
    
    // Restart timer
    startModalSlideshowTimer();
}

function nextModalSlide(event) {
    var total = modalSlideshowState.photos.length;
    if (total <= 1) return;
    goToModalSlide(modalSlideshowState.currentIndex + 1, event);
}

function prevModalSlide(event) {
    var total = modalSlideshowState.photos.length;
    if (total <= 1) return;
    goToModalSlide(modalSlideshowState.currentIndex - 1, event);
}

// Load equipment on page load
loadEquipment();
