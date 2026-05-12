import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Plus, Search, ArrowLeft, Trash2, Phone, Globe,
  Users, X, Copy, Check, Loader2, ChevronDown, Camera, ArrowUp, ArrowDown
} from 'lucide-react';

import API_BASE_URL from '../utils/apiUrl';
const API = API_BASE_URL + '/api';

const FREQ_OPTIONS = [
  { value: 'regulierement', label: 'Partenaires fusionnels', color: 'text-green-500', bg: 'bg-green-50', icon: '🤝' },
  { value: 'occasionnellement', label: 'Collaborations régulières', color: 'text-orange-500', bg: 'bg-orange-50', icon: '👍' },
  { value: 'rarement', label: 'Interventions ponctuelles', color: 'text-gray-400', bg: 'bg-gray-50', icon: '✨' },
];

const getFreq = (val) => FREQ_OPTIONS.find(f => f.value === val) || FREQ_OPTIONS[1];

// ─── Partner Form ───
const PartnerForm = ({ partner, categories, onSave, onCancel }) => {
  const [form, setForm] = useState({
    first_name: '', last_name: '', company: '', category: '', address: '',
    email: '', phone: '', website: '', frequency: 'occasionnellement',
    social_networks: { instagram: '', facebook: '', youtube: '', tiktok: '' },
    notes: '', photo: null, cover_photo: null,
    ...partner,
  });
  const [saving, setSaving] = useState(false);
  const photoRef = useRef(null);
  const coverPhotoRef = useRef(null);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setSocial = (key, val) => setForm(p => ({ ...p, social_networks: { ...p.social_networks, [key]: val } }));

  const handlePhotoUpload = (field, maxW = 800) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = (maxW / w) * h; w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        set(field, canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.last_name?.trim() && !form.company?.trim()) {
      toast.error('Nom ou société requis');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      toast.success(partner?.id ? 'Partenaire modifié' : 'Partenaire créé');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5" data-testid="partner-form">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} data-testid="partner-form-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Button>
        <h2 className="text-lg font-bold text-gray-800">{partner?.id ? 'Modifier' : 'Nouveau'} Partenaire</h2>
      </div>

      {/* Main fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        {/* Photos: Profil + Couverture */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Photos</label>
          <div className="flex items-start gap-5">
            {/* Profile photo (circle - verso) */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                {form.photo ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 relative">
                    <img src={form.photo} alt="Profil" className="w-full h-full object-cover" />
                    <button onClick={() => set('photo', null)} className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center" data-testid="remove-photo-btn">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => photoRef.current?.click()} className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 transition-colors" data-testid="add-photo-btn">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload('photo')} className="hidden" />
              </div>
              <span className="text-[9px] text-gray-400 font-medium">Profil</span>
              {form.photo && <button onClick={() => photoRef.current?.click()} className="text-[9px] text-blue-500 hover:underline">Changer</button>}
            </div>
            {/* Cover photo (rectangle - recto) */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                {form.cover_photo ? (
                  <div className="w-28 h-16 rounded-lg overflow-hidden border-2 border-gray-200 relative">
                    <img src={form.cover_photo} alt="Couverture" className="w-full h-full object-cover" />
                    <button onClick={() => set('cover_photo', null)} className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center" data-testid="remove-cover-photo-btn">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => coverPhotoRef.current?.click()} className="w-28 h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 transition-colors" data-testid="add-cover-photo-btn">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                <input ref={coverPhotoRef} type="file" accept="image/*" onChange={handlePhotoUpload('cover_photo')} className="hidden" />
              </div>
              <span className="text-[9px] text-gray-400 font-medium">Couverture</span>
              {form.cover_photo && <button onClick={() => coverPhotoRef.current?.click()} className="text-[9px] text-blue-500 hover:underline">Changer</button>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Prénom</label>
            <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} data-testid="partner-first-name" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nom *</label>
            <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} data-testid="partner-last-name" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Société</label>
            <Input value={form.company} onChange={e => set('company', e.target.value)} data-testid="partner-company" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Catégorie</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
              data-testid="partner-category"
            >
              <option value="">Sélectionner...</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} data-testid="partner-email" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Téléphone</label>
            <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} data-testid="partner-phone" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Site Web</label>
            <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." data-testid="partner-website" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Adresse</label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} data-testid="partner-address" />
          </div>
        </div>

        {/* Social Networks */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Réseaux sociaux</label>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Facebook" value={form.social_networks?.facebook || ''} onChange={e => setSocial('facebook', e.target.value)} data-testid="partner-facebook" />
            <Input placeholder="Instagram" value={form.social_networks?.instagram || ''} onChange={e => setSocial('instagram', e.target.value)} data-testid="partner-instagram" />
            <Input placeholder="YouTube" value={form.social_networks?.youtube || ''} onChange={e => setSocial('youtube', e.target.value)} data-testid="partner-youtube" />
            <Input placeholder="TikTok" value={form.social_networks?.tiktok || ''} onChange={e => setSocial('tiktok', e.target.value)} data-testid="partner-tiktok" />
          </div>
        </div>

        {/* Connexion */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Connexion</label>
          <div className="flex gap-2">
            {FREQ_OPTIONS.map(f => (
              <button
                key={f.value}
                onClick={() => set('frequency', f.value)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  form.frequency === f.value
                    ? `${f.bg} border-current ${f.color} ring-1 ring-current`
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
                data-testid={`freq-${f.value}`}
              >
                <span className="mr-1.5">{f.icon}</span> {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} data-testid="partner-notes" />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="partner-save-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
          {partner?.id ? 'Enregistrer' : 'Créer'}
        </Button>
      </div>
    </div>
  );
};

// ─── Inline Widget Preview (per category) ───
const PREVIEW_SIZES = [
  { key: 'desktop', label: 'Ordinateur', width: '100%' },
  { key: 'tablet', label: 'Tablette', width: '768px' },
  { key: 'mobile', label: 'Mobile', width: '375px' },
];

const InlineWidgetPreview = ({ categoryName }) => {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [previewSize, setPreviewSize] = useState('desktop');
  const iframeRef = useRef(null);

  const baseUrl = 'https://rkeyprodapp.fr';
  const widgetUrl = `${baseUrl}/api/widgets/partners-widget.html?category=${encodeURIComponent(categoryName)}`;
  const pUid = 'rkey-part-' + Date.now().toString(36);

  // Embed code - iframe autonome avec auto-resize
  const embedCode = `<!-- Widget Partenaires R'KEY PROD - ${categoryName} -->
<div style="width:100%;position:relative;">
  <iframe id="${pUid}" src="${widgetUrl}" 
    style="width:100%;border:none;min-height:350px;display:block;" 
    scrolling="no" frameborder="0" allowtransparency="true">
  </iframe>
</div>
<script>
(function(){
  var f=document.getElementById('${pUid}');
  if(!f)return;
  window.addEventListener('message',function(e){
    if(e.source===f.contentWindow&&e.data&&e.data.type==='rkey-widget-resize'&&e.data.height>50){
      f.style.height=e.data.height+'px';
    }
  });
})();
<\/script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Code copié');
    setTimeout(() => setCopied(false), 2000);
  };

  const currentSize = PREVIEW_SIZES.find(s => s.key === previewSize);

  return (
    <div className="border-t border-gray-200" data-testid={`widget-inline-${categoryName}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 flex-wrap gap-2">
        <p className="text-xs font-medium text-gray-500">Widget — {categoryName}</p>
        <div className="flex gap-1.5 items-center">
          {PREVIEW_SIZES.map(s => (
            <button
              key={s.key}
              onClick={() => { setShowCode(false); setPreviewSize(s.key); }}
              className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                !showCode && previewSize === s.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
              data-testid={`preview-${s.key}`}
            >
              {s.label}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button
            onClick={() => setShowCode(true)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
              showCode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Code
          </button>
          <button onClick={copyCode} className="text-[10px] px-2 py-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100">
            {copied ? <Check className="w-3 h-3 text-green-500 inline" /> : <Copy className="w-3 h-3 inline" />}
          </button>
        </div>
      </div>
      {!showCode ? (
        <div className="bg-black p-2 flex justify-center">
          <iframe
            ref={iframeRef}
            src={widgetUrl}
            title={`Widget ${categoryName}`}
            className="border-0 rounded-lg transition-all duration-300"
            style={{ height: '560px', width: currentSize.width, maxWidth: '100%' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        <pre className="bg-gray-900 text-green-400 p-3 text-xs overflow-x-auto max-h-60 overflow-y-auto m-0">{embedCode}</pre>
      )}
    </div>
  );
};

// ─── Main App ───
const PartnersApp = () => {
  const [view, setView] = useState('list');
  const [partners, setPartners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentPartner, setCurrentPartner] = useState(null);
  const [search, setSearch] = useState('');
  const [newCat, setNewCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [openCats, setOpenCats] = useState({});
  const [widgetCat, setWidgetCat] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        axios.get(`${API}/partners`),
        axios.get(`${API}/partners/categories`),
      ]);
      setPartners(pRes.data || []);
      setCategories(cRes.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (formData) => {
    if (formData.id) {
      await axios.put(`${API}/partners/${formData.id}`, formData);
    } else {
      await axios.post(`${API}/partners`, formData);
    }
    await fetchData();
    setView('list');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce partenaire ?')) return;
    await axios.delete(`${API}/partners/${id}`);
    toast.success('Partenaire supprimé');
    fetchData();
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const resp = await axios.post(`${API}/partners/categories`, { name: newCat.trim() });
    if (resp.data.error) { toast.error(resp.data.error); return; }
    toast.success('Catégorie ajoutée');
    setNewCat('');
    fetchData();
  };

  const deleteCategory = async (id) => {
    await axios.delete(`${API}/partners/categories/${id}`);
    toast.success('Catégorie supprimée');
    fetchData();
  };

  const movePartner = async (categoryPartners, index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categoryPartners.length) return;
    const reordered = [...categoryPartners];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const order = reordered.map((p, i) => ({ id: p.id, sort_order: i }));
    // Optimistic update
    setPartners(prev => {
      const updated = [...prev];
      for (const o of order) {
        const found = updated.find(p => p.id === o.id);
        if (found) found.sort_order = o.sort_order;
      }
      return updated;
    });
    try {
      await axios.put(`${API}/partners/reorder`, { order });
    } catch (err) {
      toast.error('Erreur lors du tri');
      fetchData();
    }
  };

  const filtered = partners.filter(p => {
    const q = search.toLowerCase();
    return !q || [p.first_name, p.last_name, p.company, p.email, p.phone].some(v => (v || '').toLowerCase().includes(q));
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  if (view === 'form') {
    return <PartnerForm partner={currentPartner} categories={categories} onSave={handleSave} onCancel={() => { setCurrentPartner(null); setView('list'); }} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-4" data-testid="partners-app">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partenaires</h1>
          <p className="text-sm text-gray-500">{partners.length} partenaire{partners.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setCurrentPartner(null); setView('form'); }} data-testid="add-partner-btn">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Category Manager — always visible */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3" data-testid="category-manager">
        <p className="text-sm font-medium text-gray-700">Catégories</p>
        <div className="flex gap-2">
          <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nouvelle catégorie..." className="flex-1" data-testid="new-category-input" />
          <Button size="sm" onClick={addCategory} data-testid="add-category-btn"><Plus className="w-3 h-3" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <Badge key={c.id} variant="secondary" className="flex items-center gap-1.5 pr-1">
              {c.name}
              <button onClick={() => deleteCategory(c.id)} className="w-4 h-4 rounded-full hover:bg-red-100 flex items-center justify-center">
                <X className="w-2.5 h-2.5 text-red-400" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un partenaire..."
            className="pl-9"
            data-testid="partner-search"
          />
        </div>
      </div>

      {/* Partner List grouped by category */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucun partenaire trouvé</p>
          <Button size="sm" className="mt-3 bg-indigo-600" onClick={() => { setCurrentPartner(null); setView('form'); }}>
            <Plus className="w-3 h-3 mr-1" /> Ajouter un partenaire
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const grouped = {};
            filtered.forEach(p => {
              const cat = p.category || 'Sans catégorie';
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(p);
            });
            // Sort each group by sort_order then last_name
            Object.values(grouped).forEach(arr => arr.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || (a.last_name || '').localeCompare(b.last_name || '')));
            const sortedCats = Object.keys(grouped).sort((a, b) => {
              if (a === 'Sans catégorie') return 1;
              if (b === 'Sans catégorie') return -1;
              return a.localeCompare(b);
            });
            const toggle = (cat) => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }));
            return sortedCats.map(cat => {
              const isOpen = openCats[cat] !== false;
              const catPartners = grouped[cat];
              return (
                <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid={`category-group-${cat}`}>
                  <div className="flex items-center">
                    <button
                      onClick={() => toggle(cat)}
                      className="flex-1 px-4 py-2.5 bg-gray-50 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                      data-testid={`toggle-cat-${cat}`}
                    >
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                      <p className="text-sm font-semibold text-gray-700">{cat}</p>
                      <span className="text-xs text-gray-400">{catPartners.length}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setWidgetCat(widgetCat === cat ? null : cat); }}
                      className={`px-3 py-2.5 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 transition-colors ${widgetCat === cat ? 'text-indigo-600' : 'text-gray-400'}`}
                      title="Aperçu widget"
                      data-testid={`widget-btn-${cat}`}
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="divide-y divide-gray-100">
                      {catPartners.map((p, idx) => {
                        const freq = getFreq(p.frequency);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                            data-testid={`partner-row-${p.id}`}
                          >
                            {/* Reorder arrows */}
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); movePartner(catPartners, idx, -1); }}
                                disabled={idx === 0}
                                className={`p-0.5 rounded transition-colors ${idx === 0 ? 'text-gray-200 cursor-default' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                title="Monter"
                                data-testid={`move-up-${p.id}`}
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); movePartner(catPartners, idx, 1); }}
                                disabled={idx === catPartners.length - 1}
                                className={`p-0.5 rounded transition-colors ${idx === catPartners.length - 1 ? 'text-gray-200 cursor-default' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                title="Descendre"
                                data-testid={`move-down-${p.id}`}
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-base flex-shrink-0 cursor-pointer" title={freq.label} onClick={() => { setCurrentPartner(p); setView('form'); }}>{freq.icon}</span>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setCurrentPartner(p); setView('form'); }}>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {p.first_name} {p.last_name}
                                {p.company && <span className="text-gray-400 font-normal"> — {p.company}</span>}
                              </p>
                            </div>
                            {p.phone && <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{p.phone}</span>}
                            <Trash2
                              className="w-3.5 h-3.5 text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                              data-testid={`delete-partner-${p.id}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {widgetCat === cat && <InlineWidgetPreview key={`widget-${cat}`} categoryName={cat} />}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

export default PartnersApp;

