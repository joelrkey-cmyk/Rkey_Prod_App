import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import axios from '../../services/axiosConfig';
import { toast } from 'sonner';

import API_BASE_URL from '../../utils/apiUrl';
const API = `${API_BASE_URL}/api`;

const DisputesView = ({ onBack }) => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');

  useEffect(() => { fetchDisputes(); }, []);

  const fetchDisputes = async () => {
    try {
      const res = await axios.get(`${API}/rental/disputes`);
      setDisputes(res.data);
    } catch (err) {
      toast.error('Erreur chargement litiges');
    } finally {
      setLoading(false);
    }
  };

  const resolveDispute = async (returnDeposit) => {
    if (!selected) return;
    try {
      await axios.post(`${API}/rental/disputes/${selected.id}/resolve`, {
        deposit_returned: returnDeposit,
        notes: resolveNotes
      });
      toast.success('Litige resolu');
      setSelected(null);
      setResolveNotes('');
      fetchDisputes();
    } catch (err) {
      toast.error('Erreur resolution');
    }
  };

  if (selected) {
    return (
      <div className="min-h-screen bg-slate-50" data-testid="dispute-detail">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-base font-semibold text-slate-900">Détail litige</h1>
        </header>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-sm font-medium text-slate-900">{selected.client_name}</p>
            <p className="text-xs text-slate-500 mt-1">Caution: {selected.deposit_amount?.toFixed(2)} EUR ({selected.deposit_method})</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">Articles en litige :</p>
            {(selected.dispute_items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm text-amber-900">{item.equipment_name}</span>
                <span className="text-xs text-amber-600 ml-auto">{item.issue}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">Notes de résolution</label>
            <textarea
              value={resolveNotes}
              onChange={e => setResolveNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Notes..."
              data-testid="resolve-notes"
            />
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => resolveDispute(true)}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-sm rounded-xl"
              data-testid="resolve-return-deposit"
            >
              <Check className="w-4 h-4 mr-2" /> Restituer la caution et clôturer
            </Button>
            <Button
              onClick={() => resolveDispute(false)}
              variant="outline"
              className="w-full h-11 text-sm rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
              data-testid="resolve-keep-deposit"
            >
              Conserver la caution et clôturer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="disputes-view">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" data-testid="disputes-back">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-base font-semibold text-slate-900">Litiges en cours</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Chargement...</div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Aucun litige en cours</div>
        ) : (
          disputes.map(d => (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className="w-full bg-white border border-amber-200 rounded-xl p-4 text-left hover:border-amber-300 transition-colors"
              data-testid={`dispute-${d.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{d.client_name || 'Client'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {d.dispute_items?.length || 0} article{(d.dispute_items?.length || 0) > 1 ? 's' : ''} en litige
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Caution: {d.deposit_amount?.toFixed(2)} EUR</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default DisputesView;
