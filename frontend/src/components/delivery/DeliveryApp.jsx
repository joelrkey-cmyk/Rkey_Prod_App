import React, { useState, useEffect } from 'react';
import { Toaster } from '../ui/sonner';
import axios from '../../services/axiosConfig';
import DeliveryDashboard from './DeliveryDashboard';
import DeliveryFlow from './DeliveryFlow';

import API_BASE_URL from '../../utils/apiUrl';
const API = `${API_BASE_URL}/api`;

function DeliveryApp() {
  const [view, setView] = useState('dashboard');
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const handleSelect = (delivery) => {
    setSelectedDelivery(delivery);
    setView('flow');
  };

  const handleBack = () => {
    setView('dashboard');
    setSelectedDelivery(null);
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="delivery-app">
      <Toaster position="top-center" />
      {view === 'dashboard' && (
        <DeliveryDashboard onSelect={handleSelect} />
      )}
      {view === 'flow' && selectedDelivery && (
        <DeliveryFlow delivery={selectedDelivery} onBack={handleBack} />
      )}
    </div>
  );
}

export default DeliveryApp;
