// Constantes et helpers partagés pour le module Location
import axios from '../../services/axiosConfig';

import API_BASE_URL from '../../utils/apiUrl';
export const BACKEND_URL = API_BASE_URL;
export const API = `${BACKEND_URL}/api/location`;

// Helper function to format date in local timezone (YYYY-MM-DD)
export const formatDateLocal = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export { axios };
