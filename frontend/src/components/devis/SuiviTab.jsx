// Onglet Suivi des devis envoyés
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  FileText, Euro, Plus, Trash2, Loader2, Clock, Phone, Check, XCircle,
  MessageSquare, Filter, Search, Calendar, History
} from 'lucide-react';
import { getStatusLabel, getStatusColor, formatDate, formatEventDate } from './constants';

export const SuiviTab = ({
  filteredSentQuotes,
  sentQuotes,
  loadingSentQuotes,
  statusFilter,
  setStatusFilter,
  searchFilter,
  setSearchFilter,
  updateQuoteStatus,
  setSelectedQuoteForRelance,
  setShowRelanceDialog,
  setSelectedQuoteForNotes,
  setNotesText,
  setShowNotesDialog,
  deleteQuote,
  downloadQuoteFile,
  setShowAddManualDialog
}) => {
  const getStatusIcon = (status) => {
    const icons = {
      'en_attente': <Clock className="w-4 h-4" />,
      'a_relancer': <Phone className="w-4 h-4" />,
      'accepte': <Check className="w-4 h-4" />,
      'refuse': <XCircle className="w-4 h-4" />
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4" data-testid="suivi-tab">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="a_relancer">À relancer</SelectItem>
                  <SelectItem value="accepte">Accepté</SelectItem>
                  <SelectItem value="refuse">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Search className="w-4 h-4 text-gray-500" />
              <Input placeholder="Rechercher par email ou nom..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} />
            </div>
            <div className="text-sm text-gray-500">{filteredSentQuotes.length} devis</div>
            <Button onClick={() => setShowAddManualDialog(true)} className="bg-orange-500 hover:bg-orange-600 ml-auto">
              <Plus className="w-4 h-4 mr-2" />Ajouter manuellement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sent Quotes List */}
      {loadingSentQuotes ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : filteredSentQuotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {sentQuotes.length === 0 ? (
              <>
                <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun devis envoyé pour le moment</p>
                <p className="text-sm mt-2">Les devis envoyés apparaîtront ici automatiquement</p>
              </>
            ) : (
              <p>Aucun devis ne correspond aux filtres</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSentQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                    {getStatusIcon(quote.status)}
                    {getStatusLabel(quote.status)}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{quote.recipient_email}</span>
                      {quote.recipient_name && (<span className="text-gray-500">({quote.recipient_name})</span>)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Euro className="w-3.5 h-3.5" />{quote.price_amount || '—'} {quote.price_type}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Événement: {formatEventDate(quote.event_date) || '—'}</span>
                      <span className="text-gray-400">Envoyé le {formatDate(quote.sent_at)}</span>
                    </div>

                    {quote.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                        <strong>Notes:</strong> {quote.notes}
                      </div>
                    )}

                    {quote.relances && quote.relances.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {quote.relances.map((relance, idx) => (
                          <div key={relance.id || idx} className="text-sm text-orange-700 bg-orange-50 rounded p-2 flex items-start gap-2">
                            <Phone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <div><span className="font-medium">{formatDate(relance.date)}:</span> {relance.note}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {quote.file_name && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => downloadQuoteFile(quote.id, quote.file_name)}>
                          <FileText className="w-3.5 h-3.5 mr-1" />{quote.file_name}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <Select value={quote.status} onValueChange={(val) => updateQuoteStatus(quote.id, val)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="a_relancer">À relancer</SelectItem>
                        <SelectItem value="accepte">Accepté</SelectItem>
                        <SelectItem value="refuse">Refusé</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSelectedQuoteForRelance(quote); setShowRelanceDialog(true); }}>
                      <Phone className="w-3 h-3 mr-1" />Relance
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSelectedQuoteForNotes(quote); setNotesText(quote.notes || ''); setShowNotesDialog(true); }}>
                      <MessageSquare className="w-3 h-3 mr-1" />Notes
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteQuote(quote.id)}>
                      <Trash2 className="w-3 h-3 mr-1" />Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
