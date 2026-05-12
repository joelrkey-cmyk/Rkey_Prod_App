/**
 * R'Key Prod - Widget Integration Script
 * Script d'intégration pour sites externes (Billetterie, Profil DJ, etc.)
 * Les widgets sont servis directement par le backend pour garantir leur disponibilité
 */
(function() {
    'use strict';
    
    var WIDGET_CLASS = 'rkey-widget-integration';
    
    function createWidget(element) {
        // Utiliser le href de l'élément pour charger le bon widget
        var widgetUrl = element.getAttribute('href');
        
        if (!widgetUrl) {
            console.error('R\'Key Widget: href manquant sur l\'élément');
            return;
        }
        
        var container = document.createElement('div');
        container.style.cssText = 'width:100%;max-width:100%;overflow:hidden;position:relative;';
        container.className = 'rkey-widget-container';
        
        var iframe = document.createElement('iframe');
        iframe.src = widgetUrl;
        iframe.style.cssText = 'width:100%;border:none;overflow:hidden;display:block;';
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowtransparency', 'true');
        
        var height = element.getAttribute('data-height') || '450';
        iframe.style.height = height + 'px';
        
        var width = element.getAttribute('data-width') || '100%';
        container.style.width = width;
        
        if (element.getAttribute('data-resize') === '1') {
            var resizeTimer = null;
            var lastAppliedHeight = 0;
            var firstResizeApplied = false;
            window.addEventListener('message', function(event) {
                // CRITICAL: Only handle messages from OUR iframe
                if (!iframe.contentWindow || event.source !== iframe.contentWindow) return;
                
                if (event.data && event.data.type === 'rkey-widget-resize') {
                    var newHeight = event.data.height;
                    if (newHeight < 50) return;
                    // Anti-oscillation: ignore tiny changes after first resize
                    if (firstResizeApplied && Math.abs(newHeight - lastAppliedHeight) < 5) return;
                    
                    if (!firstResizeApplied) {
                        // FIRST resize: apply immediately
                        firstResizeApplied = true;
                        lastAppliedHeight = newHeight;
                        iframe.style.height = newHeight + 'px';
                        container.style.height = newHeight + 'px';
                    } else {
                        // Subsequent: debounce
                        if (resizeTimer) clearTimeout(resizeTimer);
                        resizeTimer = setTimeout(function() {
                            resizeTimer = null;
                            lastAppliedHeight = newHeight;
                            iframe.style.height = newHeight + 'px';
                            container.style.height = newHeight + 'px';
                        }, 100);
                    }
                }
                
                // Handle modal open - scroll to top of widget
                if (event.data && event.data.type === 'rkey-widget-modal-open') {
                    scrollToWidget(container);
                }
            });
        }
        
        container.appendChild(iframe);
        element.parentNode.replaceChild(container, element);
    }
    
    function scrollToWidget(container) {
        // Get the widget's position relative to the viewport
        var rect = container.getBoundingClientRect();
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calculate target position (widget top with some padding)
        var targetPosition = rect.top + scrollTop - 20;
        
        // Smooth scroll to widget
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
    
    function init() {
        var widgets = document.getElementsByClassName(WIDGET_CLASS);
        var widgetsArray = Array.prototype.slice.call(widgets);
        
        for (var i = 0; i < widgetsArray.length; i++) {
            createWidget(widgetsArray[i]);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
