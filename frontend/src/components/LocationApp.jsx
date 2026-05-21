import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarIcon, Package, Users, FileText, BarChart3, Headphones, BookOpen, Settings, Target, Archive, ChevronLeft, ChevronRight, Send, Truck, Calendar as CalendarIcon2 } from 'lucide-react';
import { Toaster } from './ui/sonner';
import { API, axios } from './location/helpers';

// Views extraites
import AgendaView from './location/AgendaView';
import MaterielView from './location/MaterielView';
import ClientsView from './location/ClientsView';
import DJsView from './location/DJsView';
import DevisView from './location/DevisView';
import EnvoiView from './location/EnvoiView';
import ReservationsViewIntegrated from './location/ReservationsViewIntegrated';
import LivraisonsView from './location/LivraisonsView';
import ArchivesView from './location/ArchivesView';
import AnalyseView from './location/AnalyseView';
import CatalogueView from './location/CatalogueView';
import ParametresView from './location/ParametresView';

function LocationApp() {
  const [searchParams] = useSearchParams();
  
  const [currentView, setCurrentView] = useState(() => {
    const viewParam = searchParams.get('view');
    if (viewParam) return viewParam;
    const savedView = localStorage.getItem('locationCurrentView');
    return savedView || 'agenda';
  });

  const [stats, setStats] = useState({ active_reservations: 0, pending_quotes: 0 });
  
  useEffect(() => { localStorage.setItem('locationCurrentView', currentView); }, [currentView]);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const [showAddReservationModal, setShowAddReservationModal] = useState(false);

  const handleAddReservationClick = () => { setCurrentView('agenda'); };

  useEffect(() => { 
    fetchDashboardStats(); 
    fetchGcsSettings();
  }, []);

  const fetchGcsSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/gcs`);
      if (response.data && response.data.gcs_use_direct_urls !== undefined) {
        localStorage.setItem('gcs_use_direct_urls', response.data.gcs_use_direct_urls ? 'true' : 'false');
      }
    } catch (error) {
      console.error('Error fetching GCS settings at startup:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try { const response = await axios.get(`${API}/dashboard`); setStats(response.data); }
    catch (error) { console.error('Error fetching dashboard stats:', error); }
  };
  
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

  const navItems = [
    { key: 'agenda', icon: CalendarIcon2, label: 'Agenda' },
    { key: 'materiel', icon: Package, label: 'Matériel', testId: 'nav-materiel' },
    { key: 'clients', icon: Users, label: 'Clients' },
    { key: 'djs', icon: Headphones, label: 'DJs' },
    { key: 'devis', icon: FileText, label: 'Devis' },
    { key: 'envoi', icon: Send, label: 'Envoi' },
    { key: 'reservations', icon: BookOpen, label: 'Réservations' },
    { key: 'livraisons', icon: Truck, label: 'Livraisons', highlight: 'red' },
    { key: 'archives', icon: Archive, label: 'Archives' },
    { key: 'analyse', icon: BarChart3, label: 'Analyse' },
    { key: 'catalogue', icon: Target, label: 'Catalogue' },
    { key: 'parametres', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="flex h-screen overflow-hidden">
      
      {/* Sidebar */}
      <div className={`bg-blue-800 text-white flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')` }}></div>
        
        <button
          onClick={toggleSidebar}
          className="fixed top-1/2 transform -translate-y-1/2 -translate-x-1/2 bg-orange-500 hover:bg-orange-400 text-white rounded-full p-3 shadow-[0_15px_50px_rgba(0,0,0,0.7)] transition-all duration-300 hover:scale-110 cursor-pointer"
          title={isSidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          style={{ zIndex: 9999, left: isSidebarCollapsed ? '80px' : '256px', boxShadow: '0 15px 50px rgba(0, 0, 0, 0.7), 0 0 0 4px rgba(255, 255, 255, 1), 0 0 30px rgba(249, 115, 22, 0.6)' }}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-6 h-6 stroke-[3]" /> : <ChevronLeft className="w-6 h-6 stroke-[3]" />}
        </button>
        
        <div className="relative z-10 p-6 border-b border-blue-700 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm">🎵</span>
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold">Booking Pro</h1>
                <p className="text-blue-200 text-xs">Gestion de location professionnelle DJ</p>
              </div>
            )}
          </div>
        </div>

        <nav className="relative z-10 flex-1 p-4">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.key;
              const activeClass = item.highlight === 'red' ? 'bg-red-600 text-white' : 'bg-blue-700 text-white';
              const hoverClass = item.highlight === 'red' ? 'text-blue-100 hover:bg-red-600/50' : 'text-blue-100 hover:bg-blue-700/50';
              return (
                <button
                  key={item.key}
                  onClick={() => setCurrentView(item.key)}
                  data-testid={item.testId}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${isActive ? activeClass : hoverClass} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto">
          {currentView === 'agenda' && <AgendaView stats={stats} setCurrentView={setCurrentView} showAddReservationModal={showAddReservationModal} setShowAddReservationModal={setShowAddReservationModal} />}
          {currentView === 'materiel' && <MaterielView />}
          {currentView === 'clients' && <ClientsView />}
          {currentView === 'djs' && <DJsView />}
          {currentView === 'devis' && <DevisView setCurrentView={setCurrentView} />}
          {currentView === 'envoi' && <EnvoiView pendingQuoteToSend={null} setPendingQuoteToSend={() => {}} />}
          {currentView === 'reservations' && <ReservationsViewIntegrated setCurrentView={setCurrentView} onOpenAddReservation={handleAddReservationClick} />}
          {currentView === 'livraisons' && <LivraisonsView />}
          {currentView === 'archives' && <ArchivesView />}
          {currentView === 'analyse' && <AnalyseView />}
          {currentView === 'catalogue' && <CatalogueView />}
          {currentView === 'parametres' && <ParametresView />}
        </main>
      </div>
    </div>
    </div>
  );
}

export default LocationApp;
