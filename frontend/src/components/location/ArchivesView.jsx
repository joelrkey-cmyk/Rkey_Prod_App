// ArchivesView - Module Location
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Archive, RefreshCw, User, Headphones, Search, FolderOpen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { API, axios } from './helpers';
import DossierModal from './DossierModal';

function ArchivesView() {
  const [archivedQuotes, setArchivedQuotes] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dossier modal
  const [showDossier, setShowDossier] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState(null);

  useEffect(() => { fetchArchivedQuotes(); }, []);

  const fetchArchivedQuotes = async () => {
    try {
      setIsLoading(true);
      const [quotesRes, clientsRes, reservationsRes] = await Promise.all([
        axios.get(`${API}/quotes?archived=true`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/reservations?archived=true`),
      ]);
      setArchivedQuotes(quotesRes.data || []);
      setClients(clientsRes.data || []);
      setReservations(reservationsRes.data || []);
    } catch (error) {
      console.error('Error fetching archives:', error);
      toast.error('Erreur lors du chargement des archives');
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayName = (quote) => {
    if (quote.booking_type === 'dj') return quote.dj_name || 'DJ';
    const client = clients.find(c => c.id === quote.client_id);
    if (client && client.company_name) return client.company_name;
    return quote.client_name || 'N/A';
  };

  const getReservationForQuote = (quoteId) => {
    return reservations.find(r => r.quote_id === quoteId);
  };

  const handleUnarchive = async (quote) => {
    const displayName = getDisplayName(quote);
    if (window.confirm(`Désarchiver le devis de "${displayName}" ?\n\nLe devis et sa réservation associée seront restaurés.`)) {
      try {
        setIsLoading(true);
        await axios.patch(`${API}/quotes/${quote.id}/archive`, { is_archived: false });
        toast.success('Devis désarchivé avec succès');
        await fetchArchivedQuotes();
      } catch (error) {
        toast.error('Erreur lors du désarchivage');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async (quote) => {
    const displayName = getDisplayName(quote);
    if (window.confirm(`Supprimer définitivement le devis de "${displayName}" ?\n\nCette action est irréversible. La réservation associée sera également supprimée.`)) {
      try {
        setIsLoading(true);
        await axios.delete(`${API}/quotes/${quote.id}`);
        toast.success('Devis supprimé définitivement');
        await fetchArchivedQuotes();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepté': return <Badge className="bg-green-600 text-white">Accepté</Badge>;
      case 'En attente': return <Badge className="bg-yellow-600 text-white">En attente</Badge>;
      case 'Brouillon': return <Badge className="bg-orange-600 text-white">Brouillon</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter quotes by search
  const filteredQuotes = archivedQuotes.filter(quote => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = getDisplayName(quote).toLowerCase();
    const ref = (quote.quote_number || '').toLowerCase();
    const clientName = (quote.client_name || '').toLowerCase();
    const djName = (quote.dj_name || '').toLowerCase();
    return name.includes(q) || ref.includes(q) || clientName.includes(q) || djName.includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Archives</h2>
          <p className="text-gray-600 mt-1">Devis archivés</p>
        </div>
        <Button onClick={fetchArchivedQuotes} variant="outline" disabled={isLoading}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-600" />
            Devis Archivés
          </CardTitle>
          <CardDescription>
            {archivedQuotes.length === 0
              ? 'Aucun devis archivé'
              : `${archivedQuotes.length} devis archivé(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search bar */}
          {archivedQuotes.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, entreprise, référence..."
                className="pl-10"
                data-testid="archive-search"
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Chargement des archives...</div>
            </div>
          ) : archivedQuotes.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Aucun devis archivé</p>
            </div>
          ) : (
            <>
              {filteredQuotes.length === 0 && searchQuery ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun résultat pour "{searchQuery}"
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Devis</TableHead>
                      <TableHead>Client/DJ</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Matériel</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => {
                      const reservation = getReservationForQuote(quote.id);
                      return (
                        <TableRow key={quote.id} className="bg-gray-50/50">
                          <TableCell className="font-mono text-sm">
                            {quote.quote_number || '-'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              {quote.booking_type === 'client' ? (
                                <User className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Headphones className="w-4 h-4 text-purple-600" />
                              )}
                              {getDisplayName(quote)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Du: {formatDate(quote.start_date)}</div>
                              <div>Au: {formatDate(quote.end_date)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              {quote.items?.length || 0} éq.
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {quote.total_amount?.toFixed(2) || '0.00'}€
                          </TableCell>
                          <TableCell>{getStatusBadge(quote.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {reservation && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReservationId(reservation.id);
                                    setShowDossier(true);
                                  }}
                                  title="Voir le dossier"
                                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                  data-testid={`dossier-${quote.id}`}
                                >
                                  <FolderOpen className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnarchive(quote)}
                                disabled={isLoading}
                                title="Désarchiver"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                data-testid={`unarchive-${quote.id}`}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(quote)}
                                disabled={isLoading}
                                title="Supprimer définitivement"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                data-testid={`delete-archive-${quote.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dossier Modal */}
      <DossierModal
        open={showDossier}
        onClose={() => setShowDossier(false)}
        reservationId={selectedReservationId}
      />
    </div>
  );
}

export default ArchivesView;
