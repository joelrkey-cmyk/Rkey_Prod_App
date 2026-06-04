let API_BASE_URL = '';
if (typeof window !== 'undefined') {
  API_BASE_URL = window.location.origin;
}
export default API_BASE_URL;
