// Catalogue Widget - R'Key Prod
// Script de gestion du catalogue de location de matériel

var BASE_URL = window.location.origin;
var API_URL = BASE_URL + '/api/catalogue/equipements';
var CATEGORIES_URL = BASE_URL + '/api/location/categories/public';

var allEquipment = [];
var allEquipmentMap = {};
var publicCategories = [];
var currentExpandedCard = null;

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
        
        html += '<div id="' + cardId + '" class="equipment-card">';
        
        // Image
        if (item.photo_url) {
            html += '<div class="card-image-container">';
            html += '<img src="' + item.photo_url + '" alt="' + item.name + '" class="card-image" onerror="this.parentElement.outerHTML=\'<div class=card-image-placeholder>' + (item.is_pack ? '📦' : '🎛️') + '</div>\'">';
            html += '</div>';
        } else {
            html += '<div class="card-image-placeholder">' + (item.is_pack ? '📦' : '🎛️') + '</div>';
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
