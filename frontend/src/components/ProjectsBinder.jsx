import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  FolderKanban, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  Flame, 
  GripVertical, 
  X, 
  FolderPlus, 
  CheckCircle2, 
  Circle,
  RefreshCw,
  Palette,
  Sparkles,
  ChevronRight,
  ListTodo,
  CheckCheck
} from 'lucide-react';
import axios from '../services/axiosConfig';
import { toast } from 'sonner';
import API_BASE_URL from '../utils/apiUrl';

const API = `${API_BASE_URL}/api`;

const COLOR_PALETTES = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-500', tabActive: 'border-t-indigo-600 text-indigo-900', badge: 'bg-indigo-100 text-indigo-800' },
  { id: 'emerald', name: 'Émeraude', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500', tabActive: 'border-t-emerald-600 text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'purple', name: 'Violet', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-500', tabActive: 'border-t-purple-600 text-purple-900', badge: 'bg-purple-100 text-purple-800' },
  { id: 'blue', name: 'Bleu', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-500', tabActive: 'border-t-blue-600 text-blue-900', badge: 'bg-blue-100 text-blue-800' },
  { id: 'amber', name: 'Ambre', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-500', tabActive: 'border-t-amber-600 text-amber-900', badge: 'bg-amber-100 text-amber-800' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-500', tabActive: 'border-t-rose-600 text-rose-900', badge: 'bg-rose-100 text-rose-800' }
];

const getColorConfig = (colorId) => {
  return COLOR_PALETTES.find(c => c.id === colorId) || COLOR_PALETTES[0];
};

const ProjectsBinder = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState(null);

  // New project dialog state
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("indigo");

  // Edit project dialog state
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectColor, setEditProjectColor] = useState("indigo");

  // Delete project confirmation state
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Add task state
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskUrgent, setNewTaskUrgent] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Edit task state
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskText, setEditTaskText] = useState("");
  const [editTaskUrgent, setEditTaskUrgent] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);

  // Drag and drop state for tasks
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const [dragPosition, setDragPosition] = useState(null); // 'before' | 'after'

  // Drag and drop state for project tabs
  const [draggingProjectId, setDraggingProjectId] = useState(null);
  const [dragOverProjectId, setDragOverProjectId] = useState(null);
  const [dragProjectPosition, setDragProjectPosition] = useState(null); // 'before' | 'after'

  const tabsContainerRef = useRef(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/projects`);
      const fetchedProjects = res.data || [];
      setProjects(fetchedProjects);

      // Restore previously selected active project if exists
      const savedActiveId = localStorage.getItem('active_project_id');
      if (savedActiveId && fetchedProjects.some(p => p.id === savedActiveId)) {
        setActiveProjectId(savedActiveId);
      } else if (fetchedProjects.length > 0) {
        setActiveProjectId(fetchedProjects[0].id);
        localStorage.setItem('active_project_id', fetchedProjects[0].id);
      } else {
        setActiveProjectId(null);
      }
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.error("Error loading projects:", err);
        toast.error("Erreur lors du chargement des projets");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
    localStorage.setItem('active_project_id', projectId);
  };

  // ══════════ PROJET : CREATION / MODIFICATION / SUPPRESSION ══════════

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Veuillez saisir un nom de projet");
      return;
    }

    try {
      const res = await axios.post(`${API}/projects`, {
        name: newProjectName.trim(),
        color: newProjectColor
      });

      const created = res.data;
      setProjects(prev => [...prev, created]);
      setActiveProjectId(created.id);
      localStorage.setItem('active_project_id', created.id);

      setShowNewProjectDialog(false);
      setNewProjectName("");
      setNewProjectColor("indigo");
      toast.success(`Projet « ${created.name} » créé !`);

      // Scroll tabs to the end
      setTimeout(() => {
        if (tabsContainerRef.current) {
          tabsContainerRef.current.scrollLeft = tabsContainerRef.current.scrollWidth;
        }
      }, 100);
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Erreur lors de la création du projet");
    }
  };

  const handleOpenEditProject = (project, e) => {
    if (e) e.stopPropagation();
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectColor(project.color || 'indigo');
    setShowEditProjectDialog(true);
  };

  const handleSaveEditProject = async () => {
    if (!editProjectName.trim() || !editingProject) return;

    try {
      const res = await axios.put(`${API}/projects/${editingProject.id}`, {
        name: editProjectName.trim(),
        color: editProjectColor
      });

      const updated = res.data;
      setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      setShowEditProjectDialog(false);
      setEditingProject(null);
      toast.success("Projet mis à jour !");
    } catch (err) {
      console.error("Error updating project:", err);
      toast.error("Erreur lors de la modification du projet");
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;

    const deletingId = projectToDelete.id;
    try {
      await axios.delete(`${API}/projects/${deletingId}`);
      
      const remaining = projects.filter(p => p.id !== deletingId);
      setProjects(remaining);

      if (activeProjectId === deletingId) {
        const nextActive = remaining.length > 0 ? remaining[0].id : null;
        setActiveProjectId(nextActive);
        if (nextActive) localStorage.setItem('active_project_id', nextActive);
        else localStorage.removeItem('active_project_id');
      }

      setProjectToDelete(null);
      toast.success("Projet supprimé");
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  // ══════════ TACHES DU PROJET ACTIF ══════════

  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const projectTasks = activeProject?.tasks || [];

  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    if (!newTaskText.trim() || !activeProjectId) return;

    setIsAddingTask(true);
    try {
      const res = await axios.post(`${API}/projects/${activeProjectId}/tasks`, {
        text: newTaskText.trim(),
        is_urgent: newTaskUrgent
      });

      const createdTask = res.data;
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            tasks: [...(p.tasks || []), createdTask]
          };
        }
        return p;
      }));

      setNewTaskText("");
      setNewTaskUrgent(false);
      toast.success(newTaskUrgent ? "Tâche urgente ajoutée au projet !" : "Tâche ajoutée au projet !");
    } catch (err) {
      console.error("Error adding task to project:", err);
      toast.error("Erreur lors de l'ajout de la tâche");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleToggleTask = async (task) => {
    const updatedCompleted = !task.completed;

    // Optimistic update
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          tasks: (p.tasks || []).map(t => t.id === task.id ? { ...t, completed: updatedCompleted } : t)
        };
      }
      return p;
    }));

    try {
      await axios.put(`${API}/projects/tasks/${task.id}`, { completed: updatedCompleted });
    } catch (err) {
      console.error("Error toggling task:", err);
      toast.error("Impossible de modifier la tâche");
      loadProjects(); // Revert
    }
  };

  const handleToggleUrgent = async (task, e) => {
    if (e) e.stopPropagation();
    const newUrgent = !task.is_urgent;

    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          tasks: (p.tasks || []).map(t => t.id === task.id ? { ...t, is_urgent: newUrgent } : t)
        };
      }
      return p;
    }));

    try {
      await axios.put(`${API}/projects/tasks/${task.id}`, { is_urgent: newUrgent });
      if (newUrgent) {
        toast.error("Tâche marquée comme urgente");
      } else {
        toast.info("Statut urgent retiré");
      }
    } catch (err) {
      console.error("Error toggling urgent:", err);
      toast.error("Impossible de modifier le statut d'urgence");
      loadProjects();
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    if (e) e.stopPropagation();

    // Optimistic update
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          tasks: (p.tasks || []).filter(t => t.id !== taskId)
        };
      }
      return p;
    }));

    try {
      await axios.delete(`${API}/projects/tasks/${taskId}`);
      toast.success("Tâche supprimée");
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Erreur lors de la suppression de la tâche");
      loadProjects();
    }
  };

  const handleOpenEditTask = (task, e) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setEditTaskText(task.text);
    setEditTaskUrgent(!!task.is_urgent);
    setShowEditTaskDialog(true);
  };

  const handleSaveEditTask = async () => {
    if (!editTaskText.trim() || !editingTask) return;

    try {
      const res = await axios.put(`${API}/projects/tasks/${editingTask.id}`, {
        text: editTaskText.trim(),
        is_urgent: editTaskUrgent
      });

      const updated = res.data;
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            tasks: (p.tasks || []).map(t => t.id === updated.id ? { ...t, ...updated } : t)
          };
        }
        return p;
      }));

      setShowEditTaskDialog(false);
      setEditingTask(null);
      toast.success("Tâche modifiée");
    } catch (err) {
      console.error("Error saving task edit:", err);
      toast.error("Erreur lors de la modification");
    }
  };

  const handleToggleAllTasks = async (completed) => {
    if (!activeProjectId || projectTasks.length === 0) return;

    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          tasks: (p.tasks || []).map(t => ({ ...t, completed }))
        };
      }
      return p;
    }));

    try {
      await axios.post(`${API}/projects/${activeProjectId}/tasks/toggle-all`, { completed });
      toast.success(completed ? "Toutes les tâches marquées comme faites !" : "Toutes les tâches remises à faire !");
    } catch (err) {
      console.error("Error toggling all tasks:", err);
      toast.error("Erreur lors de la mise à jour");
      loadProjects();
    }
  };

  // Drag and drop task reordering
  const handleDropOnTask = async (e, targetTask, position) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceTaskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);
    setDragOverTaskId(null);
    setDragPosition(null);

    if (!sourceTaskId || sourceTaskId === targetTask.id || !activeProjectId) return;

    const currentTasks = [...projectTasks];
    const sourceIndex = currentTasks.findIndex(t => t.id === sourceTaskId);
    const targetIndex = currentTasks.findIndex(t => t.id === targetTask.id);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedTask] = currentTasks.splice(sourceIndex, 1);
    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    currentTasks.splice(insertIndex, 0, movedTask);

    const reordered = currentTasks.map((t, idx) => ({ ...t, order: idx }));

    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, tasks: reordered };
      }
      return p;
    }));

    try {
      await axios.post(`${API}/projects/${activeProjectId}/tasks/reorder`, {
        items: reordered.map(t => ({ id: t.id, order: t.order }))
      });
    } catch (err) {
      console.error("Error reordering tasks:", err);
      toast.error("Impossible de réordonner les tâches");
      loadProjects();
    }
  };

  // Drag and drop project tab reordering
  const handleDropOnProjectTab = async (e, targetProject, position) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceProjectId = e.dataTransfer.getData('text/plain') || draggingProjectId;
    setDraggingProjectId(null);
    setDragOverProjectId(null);
    setDragProjectPosition(null);

    if (!sourceProjectId || sourceProjectId === targetProject.id) return;

    const currentProjects = [...projects];
    const sourceIndex = currentProjects.findIndex(p => p.id === sourceProjectId);
    const targetIndex = currentProjects.findIndex(p => p.id === targetProject.id);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedProject] = currentProjects.splice(sourceIndex, 1);
    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    currentProjects.splice(insertIndex, 0, movedProject);

    const reordered = currentProjects.map((p, idx) => ({ ...p, order: idx }));
    setProjects(reordered);

    try {
      await axios.post(`${API}/projects/reorder`, {
        items: reordered.map(p => ({ id: p.id, order: p.order }))
      });
      toast.success("Ordre des onglets mis à jour !");
    } catch (err) {
      console.error("Error reordering projects:", err);
      toast.error("Impossible de réordonner les projets");
      loadProjects();
    }
  };

  const activeColorConfig = getColorConfig(activeProject?.color);
  const completedTasksCount = projectTasks.filter(t => t.completed).length;

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pb-16">
      <Card className="w-full border border-slate-200/90 bg-white/95 backdrop-blur shadow-sm rounded-2xl overflow-hidden">
        
        {/* Card Header : Titre épuré & Bouton Nouveau Projet */}
        <CardHeader className="py-4 px-4 sm:px-6 md:px-8 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/70">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2.5 text-slate-800">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <FolderKanban className="w-5 h-5" />
              </div>
              <span>Classeur de Projets</span>
            </CardTitle>

            <Button
              size="sm"
              onClick={() => {
                setNewProjectName("");
                setNewProjectColor("indigo");
                setShowNewProjectDialog(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5 shadow-sm rounded-xl px-3.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Projet</span>
            </Button>
          </div>
        </CardHeader>

        {/* ══════════ BARRE D'ONGLETS STYLE NAVIGATEUR INTERNET ══════════ */}
        <div className="bg-slate-200/60 border-b border-slate-200 pt-3 px-3 sm:px-6 md:px-8 overflow-hidden">
          <div 
            ref={tabsContainerRef}
            className="flex items-end gap-2 overflow-x-auto overflow-y-hidden min-h-[52px] scrollbar-thin scrollbar-thumb-slate-300 pb-0"
            style={{ scrollbarWidth: 'thin', overflowY: 'hidden' }}
          >
            {loading ? (
              <div className="py-2.5 px-4 text-xs text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Chargement des projets...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="py-2.5 text-xs text-slate-500 italic">
                Aucun projet pour le moment. Cliquez sur « + » pour créer votre premier projet !
              </div>
            ) : (
              projects.map(project => {
                const isActive = project.id === activeProjectId;
                const pColor = getColorConfig(project.color);
                const pTasks = project.tasks || [];
                const pDone = pTasks.filter(t => t.completed).length;
                const isDraggingThis = draggingProjectId === project.id;
                const isOverThis = dragOverProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', project.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingProjectId(project.id);
                    }}
                    onDragEnd={() => {
                      setDraggingProjectId(null);
                      setDragOverProjectId(null);
                      setDragProjectPosition(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mid = rect.left + rect.width / 2;
                      const pos = e.clientX < mid ? 'before' : 'after';
                      setDragOverProjectId(project.id);
                      setDragProjectPosition(pos);
                    }}
                    onDrop={(e) => handleDropOnProjectTab(e, project, dragProjectPosition)}
                    onClick={() => handleSelectProject(project.id)}
                    className={`group relative flex items-center gap-2 py-2.5 px-3.5 rounded-t-xl text-xs sm:text-sm font-semibold select-none cursor-grab active:cursor-grabbing transition-all duration-150 border-t-2 border-l border-r shrink-0 max-w-[260px] ${
                      isOverThis && dragProjectPosition === 'before' ? 'ring-2 ring-indigo-500 ring-offset-1 -translate-x-0.5' : ''
                    } ${
                      isOverThis && dragProjectPosition === 'after' ? 'ring-2 ring-indigo-500 ring-offset-1 translate-x-0.5' : ''
                    } ${
                      isDraggingThis
                        ? 'opacity-30 border-dashed border-indigo-400 bg-indigo-50/50'
                        : isActive
                          ? `bg-white ${pColor.tabActive} border-l-slate-300 border-r-slate-300 shadow-xs z-10 -mb-[1px] pb-3`
                          : 'bg-slate-100/80 hover:bg-slate-100 text-slate-600 border-t-transparent border-l-slate-200/60 border-r-slate-200/60 hover:text-slate-800'
                    }`}
                    title={`${project.name} (Glisser pour réorganiser la priorité)`}
                  >
                    {/* Poignée de drag */}
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />

                    {/* Indicateur de couleur */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${pColor.border.replace('border-', 'bg-')}`} />

                    {/* Nom du projet tronqué proprement */}
                    <span className="truncate max-w-[140px]">
                      {project.name}
                    </span>

                    {/* Badge compteur de tâches */}
                    <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      isActive ? pColor.badge : 'bg-slate-200/70 text-slate-600'
                    }`}>
                      {pDone}/{pTasks.length}
                    </span>

                    {/* Actions de l'onglet (Modifier & Supprimer) */}
                    <div className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditProject(project, e)}
                        className="p-1 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Renommer / Modifier"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                        className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Fermer / Supprimer le projet"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Bouton '+' Nouvel Onglet (Comme dans un navigateur internet) */}
            <button
              type="button"
              onClick={() => {
                setNewProjectName("");
                setNewProjectColor("indigo");
                setShowNewProjectDialog(true);
              }}
              className="h-9 w-9 mb-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white/80 transition-all cursor-pointer flex items-center justify-center shrink-0 border border-dashed border-slate-300 hover:border-indigo-400"
              title="Ouvrir un nouvel onglet de projet"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════════ CONTENU DE L'ONGLET ACTIF (CLASSEUR) ══════════ */}
        <CardContent className="p-4 sm:p-6 md:p-8 bg-white min-h-[350px]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Chargement des données du projet...</p>
            </div>
          ) : !activeProject ? (
            <div className="py-16 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                <FolderPlus className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Aucun projet sélectionné</h3>
              <p className="text-xs text-slate-500 mb-5">
                Créez un nouveau projet pour commencer à organiser vos tâches et objectifs dans votre classeur.
              </p>
              <Button
                onClick={() => {
                  setNewProjectName("");
                  setNewProjectColor("indigo");
                  setShowNewProjectDialog(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Créer mon premier projet</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* En-tête du projet actif */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800">
                      {activeProject.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditProject(activeProject, e)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Renommer le projet ou changer de couleur"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{projectTasks.length} {projectTasks.length > 1 ? "tâches" : "tâche"}</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-600">{completedTasksCount} terminée(s)</span>
                  </p>
                </div>

                {/* Actions globales sur le projet actif */}
                <div className="flex items-center gap-2 flex-wrap">
                  {projectTasks.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAllTasks(completedTasksCount !== projectTasks.length)}
                      className="text-xs gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      title={completedTasksCount === projectTasks.length ? "Tout décocher" : "Tout cocher comme fait"}
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{completedTasksCount === projectTasks.length ? "Tout décocher" : "Tout cocher"}</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectToDelete(activeProject)}
                    className="text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 cursor-pointer"
                    title="Supprimer ce projet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </Button>
                </div>
              </div>

              {/* Liste des tâches du projet */}
              <div className="space-y-2 pt-1">
                {projectTasks.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/40">
                    <ListTodo className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">
                      Aucune tâche dans ce projet pour le moment.
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ajoutez votre première étape ou tâche via le champ ci-dessous.
                    </p>
                  </div>
                ) : (
                  projectTasks.map((task, index) => {
                    const isUrgent = !!task.is_urgent;
                    const isOverThisTask = dragOverTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setDragOverTaskId(null);
                          setDragPosition(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const mid = rect.top + rect.height / 2;
                          const pos = e.clientY < mid ? 'before' : 'after';
                          setDragOverTaskId(task.id);
                          setDragPosition(pos);
                        }}
                        onDrop={(e) => handleDropOnTask(e, task, dragPosition)}
                        className={`group relative flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all cursor-grab active:cursor-grabbing ${
                          isOverThisTask && dragPosition === 'before' ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                        } ${
                          isOverThisTask && dragPosition === 'after' ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                        } ${
                          draggingTaskId === task.id
                            ? 'opacity-30 border-dashed border-indigo-400 bg-indigo-50/40'
                            : isUrgent
                              ? task.completed
                                ? 'bg-red-900/90 border-red-950 text-white/75 line-through font-bold shadow-xs'
                                : 'bg-red-600 border-red-700 text-white font-bold shadow-md ring-1 ring-red-500/50'
                              : task.completed
                                ? 'bg-slate-50 border-slate-150 text-slate-400 line-through'
                                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50/70 hover:shadow-xs'
                        }`}
                      >
                        {/* Poignée de drag & drop */}
                        <div 
                          className={`pt-0.5 shrink-0 select-none ${
                            isUrgent && !task.completed ? 'text-white/60 group-hover:text-white' : 'text-slate-300 group-hover:text-slate-500'
                          }`}
                          title="Glisser pour réordonner"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            isUrgent
                              ? task.completed
                                ? 'bg-white border-white text-red-700 font-extrabold'
                                : 'border-white/80 bg-red-700/60 hover:bg-white/20 text-white'
                              : task.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/30'
                          }`}
                          title={task.completed ? "Marquer comme à faire" : "Marquer comme fait"}
                        >
                          {task.completed && <Check className={`w-3.5 h-3.5 stroke-[3] ${isUrgent ? 'text-red-700' : 'text-white'}`} />}
                        </button>

                        {/* Texte de la tâche */}
                        <span className={`flex-1 text-sm leading-relaxed break-words select-none ${
                          isUrgent ? 'text-white font-bold' : ''
                        }`}>
                          {task.text}
                        </span>

                        {/* Actions : Urgence, Édition, Suppression */}
                        <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {/* Bouton Urgence */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleUrgent(task, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isUrgent
                                ? 'text-yellow-300 hover:text-white hover:bg-red-700/60'
                                : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                            }`}
                            title={isUrgent ? "Retirer l'urgence" : "Marquer comme urgent (fond rouge vif)"}
                          >
                            <Flame className={`w-4 h-4 ${isUrgent ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                          </button>

                          {/* Modifier */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditTask(task, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isUrgent ? 'text-white/80 hover:text-white hover:bg-red-700/60' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                            }`}
                            title="Modifier la tâche"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Supprimer */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isUrgent ? 'text-white/80 hover:text-white hover:bg-red-700/60' : 'text-slate-400 hover:text-red-600 hover:bg-slate-100'
                            }`}
                            title="Supprimer la tâche"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formulaire d'ajout rapide d'une étape ou tâche (positionné en bas) */}
              <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/90 mt-4 shadow-2xs">
                <div className="flex-1 flex items-center gap-2 bg-white px-3.5 py-2 rounded-lg border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 shadow-xs">
                  <Input
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder={`Ajouter une étape ou tâche à « ${activeProject.name} »...`}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 h-7 bg-transparent"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Bouton Urgence */}
                  <button
                    type="button"
                    onClick={() => setNewTaskUrgent(prev => !prev)}
                    className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      newTaskUrgent
                        ? 'bg-red-600 border-red-700 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title={newTaskUrgent ? "Urgence activée (fond rouge vif)" : "Marquer comme urgent"}
                  >
                    <Flame className={`w-3.5 h-3.5 ${newTaskUrgent ? 'fill-white text-white' : 'text-red-500'}`} />
                    <span>Urgent</span>
                  </button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newTaskText.trim() || isAddingTask}
                    className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 rounded-lg px-4 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </Button>
                </div>
              </form>

            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════ DIALOG NOUVEAU PROJET ══════════ */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 text-lg font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-600" />
              <span>Nouveau Projet (Onglet)</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Donnez un titre à ce nouveau projet. Vous pourrez y ajouter toutes les tâches nécessaires.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newProjectName" className="text-slate-700 font-semibold text-xs">Nom du projet *</Label>
              <Input
                id="newProjectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Ex: Refonte Site Web, Orga Soirée Gala, Matériel Son..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                }}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-xs flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>Couleur de l'onglet</span>
              </Label>
              <div className="flex items-center gap-2 pt-1">
                {COLOR_PALETTES.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setNewProjectColor(color.id)}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${color.border.replace('border-', 'bg-')} ${
                      newProjectColor === color.id ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                    title={color.name}
                  >
                    {newProjectColor === color.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewProjectDialog(false)}
              className="text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Créer le projet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG MODIFIER PROJET ══════════ */}
      <Dialog open={showEditProjectDialog} onOpenChange={setShowEditProjectDialog}>
        <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 text-lg font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-600" />
              <span>Modifier le projet</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Changez le nom de l'onglet ou sa couleur d'accentuation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editProjectName" className="text-slate-700 font-semibold text-xs">Nom du projet *</Label>
              <Input
                id="editProjectName"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                placeholder="Ex: Refonte Site Web..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEditProject();
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-xs flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>Couleur de l'onglet</span>
              </Label>
              <div className="flex items-center gap-2 pt-1">
                {COLOR_PALETTES.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setEditProjectColor(color.id)}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${color.border.replace('border-', 'bg-')} ${
                      editProjectColor === color.id ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                    title={color.name}
                  >
                    {editProjectColor === color.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowEditProjectDialog(false);
                setEditingProject(null);
              }}
              className="text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditProject}
              disabled={!editProjectName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG CONFIRMATION SUPPRESSION PROJET ══════════ */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-700 text-lg font-bold flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Supprimer le projet ?</span>
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-xs pt-1">
              Êtes-vous sûr de vouloir supprimer le projet <strong>« {projectToDelete?.name} »</strong> et ses {projectToDelete?.tasks?.length || 0} tâche(s) associée(s) ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProjectToDelete(null)}
              className="text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDeleteProject}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOG MODIFIER TACHE ══════════ */}
      <Dialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog}>
        <DialogContent className="max-w-sm sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 text-lg font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-600" />
              <span>Modifier la tâche</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Mettez à jour le libellé et le degré d'urgence de la tâche.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="projectEditTaskText" className="text-slate-700 font-semibold text-xs">Texte de la tâche *</Label>
              <Input
                id="projectEditTaskText"
                value={editTaskText}
                onChange={(e) => setEditTaskText(e.target.value)}
                placeholder="Ex: Préparer le cahier des charges..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEditTask();
                }}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setEditTaskUrgent(prev => !prev)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  editTaskUrgent
                    ? 'bg-red-600 border-red-700 text-white shadow-sm ring-1 ring-red-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Flame className={`w-4 h-4 ${editTaskUrgent ? 'fill-white text-white' : 'text-red-500'}`} />
                <span>{editTaskUrgent ? 'Tâche URGENTE activée (fond rouge vif)' : 'Définir comme tâche urgente'}</span>
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowEditTaskDialog(false);
                setEditingTask(null);
              }}
              className="text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditTask}
              disabled={!editTaskText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ProjectsBinder;
