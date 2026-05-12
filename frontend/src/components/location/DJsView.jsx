// DJsView - Module Location (synced from DJ Profiles)
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Headphones, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { API, axios } from './helpers';

const COLORS = [
  { name: 'Orange', value: '#f97316' },
  { name: 'Vert', value: '#22c55e' },
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Violet', value: '#a855f7' },
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Jaune', value: '#eab308' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Marron', value: '#92400e' },
];

function DJsView() {
  const [djs, setDjs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingColorId, setEditingColorId] = useState(null);

  useEffect(() => { fetchDJs(); }, []);

  const fetchDJs = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/djs`);
      setDjs(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des DJ');
    } finally {
      setIsLoading(false);
    }
  };

  const updateColor = async (djId, color) => {
    try {
      await axios.put(`${API}/djs/${djId}`, { color });
      setDjs(prev => prev.map(d => d.id === djId ? { ...d, color } : d));
      setEditingColorId(null);
      toast.success('Couleur mise à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Gestion des DJs</h2>
        <p className="text-sm text-gray-500 mt-1">
          Synchronisé automatiquement depuis les Profils DJ
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des DJs</CardTitle>
          <CardDescription>
            {isLoading ? 'Chargement...' : (
              djs.length === 0 ? 'Aucun profil DJ créé' : `${djs.length} DJ(s) disponibles`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Chargement des DJs...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Couleur</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {djs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      Aucun profil DJ. Ajoutez un profil depuis l'application "Profils DJ".
                    </TableCell>
                  </TableRow>
                ) : (
                  djs.map((dj) => (
                    <TableRow key={dj.id}>
                      <TableCell>
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: dj.color || '#f97316' }}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Headphones className="w-4 h-4 text-purple-600" />
                          {dj.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingColorId === dj.id ? (
                          <div className="flex gap-1 justify-end flex-wrap">
                            {COLORS.map(c => (
                              <button
                                key={c.value}
                                onClick={() => updateColor(dj.id, c.value)}
                                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                                  dj.color === c.value ? 'border-gray-900 ring-2 ring-gray-400' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                              />
                            ))}
                            <Button size="sm" variant="ghost" onClick={() => setEditingColorId(null)} className="ml-1 text-xs">
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingColorId(dj.id)}
                            data-testid={`change-color-${dj.id}`}
                          >
                            <Palette className="w-4 h-4 mr-1" />
                            Couleur
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DJsView;
