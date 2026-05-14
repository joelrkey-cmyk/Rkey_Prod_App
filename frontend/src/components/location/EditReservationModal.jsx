// Modal de modification de réservation - Extraite de ReservationsViewIntegrated
import React from 'react';
import { Button } from '../ui/button';
import { Edit } from 'lucide-react';
import { ContractEventAutocomplete } from './ContractEventAutocomplete';

export function EditReservationModal({
  showEditModal,
  setShowEditModal,
  editingReservation,
  setEditingReservation,
  editFormData,
  setEditFormData,
  equipment,
  categories,
  isLoading,
  handleUpdateReservation,
  updateEquipmentQuantity,
  removeEquipmentFromReservation,
  addEquipmentToReservation,
}) {
  if (!showEditModal || !editingReservation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2" data-testid="edit-reservation-title">
            <Edit className="w-5 h-5 text-blue-600" />
            Modifier la réservation
          </h3>
          <p className="text-gray-600 text-sm">
            Client: <strong>{editingReservation.client_name || editingReservation.dj_name}</strong>
          </p>
        </div>

        <div className="space-y-6">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={editFormData.start_date}
                onChange={(e) => setEditFormData(prev => ({...prev, start_date: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-start-date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={editFormData.end_date}
                onChange={(e) => setEditFormData(prev => ({...prev, end_date: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-end-date"
              />
            </div>
          </div>

          {/* Événement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Évènement
            </label>
            <ContractEventAutocomplete
              value={editFormData.event}
              onChange={(value) => setEditFormData(prev => ({...prev, event: value}))}
              placeholder="Type d'événement (mariage, anniversaire, etc.)"
              id="edit-event"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={editFormData.notes}
              onChange={(e) => setEditFormData(prev => ({...prev, notes: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Notes additionnelles..."
              data-testid="edit-notes"
            />
          </div>

          {/* Équipements actuels */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Équipements de la réservation</h4>
            
            {editFormData.equipment_items.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                {editFormData.equipment_items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({item.daily_price}€/jour)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateEquipmentQuantity(item.equipment_id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        data-testid={`edit-qty-minus-${index}`}
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateEquipmentQuantity(item.equipment_id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        data-testid={`edit-qty-plus-${index}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEquipmentFromReservation(item.equipment_id)}
                        className="ml-2 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center"
                        title="Supprimer"
                        data-testid={`edit-remove-${index}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic mb-4">Aucun équipement sélectionné</p>
            )}

            {/* Ajouter nouvel équipement */}
            <div>
              <h5 className="text-md font-medium text-gray-800 mb-2">Ajouter du matériel</h5>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addEquipmentToReservation(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-add-equipment-select"
              >
                <option value="">Sélectionner un équipement...</option>
                {categories.map(cat => {
                  const categoryName = cat.name;
                  const categoryIcon = cat.icon || '';
                  
                  const categoryEquipment = equipment.filter(eq => {
                    const isOperational = !eq.maintenance_status || eq.maintenance_status === 'operational';
                    
                    if (categoryName === 'Lumière' || categoryName === 'Éclairage') {
                      return (eq.category === 'Éclairage' || eq.category === 'Lumière') && isOperational && !eq.is_pack;
                    }
                    if (categoryName === 'Packs') {
                      return eq.is_pack && isOperational;
                    }
                    if (categoryName === 'Structure et pieds') {
                      return (eq.category === 'Structure et pieds' || eq.category === 'Structure Truss') && isOperational && !eq.is_pack;
                    }
                    return eq.category === categoryName && isOperational && !eq.is_pack;
                  });
                  
                  if (categoryEquipment.length === 0) return null;
                  
                  return (
                    <optgroup key={categoryName} label={`${categoryIcon} ${categoryName.toUpperCase()}`}>
                      {categoryEquipment.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} - {eq.daily_price}€/jour ({(eq.available_quantity || 0) >= 999999 ? '∞' : (eq.available_quantity || 0)} dispo)
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Calcul du total */}
            {editFormData.equipment_items.length > 0 && editFormData.start_date && editFormData.end_date && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg" data-testid="edit-total-estimate">
                <div className="text-lg font-semibold text-green-800">
                  Total estimé: {editFormData.equipment_items.reduce((total, item) => {
                    const days = Math.max(1, Math.ceil((new Date(editFormData.end_date) - new Date(editFormData.start_date)) / (1000 * 60 * 60 * 24)));
                    return total + (item.daily_price * item.quantity * days);
                  }, 0)}€
                </div>
                <div className="text-sm text-green-600">
                  Durée: {editFormData.start_date && editFormData.end_date ? Math.max(1, Math.ceil((new Date(editFormData.end_date) - new Date(editFormData.start_date)) / (1000 * 60 * 60 * 24))) : 0} jour(s)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            onClick={handleUpdateReservation}
            disabled={isLoading || !editFormData.start_date || !editFormData.end_date}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            data-testid="save-edit-btn"
          >
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowEditModal(false);
              setEditingReservation(null);
            }}
            disabled={isLoading}
            className="flex-1"
            data-testid="cancel-edit-btn"
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
