import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, MapPin } from 'lucide-react';
import axios from '../../services/axiosConfig';
import { toast } from 'sonner';

import API_BASE_URL from '../../utils/apiUrl';
const API = `${API_BASE_URL}/api`;

const DeliveryDashboard = ({ onSelect }) => {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDeliveries(); }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get(`${API}/delivery/pending`);
      setDeliveries(res.data);
    } catch (err) {
      toast.error('Erreur chargement des livraisons');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="delivery-dashboard">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
            data-testid="delivery-back-home"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Livraison</h1>
            <p className="text-xs text-slate-500 mt-0.5">R'KEY PROD</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-3">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Chargement...</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Aucune livraison en attente</p>
            <p className="text-slate-400 text-xs mt-1">Les réservations acceptées avec frais de livraison apparaissent ici.</p>
          </div>
        ) : (
          deliveries.map(d => (
            <button
              key={d.id}
              onClick={() => onSelect(d)}
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-slate-300 transition-colors active:bg-slate-50"
              data-testid={`delivery-item-${d.id}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm text-slate-900">{d.client_name}</p>
                  {d.company_name && <p className="text-xs text-slate-500">{d.company_name}</p>}
                </div>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{d.quote_number}</span>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                <span>{d.start_date}</span>
                <span className="font-medium text-slate-700">{d.total_amount?.toFixed(2)} EUR</span>
              </div>
              {d.delivery_address && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{d.delivery_address}</span>
                </div>
              )}
            </button>
          ))
        )}
      </main>
    </div>
  );
};

export default DeliveryDashboard;
