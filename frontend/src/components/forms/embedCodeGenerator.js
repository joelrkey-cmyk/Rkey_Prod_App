import { DEFAULT_STYLES } from './constants';

/**
 * Génère le code HTML d'intégration pour un formulaire donné.
 * Iframe autonome avec auto-resize via postMessage.
 */
export const generateEmbedCode = (form) => {
  if (!form?.id) return '';
  const baseUrl = 'https://rkeyprodapp.fr';
  const uid = 'rkey-form-' + form.id.substring(0, 8);
  const src = `${baseUrl}/api/widgets/form.html?id=${form.id}`;

  return `<!-- Formulaire R'KEY PROD: ${form.name} -->
<div style="width:100%;position:relative;">
  <iframe id="${uid}" src="${src}" 
    style="width:100%;border:none;min-height:500px;display:block;" 
    scrolling="no" frameborder="0" allowtransparency="true">
  </iframe>
</div>
<script>
(function(){
  var f=document.getElementById('${uid}');
  if(!f)return;
  window.addEventListener('message',function(e){
    if(e.source===f.contentWindow&&e.data&&e.data.type==='rkey-widget-resize'&&e.data.height>50){
      f.style.height=e.data.height+'px';
    }
  });
})();
<\/script>`;
};
