import React, { useState, useEffect } from 'react';
import { Plus, X, Edit3, Save, RotateCcw, NotebookPen } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import apiService from '../services/api';
import { toast } from 'sonner';

const COLORS = [
  { id: 'yellow', bg: 'bg-yellow-200', border: 'border-yellow-300', shadow: 'shadow-yellow-100', name: 'Jaune' },
  { id: 'pink', bg: 'bg-pink-200', border: 'border-pink-300', shadow: 'shadow-pink-100', name: 'Rose' },
  { id: 'blue', bg: 'bg-blue-200', border: 'border-blue-300', shadow: 'shadow-blue-100', name: 'Bleu' },
  { id: 'green', bg: 'bg-green-200', border: 'border-green-300', shadow: 'shadow-green-100', name: 'Vert' },
  { id: 'orange', bg: 'bg-orange-200', border: 'border-orange-300', shadow: 'shadow-orange-100', name: 'Orange' },
  { id: 'purple', bg: 'bg-purple-200', border: 'border-purple-300', shadow: 'shadow-purple-100', name: 'Violet' },
  { id: 'red', bg: 'bg-red-200', border: 'border-red-300', shadow: 'shadow-red-100', name: 'Rouge' },
  { id: 'indigo', bg: 'bg-indigo-200', border: 'border-indigo-300', shadow: 'shadow-indigo-100', name: 'Indigo' }
];

const StickyNotes = () => {
  const [notes, setNotes] = useState([]);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [newNote, setNewNote] = useState({ text: '', color: 'yellow' });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [draggedNote, setDraggedNote] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Charger les notes depuis l'API
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const apiNotes = await apiService.getHomeNotes();
      // Convertir le format API vers le format utilisé par l'interface
      const formattedNotes = apiNotes.map(note => ({
        id: note.id,
        text: note.content,
        title: note.title,
        color: note.color,
        position: { x: Math.random() * 200, y: Math.random() * 200 }, // Position aléatoire pour l'affichage
        timestamp: note.created_at
      }));
      setNotes(formattedNotes);
    } catch (error) {
      console.error('Erreur lors du chargement des notes:', error);
      toast.error("Erreur lors du chargement des notes");
    }
  };

  // Écouter l'événement pour ouvrir une nouvelle note
  useEffect(() => {
    const handleOpenNewNote = () => {
      setShowNewNoteForm(true);
    };

    document.addEventListener('openNewNote', handleOpenNewNote);
    
    return () => {
      document.removeEventListener('openNewNote', handleOpenNewNote);
    };
  }, []);

  // Ajouter une nouvelle note
  const addNote = async () => {
    if (!newNote.text.trim()) {
      toast.error("Veuillez saisir du texte pour votre note.");
      return;
    }

    try {
      const apiNote = await apiService.createHomeNote({
        title: newNote.text.split('\n')[0].slice(0, 50) || "Note sans titre",
        content: newNote.text.trim(),
        color: newNote.color
      });

      const note = {
        id: apiNote.id,
        text: newNote.text.trim(),
        color: newNote.color,
        createdAt: new Date().toISOString(),
        rotation: Math.floor(Math.random() * 6) - 3, // Rotation aléatoire entre -3 et 3 degrés
        x: 200, // Position X visible (centre-bas)
        y: 100  // Position Y visible (centre-bas)
      };

      setNotes(prev => [...prev, note]);
      setNewNote({ text: '', color: 'yellow' });
      setShowNewNoteForm(false);
      toast.success("Note ajoutée avec succès !");
    } catch (error) {
      console.error('Erreur lors de la création de la note:', error);
      toast.error("Erreur lors de l'ajout de la note");
    }
  };

  // Supprimer une note
  const deleteNote = async (id) => {
    try {
      await apiService.deleteHomeNote(id);
      setNotes(prev => prev.filter(note => note.id !== id));
      toast.success("Note supprimée avec succès !");
    } catch (error) {
      console.error('Erreur lors de la suppression de la note:', error);
      toast.error("Erreur lors de la suppression de la note");
    }
  };

  // Commencer l'édition
  const startEditing = (note) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  // Sauvegarder l'édition
  const saveEdit = async () => {
    if (!editText.trim()) {
      toast.error("Le texte de la note ne peut pas être vide.");
      return;
    }

    try {
      await apiService.updateHomeNote(editingId, {
        title: editText.split('\n')[0].slice(0, 50) || "Note sans titre",
        content: editText.trim()
      });

      setNotes(prev => prev.map(note => 
        note.id === editingId 
          ? { ...note, text: editText.trim() }
          : note
      ));
      
      setEditingId(null);
      setEditText('');
      toast.success("Note modifiée avec succès !");
    } catch (error) {
      console.error('Erreur lors de la modification de la note:', error);
      toast.error("Erreur lors de la modification de la note");
    }
  };

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Obtenir les styles de couleur
  const getColorStyles = (colorId) => {
    return COLORS.find(c => c.id === colorId) || COLORS[0];
  };

  // Commencer le drag d'une note
  const startDrag = (e, noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || editingId === noteId) return; // Ne pas déplacer si en cours d'édition
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = e.currentTarget.closest('.sticky-notes-container').getBoundingClientRect();
    
    setDraggedNote(noteId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    e.preventDefault();
  };

  // Gérer le déplacement pendant le drag
  const handleDrag = (e) => {
    if (!draggedNote) return;
    
    const notesContainer = document.querySelector('.sticky-notes-container');
    if (!notesContainer) return;
    
    const containerRect = notesContainer.getBoundingClientRect();
    const noteWidth = 192; // w-48 = 192px
    const noteHeight = 128; // h-32 = 128px
    
    // Calculer la nouvelle position relative au conteneur
    let newX = e.clientX - containerRect.left - dragOffset.x;
    let newY = e.clientY - containerRect.top - dragOffset.y;
    
    // Limiter la position pour que la note reste dans le conteneur
    newX = Math.max(0, Math.min(containerRect.width - noteWidth, newX));
    newY = Math.max(0, Math.min(containerRect.height - noteHeight, newY));
    
    // Mettre à jour la position de la note
    const updatedNotes = notes.map(note => 
      note.id === draggedNote 
        ? { ...note, x: newX, y: newY }
        : note
    );
    
    setNotes(updatedNotes);
  };

  // Terminer le drag
  const endDrag = () => {
    if (draggedNote) {
      setDraggedNote(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Ajouter les event listeners pour le drag
  useEffect(() => {
    if (draggedNote) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', endDrag);
      
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', endDrag);
      };
    }
  }, [draggedNote, notes, dragOffset]);

  return (
    <div className="sticky-notes-container relative w-full h-full">
      {/* Notes affichées avec positionnement absolu */}
      {notes.map(note => {
        const colorStyles = getColorStyles(note.color);
        const isEditing = editingId === note.id;
        const isDragging = draggedNote === note.id;
        
        return (
          <div
            key={note.id}
            className={`
              absolute w-48 h-32 p-3 rounded-lg border-2 shadow-lg cursor-move
              transform transition-all duration-200 hover:scale-105 hover:shadow-xl
              ${colorStyles.bg} ${colorStyles.border} ${colorStyles.shadow}
              ${isDragging ? 'z-50 scale-110' : 'z-30'}
              ${isEditing ? 'cursor-default' : 'cursor-move'}
            `}
            style={{ 
              left: `${note.x || 0}px`,
              top: `${note.y || 0}px`,
              transform: `rotate(${note.rotation}deg) ${isDragging ? 'scale(1.1)' : ''}`,
              transformOrigin: 'center center'
            }}
            onMouseDown={(e) => startDrag(e, note.id)}
          >
              {/* Boutons d'action */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-70 hover:opacity-100 transition-opacity">
                {!isEditing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0 hover:bg-black/10"
                    onClick={() => startEditing(note)}
                  >
                    <Edit3 size={12} />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0 hover:bg-black/10"
                  onClick={() => deleteNote(note.id)}
                >
                  <X size={12} />
                </Button>
              </div>

              {/* Contenu de la note */}
              <div className="h-full flex flex-col">
                {isEditing ? (
                  <>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 text-xs bg-transparent border-none resize-none p-0 focus:ring-0"
                      placeholder="Tapez votre note..."
                    />
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" onClick={saveEdit} className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700">
                        <Save size={10} className="mr-1" />
                        Ok
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="h-6 px-2 text-xs">
                        <RotateCcw size={10} />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-800 leading-tight break-words overflow-hidden">
                    {note.text}
                  </p>
                )}
              </div>
            </div>
          );
        })}

      {/* Formulaire de nouvelle note - position fixe en bas à gauche mais masqué visuellement */}
      <div className="absolute bottom-0 left-0 z-40">
        {showNewNoteForm && (
          <div className="w-48 h-32 p-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="h-full flex flex-col">
              <Textarea
                value={newNote.text}
                onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
                placeholder="Tapez votre note..."
                className="flex-1 text-xs bg-transparent border-none resize-none p-0 focus:ring-0"
              />
              
              {/* Sélecteur de couleur */}
              <div className="flex gap-1 mb-2">
                {COLORS.slice(0, 4).map(color => (
                  <button
                    key={color.id}
                    className={`w-4 h-4 rounded border-2 ${color.bg} ${
                      newNote.color === color.id 
                        ? 'border-gray-800 ring-1 ring-gray-800' 
                        : 'border-gray-400'
                    }`}
                    onClick={() => setNewNote({ ...newNote, color: color.id })}
                  />
                ))}
              </div>

              <div className="flex gap-1">
                <Button size="sm" onClick={addNote} className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700">
                  <Save size={10} className="mr-1" />
                  Ajouter
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setShowNewNoteForm(false);
                    setNewNote({ text: '', color: 'yellow' });
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <X size={10} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default StickyNotes;