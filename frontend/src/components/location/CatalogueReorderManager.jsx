import React, { useState } from 'react';
import { 
  GripVertical, 
  LayoutGrid, 
  List, 
  Search, 
  ArrowUpToLine, 
  ArrowDownToLine, 
  ChevronUp, 
  ChevronDown, 
  Save, 
  X, 
  Sparkles, 
  Package, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getImageUrl } from './helpers';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export default function CatalogueReorderManager({
  orderedProducts,
  setOrderedProducts,
  categories = [],
  onSave,
  onReset,
  isSaving = false,
  hasUnsavedChanges = false,
  setHasUnsavedChanges
}) {
  const [viewMode] = useState('medium');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingPositionId, setEditingPositionId] = useState(null);
  const [customPosValue, setCustomPosValue] = useState('');

  // Filtrage
  const filteredProductsWithIndex = orderedProducts.map((p, originalIndex) => ({
    product: p,
    originalIndex
  })).filter(({ product }) => {
    const matchesSearch = !searchTerm.trim() || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || 
      product.category === categoryFilter ||
      (categoryFilter === 'pack' && product.is_pack);

    return matchesSearch && matchesCategory;
  });

  // Drag & Drop Handlers
  const handleDragStart = (e, origIndex) => {
    setDraggedIndex(origIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', origIndex.toString());
  };

  const handleDragOver = (e, origIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== origIndex) {
      setDragOverIndex(origIndex);
    }
  };

  const handleDrop = (e, targetOrigIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === undefined) return;
    if (draggedIndex === targetOrigIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newProducts = [...orderedProducts];
    const [movedItem] = newProducts.splice(draggedIndex, 1);
    newProducts.splice(targetOrigIndex, 0, movedItem);

    setOrderedProducts(newProducts);
    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Actions de déplacement rapides
  const moveToTop = (origIndex) => {
    if (origIndex === 0) return;
    const newProducts = [...orderedProducts];
    const [item] = newProducts.splice(origIndex, 1);
    newProducts.unshift(item);
    setOrderedProducts(newProducts);
    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
    toast.success(`"${item.name}" placé en 1ère position`);
  };

  const moveToBottom = (origIndex) => {
    if (origIndex === orderedProducts.length - 1) return;
    const newProducts = [...orderedProducts];
    const [item] = newProducts.splice(origIndex, 1);
    newProducts.push(item);
    setOrderedProducts(newProducts);
    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
    toast.success(`"${item.name}" placé en dernière position`);
  };

  const moveOneStep = (origIndex, direction) => {
    const target = direction === 'up' ? origIndex - 1 : origIndex + 1;
    if (target < 0 || target >= orderedProducts.length) return;
    const newProducts = [...orderedProducts];
    [newProducts[origIndex], newProducts[target]] = [newProducts[target], newProducts[origIndex]];
    setOrderedProducts(newProducts);
    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const applyCustomPosition = (origIndex) => {
    const target = parseInt(customPosValue, 10);
    if (isNaN(target)) {
      setEditingPositionId(null);
      return;
    }
    const boundedPos = Math.max(1, Math.min(orderedProducts.length, target)) - 1;
    if (boundedPos !== origIndex) {
      const newProducts = [...orderedProducts];
      const [item] = newProducts.splice(origIndex, 1);
      newProducts.splice(boundedPos, 0, item);
      setOrderedProducts(newProducts);
      if (setHasUnsavedChanges) setHasUnsavedChanges(true);
      toast.success(`"${item.name}" déplacé en position #${boundedPos + 1}`);
    }
    setEditingPositionId(null);
    setCustomPosValue('');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Barre d'outils supérieure */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">
              Glissez-déposez les cartes pour organiser l'ordre d'affichage
            </span>
          </div>

          {/* Actions globales de sauvegarde */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Modifications non enregistrées
              </span>
            )}
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className={cn(
                "text-xs font-semibold shadow-sm transition-all",
                hasUnsavedChanges 
                  ? "bg-orange-600 hover:bg-orange-700 text-white ring-2 ring-orange-400/50" 
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              )}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? 'Sauvegarde...' : 'Enregistrer l\'ordre'}
            </Button>
          </div>
        </div>

        {/* Filtres & Recherche rapide */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-200/60">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un produit dans l'ordre..."
                className="pl-8 pr-8 py-1 h-8 text-xs bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs bg-white w-[180px]">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="pack">📦 Packs uniquement</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id || c.name} value={c.name}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-slate-500 font-medium">
              {filteredProductsWithIndex.length} / {orderedProducts.length} produit{orderedProducts.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Zone de contenu des produits à déplacer */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-[350px]">
        {filteredProductsWithIndex.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed">
            <Package className="w-12 h-12 mb-2 text-slate-300" />
            <p className="font-medium text-slate-600">Aucun produit ne correspond à votre recherche</p>
            <p className="text-xs mt-1 text-slate-400">Modifiez ou effacez vos filtres pour revoir vos produits</p>
          </div>
        ) : viewMode === 'large' ? (
          /* ================= MODE 1 : GRANDES ICÔNES (Cartes confortables) ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProductsWithIndex.map(({ product, originalIndex }) => {
              const photo = (product.photos && product.photos[0]) || product.photo_url;
              const isDragged = draggedIndex === originalIndex;
              const isDragOver = dragOverIndex === originalIndex;

              return (
                <div
                  key={product.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, originalIndex)}
                  onDragOver={(e) => handleDragOver(e, originalIndex)}
                  onDrop={(e) => handleDrop(e, originalIndex)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-3 p-3 bg-white border rounded-xl shadow-2xs transition-all duration-150 select-none group",
                    isDragged && "opacity-40 scale-98 border-dashed border-orange-400 bg-orange-50/50",
                    isDragOver && !isDragged && "ring-2 ring-orange-500 border-orange-500 bg-orange-50/40 shadow-md",
                    !isDragged && !isDragOver && "hover:border-slate-300 hover:shadow-xs"
                  )}
                >
                  {/* Poignée Drag & Drop */}
                  <div 
                    className="flex items-center text-slate-400 group-hover:text-orange-600 cursor-grab active:cursor-grabbing p-1"
                    title="Glisser pour réorganiser"
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Numéro de position */}
                  <div className="flex flex-col items-center justify-center">
                    {editingPositionId === product.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          autoFocus
                          min="1"
                          max={orderedProducts.length}
                          value={customPosValue}
                          onChange={(e) => setCustomPosValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') applyCustomPosition(originalIndex);
                            if (e.key === 'Escape') setEditingPositionId(null);
                          }}
                          className="w-10 h-7 text-center text-xs font-bold border-2 border-orange-500 rounded bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => applyCustomPosition(originalIndex)}
                          className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-semibold"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPositionId(product.id);
                          setCustomPosValue((originalIndex + 1).toString());
                        }}
                        className="w-8 h-8 rounded-lg bg-orange-100/80 text-orange-700 font-extrabold text-xs flex items-center justify-center border border-orange-200 hover:bg-orange-200 transition-colors"
                        title="Cliquez pour saisir directement un numéro de position"
                      >
                        #{originalIndex + 1}
                      </button>
                    )}
                  </div>

                  {/* Image */}
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center">
                    {photo ? (
                      <img
                        src={getImageUrl(photo)}
                        alt={product.name}
                        className="w-full h-full object-contain p-0.5"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-xl">{product.is_pack ? '📦' : '🎛️'}</span>
                    )}
                  </div>

                  {/* Détails */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {product.is_pack && (
                        <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1 py-0 border-none font-semibold">
                          Pack
                        </Badge>
                      )}
                      <h4 className="font-semibold text-sm text-slate-900 truncate" title={product.name}>
                        {product.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span>{product.category}</span>
                      <span>•</span>
                      <span className="font-bold text-orange-600">{product.daily_price}€/j</span>
                    </div>
                  </div>

                  {/* Boutons d'action rapide */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveToTop(originalIndex)}
                      disabled={originalIndex === 0}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                      title="Placer tout en haut (1ère position)"
                    >
                      <ArrowUpToLine className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOneStep(originalIndex, 'up')}
                      disabled={originalIndex === 0}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800"
                      title="Monter d'un cran"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOneStep(originalIndex, 'down')}
                      disabled={originalIndex === orderedProducts.length - 1}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800"
                      title="Descendre d'un cran"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveToBottom(originalIndex)}
                      disabled={originalIndex === orderedProducts.length - 1}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                      title="Placer tout en bas (dernière position)"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'medium' ? (
          /* ================= MODE 2 : PETITES ICÔNES (Grille compacte 4-6 colonnes) ================= */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
            {filteredProductsWithIndex.map(({ product, originalIndex }) => {
              const photo = (product.photos && product.photos[0]) || product.photo_url;
              const isDragged = draggedIndex === originalIndex;
              const isDragOver = dragOverIndex === originalIndex;

              return (
                <div
                  key={product.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, originalIndex)}
                  onDragOver={(e) => handleDragOver(e, originalIndex)}
                  onDrop={(e) => handleDrop(e, originalIndex)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "relative flex flex-col p-2.5 bg-white border rounded-xl shadow-2xs transition-all duration-150 select-none group cursor-grab active:cursor-grabbing",
                    isDragged && "opacity-40 scale-95 border-dashed border-orange-400 bg-orange-50/50",
                    isDragOver && !isDragged && "ring-2 ring-orange-500 border-orange-500 bg-orange-50/50 shadow-md",
                    !isDragged && !isDragOver && "hover:border-slate-300 hover:shadow-xs"
                  )}
                >
                  {/* Badge d'ordre en haut à gauche */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 font-extrabold text-[11px] border border-orange-200">
                      #{originalIndex + 1}
                    </span>
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-600" />
                  </div>

                  {/* Image carrée */}
                  <div className="w-full aspect-square max-h-24 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-2">
                    {photo ? (
                      <img
                        src={getImageUrl(photo)}
                        alt={product.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-2xl">{product.is_pack ? '📦' : '🎛️'}</span>
                    )}
                  </div>

                  {/* Nom & Prix */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-slate-900 line-clamp-2 leading-tight" title={product.name}>
                      {product.name}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-slate-400 truncate max-w-[65%]">{product.category}</span>
                      <span className="font-bold text-orange-600 shrink-0">{product.daily_price}€</span>
                    </div>
                  </div>

                  {/* Boutons d'actions rapides au survol */}
                  <div className="absolute inset-x-1.5 bottom-1.5 bg-white/95 backdrop-blur-xs border rounded-lg p-0.5 flex items-center justify-around opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveToTop(originalIndex); }}
                      className="p-1 hover:text-orange-600 rounded text-slate-400"
                      title="Placer tout en haut (1er)"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveOneStep(originalIndex, 'up'); }}
                      disabled={originalIndex === 0}
                      className="p-1 hover:text-slate-900 disabled:opacity-30 rounded text-slate-400"
                      title="Monter d'un cran"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveOneStep(originalIndex, 'down'); }}
                      disabled={originalIndex === orderedProducts.length - 1}
                      className="p-1 hover:text-slate-900 disabled:opacity-30 rounded text-slate-400"
                      title="Descendre d'un cran"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveToBottom(originalIndex); }}
                      className="p-1 hover:text-orange-600 rounded text-slate-400"
                      title="Placer tout en bas"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= MODE 3 : TRÈS PETITES ICÔNES (Vue d'ensemble ultra-compacte sans scroll) ================= */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
            {filteredProductsWithIndex.map(({ product, originalIndex }) => {
              const photo = (product.photos && product.photos[0]) || product.photo_url;
              const isDragged = draggedIndex === originalIndex;
              const isDragOver = dragOverIndex === originalIndex;

              return (
                <div
                  key={product.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, originalIndex)}
                  onDragOver={(e) => handleDragOver(e, originalIndex)}
                  onDrop={(e) => handleDrop(e, originalIndex)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "relative flex items-center gap-1.5 p-1.5 bg-white border rounded-lg shadow-2xs transition-all duration-150 select-none group cursor-grab active:cursor-grabbing",
                    isDragged && "opacity-40 scale-95 border-dashed border-orange-400 bg-orange-50/50",
                    isDragOver && !isDragged && "ring-2 ring-orange-500 border-orange-500 bg-orange-50/60 shadow-md",
                    !isDragged && !isDragOver && "hover:border-orange-300 hover:bg-slate-50/70"
                  )}
                  title={`${originalIndex + 1}. ${product.name} (${product.category} - ${product.daily_price}€/j)`}
                >
                  {/* Badge compact numéro */}
                  <span className="w-5 h-5 shrink-0 rounded bg-slate-100 text-slate-700 group-hover:bg-orange-500 group-hover:text-white font-extrabold text-[10px] flex items-center justify-center transition-colors">
                    {originalIndex + 1}
                  </span>

                  {/* Micro vignette */}
                  <div className="w-6 h-6 rounded bg-slate-50 border border-slate-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                    {photo ? (
                      <img
                        src={getImageUrl(photo)}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-[10px]">{product.is_pack ? '📦' : '🎛️'}</span>
                    )}
                  </div>

                  {/* Nom tronqué */}
                  <span className="font-semibold text-[11px] text-slate-800 truncate flex-1 leading-none">
                    {product.name}
                  </span>

                  {/* Bouton rapide "Tout en haut" au survol */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveToTop(originalIndex); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-orange-100 text-orange-600 rounded shrink-0 transition-opacity"
                    title="Envoyer en position #1"
                  >
                    <ArrowUpToLine className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barre de pied de page avec résumé et confirmation */}
      <div className="bg-slate-50 border-t border-slate-200 pt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Total : <strong>{orderedProducts.length}</strong> produits ordonnés pour le catalogue public et le widget.
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "text-xs font-semibold shadow-sm transition-all",
              hasUnsavedChanges 
                ? "bg-orange-600 hover:bg-orange-700 text-white ring-2 ring-orange-400/50" 
                : "bg-slate-900 hover:bg-slate-800 text-white"
            )}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Sauvegarde en cours...' : 'Enregistrer l\'ordre'}
          </Button>
        </div>
      </div>
    </div>
  );
}
