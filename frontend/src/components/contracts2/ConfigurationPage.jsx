// Page de configuration des options matériel et notes techniques
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Music, FileText, Edit, Trash2, Plus, ChevronUp, ChevronDown, Save, UploadCloud, FileDown, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export const EVENT_CATEGORIES = [
  "Mariage",
  "Anniversaire",
  "Comité d'entreprise",
  "Soirée privée",
  "Événement professionnel",
  "Show Hypnose",
  "Intervention hypnose"
];

export const ConfigurationPage = ({
  selectedOptions,
  setSelectedOptions,
  predefinedNotes,
  setPredefinedNotes,
  pdfNotes,
  setPdfNotes,
  cgvTemplates,
  setCgvTemplates,
  apiService,
  setShowConfiguration
}) => {
  const [activeConfigTab, setActiveConfigTab] = useState("options");
  const [editingOptionIndex, setEditingOptionIndex] = useState(null);
  const [newOption, setNewOption] = useState({ name: "", price: 0, event_categories: [] });

  const [newNote, setNewNote] = useState({ key: "", title: "", content: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [orderedNotes, setOrderedNotes] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNoteData, setEditingNoteData] = useState({ key: "", title: "", content: "" });

  const [newPdfNote, setNewPdfNote] = useState({ title: "", file: null });
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const [newCgv, setNewCgv] = useState({ name: "", content: "" });
  const [editingCgvKey, setEditingCgvKey] = useState(null);
  const [isCgvModalOpen, setIsCgvModalOpen] = useState(false);
  const [editingCgvData, setEditingCgvData] = useState({ name: "", content: "" });

  // Charger les notes ordonnées au montage
  useEffect(() => {
    const loadOrderedNotes = async () => {
      try {
        const notes = await apiService.getTechnicalNotes();
        if (notes && notes.length > 0) {
          setOrderedNotes(notes);
        }
      } catch (error) {
        console.error("Error loading ordered notes:", error);
      }
    };
    loadOrderedNotes();
  }, [apiService]);

  // --- Options Matériel ---
  const addNewOption = async () => {
    if (newOption.name.trim() && newOption.price >= 0) {
      try {
        setIsSaving(true);
        const savedOption = await apiService.createMaterialOption({
          name: newOption.name.trim(),
          price: newOption.price,
          event_categories: newOption.event_categories || []
        });
        setSelectedOptions([...selectedOptions, { ...savedOption, selected: false }]);
        setNewOption({ name: "", price: 0, event_categories: [] });
        toast.success("Option matériel ajoutée et sauvegardée définitivement !");
      } catch (error) {
        console.error("Error adding option:", error);
        toast.error("Erreur lors de l'ajout de l'option");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deleteOption = async (index) => {
    const optionToDelete = selectedOptions[index];
    try {
      setIsSaving(true);
      await apiService.deleteMaterialOption(optionToDelete.id);
      setSelectedOptions(selectedOptions.filter((_, i) => i !== index));
      toast.success("Option supprimée définitivement !");
    } catch (error) {
      console.error("Error deleting option:", error);
      toast.error("Erreur lors de la suppression de l'option");
    } finally {
      setIsSaving(false);
    }
  };

  const saveEditedOption = async (index) => {
    const option = selectedOptions[index];
    try {
      setIsSaving(true);
      await apiService.updateMaterialOption(option.id, { 
        name: option.name, 
        price: option.price,
        event_categories: option.event_categories || [] 
      });
      setEditingOptionIndex(null);
      toast.success("Option modifiée et sauvegardée !");
    } catch (error) {
      console.error("Error updating option:", error);
      toast.error("Erreur lors de la modification de l'option");
    } finally {
      setIsSaving(false);
    }
  };

  const moveOption = async (index, direction) => {
    const newOptions = [...selectedOptions];
    if (direction === 'up' && index > 0) {
      [newOptions[index], newOptions[index - 1]] = [newOptions[index - 1], newOptions[index]];
    } else if (direction === 'down' && index < newOptions.length - 1) {
      [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    }
    setSelectedOptions(newOptions);
    try {
      const reorderData = newOptions.map((opt, idx) => ({ id: opt.id, order: idx }));
      await apiService.reorderMaterialOptions(reorderData);
    } catch (error) {
      console.error("Error reordering options:", error);
    }
  };

  // --- Notes Techniques ---
  const generateKeyFromTitle = (title) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
      + '_' + Date.now();
  };

  const addNewNote = async () => {
    if (newNote.title.trim() && newNote.content.trim()) {
      try {
        setIsSaving(true);
        const generatedKey = generateKeyFromTitle(newNote.title.trim());
        const savedNote = await apiService.createTechnicalNote({
          key: generatedKey,
          title: newNote.title.trim(),
          content: newNote.content.trim()
        });
        setPredefinedNotes({ ...predefinedNotes, [generatedKey]: { title: newNote.title, content: newNote.content } });
        setOrderedNotes([...orderedNotes, savedNote]);
        setNewNote({ key: "", title: "", content: "" });
        toast.success("Note technique ajoutée et sauvegardée définitivement !");
      } catch (error) {
        console.error("Error adding note:", error);
        toast.error(error.message || "Erreur lors de l'ajout de la note");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deleteNote = async (noteKey) => {
    try {
      setIsSaving(true);
      await apiService.deleteTechnicalNote(noteKey);
      const updatedNotes = { ...predefinedNotes };
      delete updatedNotes[noteKey];
      setPredefinedNotes(updatedNotes);
      setOrderedNotes(orderedNotes.filter(n => n.key !== noteKey));
      toast.success("Note technique supprimée définitivement !");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Erreur lors de la suppression de la note");
    } finally {
      setIsSaving(false);
    }
  };

  const moveNote = async (index, direction) => {
    const newNotes = [...orderedNotes];
    if (direction === 'up' && index > 0) {
      [newNotes[index], newNotes[index - 1]] = [newNotes[index - 1], newNotes[index]];
    } else if (direction === 'down' && index < newNotes.length - 1) {
      [newNotes[index], newNotes[index + 1]] = [newNotes[index + 1], newNotes[index]];
    }
    setOrderedNotes(newNotes);
    try {
      const reorderData = newNotes.map((note, idx) => ({ key: note.key, order: idx }));
      await apiService.reorderTechnicalNotes(reorderData);
      const notesObj = {};
      newNotes.forEach(note => { notesObj[note.key] = { title: note.title, content: note.content }; });
      setPredefinedNotes(notesObj);
    } catch (error) {
      console.error("Error reordering notes:", error);
    }
  };

  const openEditModal = (key, note) => {
    setEditingNoteData({ key, title: note.title, content: note.content });
    setIsEditModalOpen(true);
  };

  const saveEditedNote = async () => {
    try {
      setIsSaving(true);
      await apiService.updateTechnicalNote(editingNoteData.key, {
        title: editingNoteData.title,
        content: editingNoteData.content
      });
      setPredefinedNotes({
        ...predefinedNotes,
        [editingNoteData.key]: { title: editingNoteData.title, content: editingNoteData.content }
      });
      setIsEditModalOpen(false);
      toast.success("Note technique modifiée et sauvegardée définitivement !");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Erreur lors de la modification de la note");
    } finally {
      setIsSaving(false);
    }
  };

  // --- PDF Notes ---
  const handlePdfUpload = async () => {
    if (!newPdfNote.file) return;
    try {
      setIsUploadingPdf(true);
      const saved = await apiService.createContractPdfNote(
        newPdfNote.title || newPdfNote.file.name,
        pdfNotes.length,
        newPdfNote.file
      );
      setPdfNotes([...pdfNotes, saved]);
      setNewPdfNote({ title: "", file: null });
      toast.success("Fichier PDF ajouté !");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error("Erreur lors de l'upload du PDF");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const deletePdfNote = async (id) => {
    try {
      await apiService.deleteContractPdfNote(id);
      setPdfNotes(pdfNotes.filter(n => n.id !== id));
      toast.success("PDF supprimé");
    } catch (error) {
      console.error("Error deleting PDF:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const movePdfNote = async (index, direction) => {
    const newNotes = [...pdfNotes];
    if (direction === 'up' && index > 0) {
      [newNotes[index], newNotes[index - 1]] = [newNotes[index - 1], newNotes[index]];
    } else if (direction === 'down' && index < newNotes.length - 1) {
      [newNotes[index], newNotes[index + 1]] = [newNotes[index + 1], newNotes[index]];
    }
    setPdfNotes(newNotes);
    try {
      await apiService.reorderContractPdfNotes(newNotes.map((n, i) => ({ id: n.id, order: i })));
    } catch (error) {
      console.error("Error reordering PDF notes:", error);
    }
  };

  // --- CGV Modèles ---
  const addNewCgv = async () => {
    if (newCgv.name.trim() && newCgv.content.trim()) {
      try {
        setIsSaving(true);
        const name = newCgv.name.trim();
        const key = generateKeyFromTitle(name);
        const updatedTemplates = { ...cgvTemplates, [key]: { content: newCgv.content } };
        await apiService.updateCgvTemplates(updatedTemplates);
        setCgvTemplates(updatedTemplates);
        setNewCgv({ name: "", content: "" });
        toast.success("Modèle de CGV ajouté !");
      } catch (error) {
        console.error("Error adding CGV:", error);
        toast.error("Erreur lors de l'ajout des CGV");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deleteCgv = async (key) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce modèle de CGV ?")) return;
    try {
      setIsSaving(true);
      const updatedTemplates = { ...cgvTemplates };
      delete updatedTemplates[key];
      await apiService.updateCgvTemplates(updatedTemplates);
      setCgvTemplates(updatedTemplates);
      toast.success("Modèle de CGV supprimé !");
    } catch (error) {
      console.error("Error deleting CGV:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsSaving(false);
    }
  };

  const openCgvEditModal = (key, cgv) => {
    setEditingCgvKey(key);
    setEditingCgvData({ name: key, content: cgv.content });
    setIsCgvModalOpen(true);
  };

  const saveEditedCgv = async () => {
    try {
      setIsSaving(true);
      const updatedTemplates = { ...cgvTemplates, [editingCgvKey]: { content: editingCgvData.content } };
      await apiService.updateCgvTemplates(updatedTemplates);
      setCgvTemplates(updatedTemplates);
      setIsCgvModalOpen(false);
      toast.success("Modèle de CGV mis à jour !");
    } catch (error) {
      console.error("Error updating CGV:", error);
      toast.error("Erreur lors de la modification");
    } finally {
      setIsSaving(false);
    }
  };

  const migrateToGcs = async () => {
    if (!window.confirm('Voulez-vous lancer la migration des anciens PDF de notes techniques vers Google Cloud Storage ?')) return;
    try {
      const resp = await fetch(`${apiService.BACKEND_URL || ''}/api/contract-pdf-notes/migrate-to-gcs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await resp.json();
      if (data.success) {
        if (data.message) {
            toast.success(data.message);
        } else {
            toast.success(`Migration réussie: ${data.migrated} PDF migrés.`);
        }
      }
    } catch (error) {
      console.error('Error migrating pdfs:', error);
      toast.error('Erreur lors de la migration.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" data-testid="configuration-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Configuration</h1>
            <p className="text-slate-600 mt-2">Gérez vos options matériel et notes techniques</p>
          </div>
          <div className="flex gap-2">
            <Button 
                onClick={migrateToGcs}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
                title="Migrer les PDF Notes vers GCS"
            >
                Migrer PDF GCS
            </Button>
            <Button 
              onClick={() => setShowConfiguration(false)}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="back-to-contracts-btn"
            >
              <FileText className="h-4 w-4" />
              <span>Retour aux contrats</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="options" className="flex items-center space-x-2">
              <Music className="h-4 w-4" />
              <span>Options Matériel</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Notes Techniques</span>
            </TabsTrigger>
            <TabsTrigger value="pdf_notes" className="flex items-center space-x-2">
              <UploadCloud className="h-4 w-4" />
              <span>PDF Notes Techniques</span>
            </TabsTrigger>
            <TabsTrigger value="cgv" className="flex items-center space-x-2">
              <FileCheck className="h-4 w-4" />
              <span>Modèles CGV</span>
            </TabsTrigger>
          </TabsList>

          {/* Options Matériel */}
          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Options Matériel</CardTitle>
                <CardDescription>Ajoutez, modifiez ou supprimez les options d'équipement disponibles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {selectedOptions.map((option, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                      <div className="flex-1">
                        {editingOptionIndex === index ? (
                          <div className="flex flex-col space-y-3 flex-1 mr-4">
                            <div className="flex items-center space-x-4">
                              <Input value={option.name} onChange={(e) => { const updated = [...selectedOptions]; updated[index].name = e.target.value; setSelectedOptions(updated); }} className="flex-1" />
                              <Input type="number" value={option.price} onChange={(e) => { const updated = [...selectedOptions]; updated[index].price = parseFloat(e.target.value) || 0; setSelectedOptions(updated); }} className="w-24" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Afficher pour (vide = tous) :</Label>
                              <div className="flex flex-wrap gap-2">
                                {EVENT_CATEGORIES.map(cat => (
                                  <label key={cat} className="flex items-center space-x-1 border px-2 py-0.5 rounded bg-slate-50 cursor-pointer">
                                    <input type="checkbox" className="w-3 h-3 text-blue-600" checked={(option.event_categories || []).includes(cat)} onChange={(e) => {
                                      const updated = [...selectedOptions];
                                      let cats = [...(updated[index].event_categories || [])];
                                      if (e.target.checked) cats.push(cat); else cats = cats.filter(c => c !== cat);
                                      updated[index].event_categories = cats;
                                      setSelectedOptions(updated);
                                    }} />
                                    <span className="text-xs">{cat}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Button onClick={() => saveEditedOption(index)} size="sm" variant="outline" disabled={isSaving}>{isSaving ? "..." : "Valider"}</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{option.name}</h3>
                              <p className="text-sm text-slate-600">{option.price}€</p>
                              {(option.event_categories && option.event_categories.length > 0) && (
                                <p className="text-xs text-blue-600 mt-1">Limité à : {option.event_categories.join(', ')}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 self-start mt-2">
                        <Button onClick={() => moveOption(index, 'up')} disabled={index === 0 || isSaving} size="sm" variant="ghost"><ChevronUp className="h-4 w-4" /></Button>
                        <Button onClick={() => moveOption(index, 'down')} disabled={index === selectedOptions.length - 1 || isSaving} size="sm" variant="ghost"><ChevronDown className="h-4 w-4" /></Button>
                        <Button onClick={() => setEditingOptionIndex(editingOptionIndex === index ? null : index)} size="sm" variant="outline" disabled={isSaving}><Edit className="h-4 w-4" /></Button>
                        <Button onClick={() => deleteOption(index)} size="sm" variant="destructive" disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Ajouter une nouvelle option</h3>
                  <p className="text-sm text-green-600 mb-3">Les options ajoutées sont sauvegardées définitivement</p>
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-4">
                      <Input placeholder="Nom de l'option" value={newOption.name} onChange={(e) => setNewOption({...newOption, name: e.target.value})} className="flex-1" disabled={isSaving} />
                      <Input type="number" placeholder="Prix" value={newOption.price} onChange={(e) => setNewOption({...newOption, price: parseFloat(e.target.value) || 0})} className="w-24" disabled={isSaving} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700 font-medium">Afficher pour l'événement : (Laisser vide pour tous)</Label>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_CATEGORIES.map(cat => (
                          <label key={cat} className="flex items-center space-x-1 border px-2 py-1 rounded bg-slate-50 cursor-pointer">
                            <input type="checkbox" className="w-3 h-3 text-blue-600" checked={(newOption.event_categories || []).includes(cat)} onChange={(e) => {
                              let cats = [...(newOption.event_categories || [])];
                              if (e.target.checked) cats.push(cat); else cats = cats.filter(c => c !== cat);
                              setNewOption({...newOption, event_categories: cats});
                            }} />
                            <span className="text-xs">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Button onClick={addNewOption} disabled={!newOption.name.trim() || isSaving}>
                        <Plus className="h-4 w-4 mr-2" />{isSaving ? "Ajout..." : "Ajouter"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Techniques */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Notes Techniques</CardTitle>
                <CardDescription>Ajoutez, modifiez, réorganisez ou supprimez les notes techniques prédéfinies</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-600 mb-4">Les notes ajoutées sont sauvegardées définitivement. Utilisez les flèches pour réorganiser l'ordre.</p>
                <div className="space-y-4 mb-6">
                  {orderedNotes.map((note, index) => (
                    <div key={note.key} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                      <div className="flex-1">
                        <h3 className="font-medium">{note.title}</h3>
                        <div className="text-sm text-slate-600 mt-1">
                          {note.content.replace(/\)\}/g, '').replace(/\}+/g, '').replace(/\)+$/g, '').split('\n').slice(0, 2).join(' ').trim().substring(0, 100)}...
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => moveNote(index, 'up')} disabled={index === 0 || isSaving} size="sm" variant="ghost"><ChevronUp className="h-4 w-4" /></Button>
                        <Button onClick={() => moveNote(index, 'down')} disabled={index === orderedNotes.length - 1 || isSaving} size="sm" variant="ghost"><ChevronDown className="h-4 w-4" /></Button>
                        <Button onClick={() => openEditModal(note.key, note)} size="sm" variant="outline" disabled={isSaving}><Edit className="h-4 w-4" /></Button>
                        <Button onClick={() => deleteNote(note.key)} size="sm" variant="destructive" disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Ajouter une nouvelle note technique</h3>
                  <div className="space-y-4">
                    <Input value={newNote.title} onChange={(e) => setNewNote({...newNote, title: e.target.value})} disabled={isSaving} />
                    <Textarea value={newNote.content} onChange={(e) => setNewNote({...newNote, content: e.target.value})} rows={6} disabled={isSaving} />
                    <Button onClick={addNewNote} disabled={!newNote.title.trim() || !newNote.content.trim() || isSaving}>
                      <Plus className="h-4 w-4 mr-2" />{isSaving ? "Ajout en cours..." : "Ajouter la note"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PDF Notes Techniques */}
          <TabsContent value="pdf_notes">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des PDF Notes Techniques</CardTitle>
                <CardDescription>Uploadez vos infographies PDF et organisez leur ordre de compilation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {/* Item par défaut (Déroulement de soirée) */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200">
                    <div className="flex items-center space-x-3">
                      <FileDown className="h-5 w-5 text-orange-500" />
                      <div>
                        <h3 className="font-medium text-orange-900">Déroulement de soirée</h3>
                        <p className="text-xs text-orange-700">Inclus par défaut (Généré dynamiquement)</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Système</Badge>
                  </div>

                  {pdfNotes.map((note, index) => (
                    <div key={note.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <h3 className="font-medium text-slate-800">{note.title}</h3>
                          <p className="text-xs text-slate-500">{note.filename}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => movePdfNote(index, 'up')} disabled={index === 0} size="sm" variant="ghost">
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => movePdfNote(index, 'down')} disabled={index === pdfNotes.length - 1} size="sm" variant="ghost">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => deletePdfNote(note.id)} size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Uploader un nouveau PDF</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Titre du PDF</Label>
                      <Input 
                        placeholder="Ex: Guide Photobooth" 
                        value={newPdfNote.title}
                        onChange={(e) => setNewPdfNote({...newPdfNote, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fichier PDF</Label>
                      <div className="flex space-x-2">
                        <Input 
                          type="file" 
                          accept="application/pdf"
                          onChange={(e) => setNewPdfNote({...newPdfNote, file: e.target.files[0]})}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handlePdfUpload} 
                          disabled={!newPdfNote.file || isUploadingPdf}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isUploadingPdf ? "..." : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modèles CGV */}
          <TabsContent value="cgv">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Modèles CGV</CardTitle>
                <CardDescription>Gérez les différentes conditions générales de vente pour vos types d'événements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {Object.entries(cgvTemplates || {}).map(([key, cgv]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-800 capitalize">{key.replace(/_/g, ' ')}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{cgv.content.substring(0, 100)}...</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => openCgvEditModal(key, cgv)} size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => deleteCgv(key)} size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {Object.keys(cgvTemplates || {}).length === 0 && (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                      Aucun modèle de CGV configuré
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Ajouter un nouveau modèle de CGV</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nom du modèle (ex: Mariage, Entreprise...)</Label>
                      <Input 
                        placeholder="Nom du modèle" 
                        value={newCgv.name}
                        onChange={(e) => setNewCgv({...newCgv, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contenu des CGV</Label>
                      <Textarea 
                        placeholder="Texte des conditions générales de vente..." 
                        rows={10}
                        value={newCgv.content}
                        onChange={(e) => setNewCgv({...newCgv, content: e.target.value})}
                      />
                    </div>
                    <Button 
                      onClick={addNewCgv} 
                      disabled={!newCgv.name.trim() || !newCgv.content.trim() || isSaving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? "Ajout..." : <><Plus className="h-4 w-4 mr-2" />Ajouter le modèle</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal d'édition CGV */}
        <Dialog open={isCgvModalOpen} onOpenChange={setIsCgvModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le modèle CGV : {editingCgvKey?.replace(/_/g, ' ')}</DialogTitle>
              <DialogDescription>Modifiez le contenu de vos conditions générales de vente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cgv-content">Contenu des CGV</Label>
                <Textarea id="cgv-content" value={editingCgvData.content} onChange={(e) => setEditingCgvData({...editingCgvData, content: e.target.value})} rows={18} disabled={isSaving} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCgvModalOpen(false)} disabled={isSaving}>Annuler</Button>
              <Button onClick={saveEditedCgv} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />{isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal d'édition */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier la note technique</DialogTitle>
              <DialogDescription>Modifiez le titre et le contenu de la note technique. Les changements seront sauvegardés définitivement.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Titre de la note</Label>
                <Input id="edit-title" value={editingNoteData.title} onChange={(e) => setEditingNoteData({...editingNoteData, title: e.target.value})} disabled={isSaving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Contenu de la note</Label>
                <Textarea id="edit-content" value={editingNoteData.content} onChange={(e) => setEditingNoteData({...editingNoteData, content: e.target.value})} rows={12} disabled={isSaving} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingNoteData({ key: "", title: "", content: "" }); }} disabled={isSaving}>Annuler</Button>
              <Button onClick={saveEditedNote} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />{isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
