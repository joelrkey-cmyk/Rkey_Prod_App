// Onglet Historique des contrats (Actifs, Archives, Corbeille)
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  FileText, Calendar, MapPin, Music, Printer, Edit, Send, 
  FileCheck, Trash2, Plus, Settings, Archive, RotateCcw, Search, Filter, Eye, Paperclip
} from 'lucide-react';

export const ContractHistory = ({
  contracts,
  deletedContracts,
  archivedContracts,
  showTrash,
  setShowTrash,
  showArchive,
  setShowArchive,
  setShowConfiguration,
  setActiveTab,
  onPrintContract,
  onPreviewContract,
  onLoadContract,
  onMarkAsSent,
  onMarkAsSigned,
  onMoveToTrash,
  onRestore,
  onPermanentDelete,
  onMarkArchivedAsUnsigned,
  onDeleteArchived,
  onManageAttachments
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('All');
  const [filterTime, setFilterTime] = useState('All');

  const getContractTotal = (contract) => {
    const optionsTotal = contract.selected_options?.filter(option => option.selected).reduce((sum, option) => sum + option.price, 0) || 0;
    const isDir = (() => {
      const p = contract.dj_profile_data || {};
      return p.nom_artistique?.toLowerCase().includes("r'key") || 
             p.nom_artistique?.toLowerCase().includes("rkey") || 
             p.titre?.includes("Gérant") || 
             p.statut_artiste === 'dirigeant';
    })();

    if (isDir) {
      return Math.max(0, (contract.base_price || 0) + optionsTotal - (contract.discount_amount || 0));
    }
    if (contract.contract_mode === 'entreprise') {
      return Math.max(0, (contract.base_price || 0) + optionsTotal - (contract.discount_amount || 0));
    }
    const mandataireRate = (contract.frais_mandat || 0) + (contract.cachet_artiste || 0);
    const baseRate = (mandataireRate === 0 && (contract.base_price || 0) > 0) ? contract.base_price : mandataireRate;
    return Math.max(0, baseRate + optionsTotal - (contract.discount_amount || 0));
  };

  const archiveYears = useMemo(() => {
    const years = new Set();
    archivedContracts.forEach(c => {
      if (c.client_info?.event_date) {
        const year = new Date(c.client_info.event_date).getFullYear();
        if (!isNaN(year)) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [archivedContracts]);

  const currentContracts = useMemo(() => {
    let list = showTrash ? deletedContracts : showArchive ? archivedContracts : contracts;
    
    if (showArchive) {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        list = list.filter(c => 
          c.client_info?.name?.toLowerCase().includes(query) || 
          c.client_info?.email?.toLowerCase().includes(query)
        );
      }
      
      if (filterYear !== 'All') {
        list = list.filter(c => {
          if (!c.client_info?.event_date) return false;
          const year = new Date(c.client_info.event_date).getFullYear().toString();
          return year === filterYear;
        });
      }
      
      if (filterTime !== 'All') {
        const today = new Date();
        today.setHours(0,0,0,0);
        list = list.filter(c => {
          if (!c.client_info?.event_date) return false;
          const eventDate = new Date(c.client_info.event_date);
          eventDate.setHours(0,0,0,0);
          if (filterTime === 'Upcoming') return eventDate >= today;
          if (filterTime === 'Past') return eventDate < today;
          return true;
        });
      }
    }
    
    return list;
  }, [showTrash, showArchive, deletedContracts, archivedContracts, contracts, searchQuery, filterYear, filterTime]);

  return (
    <div className="space-y-6" data-testid="contract-history">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <Button
          variant={!showTrash && !showArchive ? "default" : "ghost"}
          onClick={() => { setShowTrash(false); setShowArchive(false); }}
          className="flex-1"
          data-testid="active-contracts-tab"
        >
          <FileText className="h-4 w-4 mr-2" />
          Contrats en attente ({contracts.length})
        </Button>
        <Button
          variant={showArchive ? "default" : "ghost"}
          onClick={() => { setShowArchive(true); setShowTrash(false); }}
          className="flex-1"
          data-testid="archived-contracts-tab"
        >
          <FileCheck className="h-4 w-4 mr-2" />
          Archives ({archivedContracts.length})
        </Button>
        <Button
          variant={showTrash ? "default" : "ghost"}
          onClick={() => { setShowTrash(true); setShowArchive(false); }}
          className="flex-1"
          data-testid="trash-contracts-tab"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Corbeille ({deletedContracts.length})
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowConfiguration(true)}
          className="px-4"
          title="Configuration des options et notes techniques"
          data-testid="config-btn"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Contracts List */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                {showTrash ? (
                  <><Trash2 className="h-5 w-5 text-red-600" /><span>Corbeille</span></>
                ) : showArchive ? (
                  <><Archive className="h-5 w-5 text-green-600" /><span>Contrats Archivés</span></>
                ) : (
                  <><FileText className="h-5 w-5 text-blue-600" /><span>Contrats en attente</span></>
                )}
              </CardTitle>
              <CardDescription>
                {showTrash ? "Contrats supprimés - récupérables ou suppression définitive" :
                 showArchive ? "Contrats signés et archivés par ordre chronologique" :
                 "Tous vos contrats en cours classés du plus récent au plus ancien"}
              </CardDescription>
            </div>
            
            {showArchive && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Chercher (nom, email)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white rounded-md border px-3 py-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterTime}
                    onChange={(e) => setFilterTime(e.target.value)}
                    className="bg-transparent border-none text-sm outline-none cursor-pointer"
                  >
                    <option value="All">Tous les événements</option>
                    <option value="Upcoming">Événements à venir</option>
                    <option value="Past">Événements passés</option>
                  </select>
                  <span className="text-gray-300 mx-1">|</span>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="bg-transparent border-none text-sm outline-none cursor-pointer"
                  >
                    <option value="All">Toutes les années</option>
                    {archiveYears.map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {currentContracts.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {currentContracts.map((contract, index) => (
                <div key={contract.id} className="p-6 hover:bg-gray-50 transition-colors" data-testid={`contract-item-${contract.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 text-blue-600 rounded-full h-10 w-10 flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          {!showTrash && !showArchive ? (
                            <h3 
                              onClick={() => onLoadContract(contract)} 
                              className="font-semibold text-lg text-gray-900 hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-1.5 group transition-colors"
                              title="Cliquer pour modifier le contrat"
                            >
                              {contract.client_info.name}
                              <Edit className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                            </h3>
                          ) : (
                            <h3 className="font-semibold text-lg text-gray-900">{contract.client_info.name}</h3>
                          )}
                          {contract.dj_profile_data?.nom_artistique && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs" data-testid={`artist-badge-${contract.id}`}>
                              {contract.dj_profile_data.nom_artistique}
                            </Badge>
                          )}
                          {contract.status === 'draft' && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">Brouillon</Badge>
                          )}
                          {contract.status === 'sent' && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">Envoyé</Badge>
                          )}
                          {contract.status !== 'draft' && contract.status !== 'sent' && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              contract.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {contract.status}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{contract.client_info.email}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(contract.client_info.event_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{contract.client_info.event_location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Music className="h-4 w-4" />
                            <span>{contract.client_info.event_type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {getContractTotal(contract).toLocaleString()}€
                        </div>
                        <div className="text-sm text-gray-500">
                          Créé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {!showTrash && !showArchive && (
                          <>
                            <Button onClick={() => onMarkAsSent(contract.id)} variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" data-testid={`sent-btn-${contract.id}`}>
                              <Send className="h-4 w-4 mr-1" />Envoyé
                            </Button>
                            <Button onClick={() => onMarkAsSigned(contract.id)} variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50" data-testid={`signed-btn-${contract.id}`}>
                              <FileCheck className="h-4 w-4 mr-1" />Signé
                            </Button>
                            <Button onClick={() => onMoveToTrash(contract.id)} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" data-testid={`delete-btn-${contract.id}`}>
                              <Trash2 className="h-4 w-4 mr-1" />Supprimer
                            </Button>
                          </>
                        )}

                        {showArchive && (
                          <>
                            <Button onClick={() => onManageAttachments(contract)} variant="outline" size="sm" className="text-emerald-800 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 font-medium">
                              <Paperclip className="h-4 w-4 mr-1 text-emerald-700" />Pièces Jointes ({contract.event_documents?.length || 0})
                            </Button>
                            <Button onClick={() => onPreviewContract(contract)} variant="outline" size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50">
                              <Eye className="h-4 w-4 mr-1" />Aperçu
                            </Button>
                            <Button onClick={() => onMarkArchivedAsUnsigned(contract.id)} variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              <RotateCcw className="h-4 w-4 mr-1" />Non signé
                            </Button>
                            <Button onClick={() => onDeleteArchived(contract.id)} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                              <Trash2 className="h-4 w-4 mr-1" />Supprimer
                            </Button>
                          </>
                        )}

                        {showTrash && (
                          <>
                            <Button onClick={() => onRestore(contract.id)} variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Plus className="h-4 w-4 mr-1" />Restaurer
                            </Button>
                            <Button onClick={() => onPermanentDelete(contract.id)} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                              <Trash2 className="h-4 w-4 mr-1" />Supprimer définitivement
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              {showTrash ? (
                <>
                  <Trash2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Corbeille vide</h3>
                  <p className="text-gray-600">Aucun contrat supprimé</p>
                </>
              ) : showArchive ? (
                <>
                  <Archive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun contrat archivé</h3>
                  <p className="text-gray-600">Les contrats signés apparaîtront ici</p>
                </>
              ) : (
                <>
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun contrat créé</h3>
                  <p className="text-gray-600 mb-6">Créez votre premier contrat DJ pour commencer</p>
                  <Button 
                    onClick={() => setActiveTab("create")}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="create-first-contract-btn"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un contrat
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
