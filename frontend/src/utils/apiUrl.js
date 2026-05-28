let origin = typeof window !== 'undefined' ? window.location.origin : '';
if (origin === 'null' || !origin) {
  origin = '';
}
let API_BASE_URL = process.env.REACT_APP_API_URL || origin;
if (API_BASE_URL && API_BASE_URL.endsWith('/')) {
  API_BASE_URL = API_BASE_URL.slice(0, -1);
}
export default API_BASE_URL;
