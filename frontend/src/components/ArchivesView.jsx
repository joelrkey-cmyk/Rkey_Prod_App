import React, { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Archive, User, Headphones, Calendar } from 'lucide-react';

import API_BASE_URL from '../utils/apiUrl';
const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api/location`;

// Archives Management Component - Complete Implementation
function ArchivesView() {
  const [archives, setArchives] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchArchives();
    generateYearsList();
  }, []);

  const fetchArchives = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/reservations?archived=true`);
      setArchives(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des archives');
    } finally {
      setIsLoading(false);
    }
  };

  const generateYearsList = () => {
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let year = currentYear; year >= currentYear - 5; year--) {
      yearsList.push(year.toString());
    }
    setYears(yearsList);
  };

  const filteredArchives = archives.filter(archive => {
    const matchesSearch = searchTerm === '' || 
      (archive.client_name && archive.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (archive.dj_name && archive.dj_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesYear = selectedYear === '' || 
      (archive.created_at && new Date(archive.created_at).getFullYear().toString() === selectedYear);
    
    return matchesSearch && matchesYear;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600"><Archive className="w-3 h-3 mr-1" />Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTotalRevenue = () => {
    return filteredArchives.reduce((total, archive) => total + (archive.total_amount || 0), 0).toFixed(2);
  };

  const getArchivesByMonth = () => {
    const monthsData = {};
    filteredArchives.forEach(archive => {
      if (archive.created_at) {
        const date = new Date(archive.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
        
        if (!monthsData[monthKey]) {
          monthsData[monthKey] = {
            name: monthName,
            count: 0,
            revenue: 0
          };
        }
        
        monthsData[monthKey].count++;
        monthsData[monthKey].revenue += archive.total_amount || 0;
      }
    });
    
    return Object.values(monthsData).sort((a, b) => b.name.localeCompare(a.name));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Archives</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="search">Rechercher par client/DJ</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="search"
              type="text"
              placeholder="Nom du client ou DJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="year">Filtrer par année</Label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Toutes les années</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Réservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredArchives.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Chiffre d'Affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getTotalRevenue()}€</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Moyenne par Réservation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {filteredArchives.length > 0 ? (parseFloat(getTotalRevenue()) / filteredArchives.length).toFixed(2) : '0.00'}€
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Statistics */}
      {getArchivesByMonth().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques mensuelles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getArchivesByMonth().map((month, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm">{month.name}</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">{month.count} réservations</div>
                  <div className="text-sm text-green-600">{month.revenue.toFixed(2)}€</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archives Table */}
      <Card>
        <CardHeader>
          <CardTitle>Réservations archivées</CardTitle>
          <CardDescription>
            {isLoading ? 'Chargement...' : (
              filteredArchives.length === 0 ? 'Aucune archive trouvée' : `${filteredArchives.length} réservation(s) archivée(s)`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Chargement des archives...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client/DJ</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Équipements</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date d'archivage</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArchives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm || selectedYear ? 'Aucune archive ne correspond aux critères de recherche.' : 'Aucune réservation archivée.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArchives.map((archive) => {
                    const clientName = archive.client_name || archive.dj_name || 'N/A';
                    const startDate = archive.start_date ? new Date(archive.start_date).toLocaleDateString('fr-FR') : 'N/A';
                    const endDate = archive.end_date ? new Date(archive.end_date).toLocaleDateString('fr-FR') : 'N/A';
                    const archivedDate = archive.archived_at ? new Date(archive.archived_at).toLocaleDateString('fr-FR') : new Date(archive.created_at).toLocaleDateString('fr-FR');
                    const itemCount = archive.equipment_items ? archive.equipment_items.length : 0;
                    
                    return (
                      <TableRow key={archive.id}>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            {archive.booking_type === 'dj' ? <Headphones className="w-4 h-4 text-purple-600" /> : <User className="w-4 h-4 text-blue-600" />}
                            {clientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={archive.booking_type === 'dj' ? 'secondary' : 'default'}>
                            {archive.booking_type === 'dj' ? 'DJ' : 'Client'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {startDate} → {endDate}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{itemCount} équipement(s)</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {archive.total_amount}€
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {archivedDate}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(archive.status)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ArchivesView;