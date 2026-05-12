// Onglet Historique des contrats (Actifs, Archives, Corbeille)
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  FileText, Calendar, MapPin, Music, Printer, Edit, Send, 
  FileCheck, Trash2, Plus, Settings, Archive, RotateCcw 
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
  onLoadContract,
  onMarkAsSent,
  onMarkAsSigned,
  onMoveToTrash,
  onRestore,
  onPermanentDelete,
  onMarkArchivedAsUnsigned,
  onDeleteArchived
}) => {
  const currentContracts = showTrash ? deletedContracts : showArchive ? archivedContracts : contracts;

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
          Contrats Actifs ({contracts.length})
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
          <CardTitle className="flex items-center space-x-2">
            {showTrash ? (
              <><Trash2 className="h-5 w-5 text-red-600" /><span>Corbeille</span></>
            ) : showArchive ? (
              <><Archive className="h-5 w-5 text-green-600" /><span>Contrats Archivés</span></>
            ) : (
              <><FileText className="h-5 w-5 text-blue-600" /><span>Contrats Actifs</span></>
            )}
          </CardTitle>
          <CardDescription>
            {showTrash ? "Contrats supprimés - récupérables ou suppression définitive" :
             showArchive ? "Contrats signés et archivés par ordre chronologique" :
             "Tous vos contrats en cours classés du plus récent au plus ancien"}
          </CardDescription>
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
                          <h3 className="font-semibold text-lg text-gray-900">{contract.client_info.name}</h3>
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
                          {(contract.base_price + (contract.selected_options?.filter(opt => opt.selected).reduce((sum, opt) => sum + opt.price, 0) || 0) - (contract.discount_amount || 0)).toLocaleString()}€
                        </div>
                        <div className="text-sm text-gray-500">
                          Créé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {!showTrash && !showArchive && (
                          <>
                            <Button onClick={() => onPrintContract(contract)} variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" data-testid={`pdf-btn-${contract.id}`}>
                              <Printer className="h-4 w-4 mr-1" />PDF
                            </Button>
                            <Button onClick={() => onLoadContract(contract)} variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" data-testid={`edit-btn-${contract.id}`}>
                              <Edit className="h-4 w-4 mr-1" />Modifier
                            </Button>
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
                            <Button onClick={() => onPrintContract(contract)} variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                              <Printer className="h-4 w-4 mr-1" />PDF
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
