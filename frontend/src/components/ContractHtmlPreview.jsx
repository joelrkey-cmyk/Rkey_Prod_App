import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { isContractDirigeant } from './contracts2/calculations';

const ContractHtmlPreview = () => {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${(window.location.hostname === 'rkeyprodapp.fr' || window.location.hostname === 'www.rkeyprodapp.fr') ? window.location.origin : (process.env.REACT_APP_BACKEND_URL || window.location.origin)}/api/contracts2/${id}`, { headers });
      if (!response.ok) {
        throw new Error('Contrat non trouvé');
      }
      const contractData = await response.json();
      setContract(contractData);
    } catch (error) {
      console.error('Failed to load contract:', error);
      setError('Impossible de charger le contrat. Veuillez vérifier que l\'ID est correct.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du contrat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contrat non trouvé</h2>
          <p className="text-gray-600 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Contrat non disponible.</p>
        </div>
      </div>
    );
  }

  const calculateContractTotal = () => {
    const optionsTotal = (contract.selected_options || [])
      .filter(option => option.selected)
      .reduce((sum, option) => sum + option.price, 0);
    return Math.max(0, contract.base_price + optionsTotal - (contract.discount_amount || 0));
  };

  const calculateContractDepositAmount = () => {
    if (contract.no_deposit_required) {
      return 0;
    }
    
    if (contract.custom_deposit_amount > 0) {
      return contract.custom_deposit_amount;
    }
    
    const optionsTotal = (contract.selected_options || [])
      .filter(option => option.selected)
      .reduce((sum, option) => sum + option.price, 0);
    
    const isCompany = !!(contract.client_info?.company && contract.client_info.company.trim().length > 0);
    const ratio = isCompany ? 0.3 : 0.5;
    const deposit = (contract.base_price * ratio) + optionsTotal - (contract.discount_amount || 0);
    
    if (isContractDirigeant(contract)) {
      return Math.max(0, deposit);
    }
    return Math.max(0, Math.round(deposit / 50) * 50);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b-2 border-orange-600 pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-orange-600 mb-2">R'KEY PROD</h1>
              <p className="text-sm font-semibold">ANIMATION DJ - LOCATION SON & LUMIÈRE - SHOW</p>
              <div className="text-xs mt-2">
                5 rue du Hohlandsbourg<br />
                67390 Marckolsheim<br />
                📞 07 83 55 36 74<br />
                ✉ info@rkey-prod.fr<br />
                SIRET: 99992355000019
              </div>
            </div>
            <div className="text-right text-sm">
              <strong>Date:</strong> {new Date().toLocaleDateString('fr-FR')}<br />
              <strong>N° Contrat:</strong> {contract.invoice_number || 'CTR-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-3)}<br /><br />
              <div className="text-xs">
                <strong>Prestataire:</strong><br />
                {contract.dj_profile === 'stephane' ? 'Stéphane JACOBY (Stefan Edison)' : 'Joël RUTTKAY (Joël R\'Key)'}<br />
                📞 07 83 55 36 74<br />
                ✉ {contract.dj_profile === 'stephane' ? 'stephane@rkey-prod.fr' : 'info@rkey-prod.fr'}<br />
                {contract.dj_profile === 'stephane' ? 'SIRET: 42121827200019' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-8">CONTRAT DE PRESTATION ARTISTIQUE</h2>

        {/* Client Info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4 bg-gray-100 p-3 border-l-4 border-orange-600">INFORMATIONS CLIENT</h3>
            <p className="mb-2"><span className="font-semibold">Nom:</span> {contract.client_info.name}</p>
            {contract.client_info.company && <p className="mb-2"><span className="font-semibold">Entreprise:</span> {contract.client_info.company}</p>}
            <p className="mb-2"><span className="font-semibold">Email:</span> {contract.client_info.email}</p>
            <p className="mb-2"><span className="font-semibold">Téléphone:</span> {contract.client_info.phone || 'Non renseigné'}</p>
            {contract.client_info.address && <p className="mb-2"><span className="font-semibold">Adresse:</span> {contract.client_info.address}</p>}
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 bg-gray-100 p-3 border-l-4 border-orange-600">DÉTAILS ÉVÉNEMENT</h3>
            <p className="mb-2"><span className="font-semibold">Type:</span> {contract.client_info.event_type}</p>
            <p className="mb-2"><span className="font-semibold">Date:</span> {new Date(contract.client_info.event_date).toLocaleDateString('fr-FR')}</p>
            <p className="mb-2"><span className="font-semibold">Lieu:</span> {contract.client_info.event_location}</p>
            {contract.client_info.guest_count && <p className="mb-2"><span className="font-semibold">Invités:</span> {contract.client_info.guest_count}</p>}
            <p className="mb-2"><span className="font-semibold">Début:</span> {contract.client_info.start_time || 'À définir'}</p>
            <p className="mb-2"><span className="font-semibold">Fin:</span> {contract.client_info.unlimited_time ? 'Sans limite' : (contract.client_info.end_time || 'À définir')}</p>
          </div>
        </div>

        {/* Pricing Table */}
        {contract.selected_options && contract.selected_options.filter(opt => opt.selected).length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4 bg-gray-100 p-3 border-l-4 border-orange-600">GRILLE TARIFAIRE</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-left">Prestation</th>
                  <th className="border border-gray-300 p-2 text-right">Prix</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2"><strong>Prestation artistique</strong></td>
                  <td className="border border-gray-300 p-2 text-right font-bold">{contract.base_price}€</td>
                </tr>
                {contract.selected_options.filter(opt => opt.selected).map((option, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-2">+ {option.name}</td>
                    <td className="border border-gray-300 p-2 text-right font-bold">{option.price}€</td>
                  </tr>
                ))}
                {contract.discount_amount > 0 && (
                  <tr>
                    <td className="border border-gray-300 p-2">- Remise accordée sur acompte</td>
                    <td className="border border-gray-300 p-2 text-right text-red-600 font-bold">-{contract.discount_amount}€</td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 p-2"><strong>TOTAL</strong></td>
                  <td className="border border-gray-300 p-2 text-right"><strong>{calculateContractTotal()}€</strong><br /><small className="text-xs">TVA non applicable, article 293 B du CGI</small></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Conditions */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4 bg-gray-100 p-3 border-l-4 border-orange-600">CONDITIONS DE PAIEMENT</h3>
          <div className="p-4 bg-gray-50 rounded">
            {contract.no_deposit_required ? (
              <div className="text-center">
                <strong>🤝 CLIENT DE CONFIANCE - AUCUN ACOMPTE REQUIS</strong><br />
                <span className="text-2xl font-bold">{calculateContractTotal()}€</span><br />
                <small>Montant total à régler le jour de l'événement</small>
              </div>
            ) : (
              (() => {
                const isCompany = !!(contract.client_info?.company && contract.client_info.company.trim().length > 0);
                return (
                  <div className={isCompany ? "flex justify-center" : "grid grid-cols-2 gap-4"}>
                    <div className="text-center">
                      <strong>Acompte à la signature</strong><br />
                      <span className="text-2xl font-bold text-blue-600">{calculateContractDepositAmount()}€</span>
                    </div>
                    {!isCompany && (
                      <div className="text-center">
                        <strong>Solde le jour J</strong><br />
                        <span className="text-2xl font-bold text-green-600">{calculateContractTotal() - calculateContractDepositAmount()}€</span>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-6 border-t border-gray-300">
          <p className="font-bold">R'KEY PROD</p>
          <p className="text-sm">5 rue du Hohlandsbourg, 67390 Marckolsheim</p>
          <p className="text-sm">📞 07 83 55 36 74 - ✉ info@rkey-prod.fr</p>
        </div>
      </div>
    </div>
  );
};

export default ContractHtmlPreview;
