import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle, ArrowLeft } from 'lucide-react';

const RentalDashboard = ({ onNavigate, disputeCount = 0 }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="rental-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
            data-testid="rental-back-home"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Location</h1>
            <p className="text-xs text-slate-500 mt-0.5">R'KEY PROD</p>
          </div>
        </div>
      </header>

      {/* Main actions */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-5 max-w-lg mx-auto w-full">
        <button
          onClick={() => onNavigate('withdrawal')}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl p-6 flex items-center gap-4 transition-all active:scale-[0.98] shadow-lg"
          data-testid="btn-retrait"
        >
          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <ArrowDownToLine className="w-7 h-7" />
          </div>
          <div className="text-left">
            <span className="text-base font-semibold block">RETRAIT</span>
            <span className="text-xs text-slate-400 mt-0.5 block">Préparer et remettre le matériel au client</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('return')}
          className="w-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl p-6 flex items-center gap-4 transition-all active:scale-[0.98] shadow-sm"
          data-testid="btn-retour"
        >
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <ArrowUpFromLine className="w-7 h-7" />
          </div>
          <div className="text-left">
            <span className="text-base font-semibold block">RETOUR</span>
            <span className="text-xs text-slate-500 mt-0.5 block">Contrôler et réceptionner le matériel rendu</span>
          </div>
        </button>

        {disputeCount > 0 && (
          <button
            onClick={() => onNavigate('disputes')}
            className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 transition-all"
            data-testid="btn-litiges"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="text-left flex-1">
              <span className="text-sm font-medium block">Litiges en cours</span>
              <span className="text-xs text-amber-700">{disputeCount} dossier{disputeCount > 1 ? 's' : ''} en attente</span>
            </div>
          </button>
        )}
      </main>
    </div>
  );
};

export default RentalDashboard;
