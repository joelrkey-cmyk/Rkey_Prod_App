import React, { useState, useEffect } from 'react';
import { 
  GripVertical, 
  ArrowUpToLine, 
  ArrowDownToLine, 
  ChevronUp, 
  ChevronDown, 
  Save, 
  Eye, 
  EyeOff, 
  AlertCircle,
  FolderTree,
  Package
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export default function CategoryReorderManager({
  categories = [],
  equipment = [],
  onSave,
  onToggleVisibility,
  isSaving = false
}) {
  const [orderedCats, setOrderedCats] = useState(categories);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    setOrderedCats(categories);
    setHasUnsavedChanges(false);
  }, [categories]);

  // Compter le nombre de produits par catégorie
  const countEquipment = (catName) => {
    return equipment.filter(e => {
      if (!e.publier_catalogue) return false;
      if (catName === 'Packs') return e.is_pack;
      if (catName === 'Structure et pieds') {
        return e.category === 'Structure et pieds' || e.category === 'Structure Truss';
      }
      if (catName === 'Lumière') {
        return e.category === 'Lumière' || e.category === 'Éclairage';
      }
      return e.category === catName;
    }).length;
  };

  // Drag and Drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch (err) {
      // fallback
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const nextList = [...orderedCats];
    const [moved] = nextList.splice(draggedIndex, 1);
    nextList.splice(targetIndex, 0, moved);

    setOrderedCats(nextList);
    setHasUnsavedChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Déplacement via boutons
  const moveCat = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= orderedCats.length || fromIndex === toIndex) return;
    const nextList = [...orderedCats];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);
    setOrderedCats(nextList);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(orderedCats);
      setHasUnsavedChanges(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Barre d'outils */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-medium text-slate-700">
            Glissez-déposez les catégories pour choisir leur ordre d'apparition sur le site public
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Modifications non enregistrées
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "text-xs font-semibold shadow-sm transition-all",
              hasUnsavedChanges
                ? "bg-orange-600 hover:bg-orange-700 text-white ring-2 ring-orange-400/50"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            )}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Sauvegarde...' : 'Enregistrer l\'ordre des catégories'}
          </Button>
        </div>
      </div>

      {/* Liste des catégories ordonnables */}
      <div className="space-y-2">
        {orderedCats.map((cat, index) => {
          const isDragged = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const eqCount = countEquipment(cat.name);
          const isVisible = cat.visible_catalogue !== false;

          return (
            <div
              key={cat.id || cat.name}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "group flex items-center justify-between p-3 rounded-xl border transition-all duration-150 bg-white select-none",
                isDragged && "opacity-40 scale-[0.99] border-dashed border-orange-500 bg-orange-50/30",
                isDragOver && "border-2 border-orange-500 ring-2 ring-orange-400/20 bg-orange-50/50",
                !isDragged && !isDragOver && (
                  isVisible 
                    ? "border-slate-200 hover:border-orange-300 hover:shadow-xs" 
                    : "border-slate-200 bg-slate-50/60 opacity-60"
                )
              )}
            >
              {/* Côté gauche : Poignée + Rang + Icône + Nom */}
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="cursor-grab active:cursor-grabbing p-1 text-slate-400 group-hover:text-orange-500 transition-colors rounded hover:bg-slate-100"
                  title="Glisser-déposer pour réorganiser"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Badge numéro d'ordre */}
                <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                  {index + 1}
                </div>

                {/* Icône de catégorie */}
                <span className="text-xl shrink-0">{cat.icon || '📁'}</span>

                {/* Nom et statut */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold text-sm text-slate-900 truncate",
                      !isVisible && "line-through text-slate-400"
                    )}>
                      {cat.name}
                    </span>
                    {isVisible ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal px-2 py-0">
                        Visible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 text-[10px] font-normal px-2 py-0">
                        Masquée
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {eqCount} équipement{eqCount > 1 ? 's' : ''} publié{eqCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Côté droit : Actions rapides & Visibilité */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Bouton Visibilité */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleVisibility && onToggleVisibility(cat)}
                  className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                  title={isVisible ? "Masquer du catalogue" : "Rendre visible sur le catalogue"}
                >
                  {isVisible ? (
                    <Eye className="w-4 h-4 text-emerald-600 mr-1" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400 mr-1" />
                  )}
                  <span className="hidden sm:inline text-xs">
                    {isVisible ? 'Visible' : 'Masquée'}
                  </span>
                </Button>

                {/* Séparateur */}
                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Bouton Tout en haut */}
                <button
                  type="button"
                  onClick={() => moveCat(index, 0)}
                  disabled={index === 0}
                  className="p-1.5 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Placer tout en haut (position #1)"
                >
                  <ArrowUpToLine className="w-4 h-4" />
                </button>

                {/* Bouton Monter d'un rang */}
                <button
                  type="button"
                  onClick={() => moveCat(index, index - 1)}
                  disabled={index === 0}
                  className="p-1.5 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Monter d'un rang"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                {/* Bouton Descendre d'un rang */}
                <button
                  type="button"
                  onClick={() => moveCat(index, index + 1)}
                  disabled={index === orderedCats.length - 1}
                  className="p-1.5 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Descendre d'un rang"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Bouton Tout en bas */}
                <button
                  type="button"
                  onClick={() => moveCat(index, orderedCats.length - 1)}
                  disabled={index === orderedCats.length - 1}
                  className="p-1.5 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Placer tout en bas"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre inférieure de sauvegarde */}
      <div className="bg-slate-50 border-t border-slate-200 pt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Total : <strong>{orderedCats.length}</strong> catégories au catalogue.
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "text-xs font-semibold shadow-sm transition-all",
            hasUnsavedChanges
              ? "bg-orange-600 hover:bg-orange-700 text-white ring-2 ring-orange-400/50"
              : "bg-slate-900 hover:bg-slate-800 text-white"
          )}
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {isSaving ? 'Sauvegarde...' : 'Enregistrer l\'ordre des catégories'}
        </Button>
      </div>
    </div>
  );
}
