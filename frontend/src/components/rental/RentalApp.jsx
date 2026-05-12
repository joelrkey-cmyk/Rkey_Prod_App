import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Toaster } from '../ui/sonner';
import axios from '../../services/axiosConfig';
import RentalDashboard from './RentalDashboard';
import WithdrawalFlow from './WithdrawalFlow';
import ReturnFlow from './ReturnFlow';
import DisputesView from './DisputesView';

import API_BASE_URL from '../../utils/apiUrl';

const API = `${API_BASE_URL}/api`;

function RentalApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(searchParams.get('view') || 'dashboard');
  const [disputeCount, setDisputeCount] = useState(0);

  useEffect(() => { fetchDisputeCount(); }, []);

  const fetchDisputeCount = async () => {
    try {
      const res = await axios.get(`${API}/rental/disputes`);
      setDisputeCount(res.data?.length || 0);
    } catch (e) {
      // Ignore
    }
  };

  const handleNavigate = (target) => {
    setView(target);
  };

  const handleBack = () => {
    setView('dashboard');
    setSearchParams({});
    fetchDisputeCount();
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="rental-app">
      <Toaster position="top-center" />
      {view === 'dashboard' && (
        <RentalDashboard onNavigate={handleNavigate} disputeCount={disputeCount} />
      )}
      {view === 'withdrawal' && (
        <WithdrawalFlow onBack={handleBack} onComplete={handleBack} />
      )}
      {view === 'return' && (
        <ReturnFlow onBack={handleBack} />
      )}
      {view === 'disputes' && (
        <DisputesView onBack={handleBack} />
      )}
    </div>
  );
}

export default RentalApp;
