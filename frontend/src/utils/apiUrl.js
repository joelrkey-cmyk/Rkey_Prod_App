// Centralized API URL detection
// In production (Hostinger), the frontend and backend are on the same domain
// In preview (Emergent), we use the REACT_APP_BACKEND_URL environment variable
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'rkeyprodapp.fr' || hostname === 'www.rkeyprodapp.fr') {
    return window.location.origin;
  }
  return process.env.REACT_APP_BACKEND_URL || window.location.origin;
};

export const API_BASE_URL = getApiBaseUrl();
export default API_BASE_URL;
