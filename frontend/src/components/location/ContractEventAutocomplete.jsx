import React, { useState, useEffect, useRef } from 'react';
import { API, BACKEND_URL, axios } from './helpers';

export function ContractEventAutocomplete({ value, onChange, placeholder, disabled, className, id }) {
  const [contracts, setContracts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const wrapperRef = useRef(null);

  // Fetch contracts
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/contracts2`);
        // We only care about contracts that have client_info
        const validContracts = response.data
          .filter(c => c.client_info && c.status !== 'deleted' && c.status !== 'trash')
          .map(c => {
            let parsedInfo = c.client_info;
            if (typeof parsedInfo === 'string') {
              try { parsedInfo = JSON.parse(parsedInfo); } catch (e) { parsedInfo = {}; }
            }
            return { ...c, client_info: parsedInfo };
          });
        setContracts(validContracts);
      } catch (err) {
        console.error('Error fetching contracts for autocomplete:', err);
      }
    };
    fetchContracts();
  }, []);

  // Sync prop value to input if it changes externally
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  // Filter contracts based on input
  const filteredContracts = contracts.filter(contract => {
    const query = inputValue.trim().toLowerCase();

    const name = contract.client_info.name?.toLowerCase() || '';
    const eventType = contract.client_info.event_type?.toLowerCase() || '';
    const customEventType = contract.client_info.custom_event_type?.toLowerCase() || '';
    
    return name.includes(query) || eventType.includes(query) || customEventType.includes(query);
  });

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelectContract = (contract) => {
    // Format the composed event string
    const eventTypeStr = contract.client_info.event_type === 'custom' 
      ? contract.client_info.custom_event_type 
      : contract.client_info.event_type;
      
    // Handle the case where event type might be "Mariage" or something else
    const composed = `${eventTypeStr} ${contract.client_info.name}`.trim();
    
    setInputValue(composed);
    onChange(composed);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className || ''}`} ref={wrapperRef}>
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        maxLength={100}
      />
      
      {isOpen && inputValue.trim().length >= 3 && (
        <div className="absolute z-[99999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul>
            {filteredContracts.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 text-center">
                {contracts.length === 0 ? "Chargement des contrats..." : "Aucun contrat trouvé"}
              </li>
            ) : (
              filteredContracts.map(contract => {
                const eventTypeStr = contract.client_info.event_type === 'custom' 
                  ? contract.client_info.custom_event_type 
                  : contract.client_info.event_type;
                const dateStr = contract.client_info.event_date 
                  ? new Date(contract.client_info.event_date).toLocaleDateString('fr-FR')
                  : '';
                  
                return (
                  <li 
                    key={contract.id}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors flex justify-between items-center"
                    onClick={() => handleSelectContract(contract)}
                  >
                    <div className="flex flex-col">
                      <span className="text-black font-medium">{contract.client_info.name || 'Nom manquant'}</span>
                      <span className="text-gray-400 text-sm">
                        {eventTypeStr} {dateStr ? `- ${dateStr}` : ''}
                      </span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
