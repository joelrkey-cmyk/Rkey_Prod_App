import React, { useState } from 'react';
import Navigation from '../Navigation';
import DisputesView from './DisputesView';

const RentalApp = () => {
  const [view, setView] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Espace Location (Rental)</h1>
                <p className="text-sm text-slate-500">Gérez les litiges et retours de matériel</p>
              </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div 
                onClick={() => setView('disputes')}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
              >
                <div className="h-10 w-10 bg-amber-50 rounded-lg text-amber-600 border border-amber-100 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                  <span className="text-lg font-bold">⚠️</span>
                </div>
                <h3 className="font-semibold text-slate-800 text-lg mb-1">Litiges & Dépôts</h3>
                <p className="text-sm text-slate-500">Consultez et résolvez les litiges liés aux dépôts de garantie</p>
              </div>
            </div>
          </div>
        )}

        {view === 'disputes' && (
          <DisputesView onBack={() => setView('dashboard')} />
        )}
      </main>
    </div>
  );
};

export default RentalApp;
