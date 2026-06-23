import axios from "axios";
import API_BASE_URL from "../utils/apiUrl";

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add Authorization token
axiosInstance.interceptors.request.use(
  (config) => {
    if (config.url && (config.url.startsWith('/api') || (API_BASE_URL && config.url.startsWith(`${API_BASE_URL}/api`)))) {
      config.baseURL = API_BASE_URL;
    }
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and retry on 429
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { config, response } = error;

    // Retry request on 429 (Too Many Requests) with exponential backoff
    if (response && response.status === 429 && config) {
      config.__retryCount = config.__retryCount || 0;
      const maxRetries = 3;

      if (config.__retryCount < maxRetries) {
        config.__retryCount += 1;
        const delay = config.__retryCount * 500;
        console.warn(`Request to ${config.url || ''} failed with 429. Retrying in ${delay}ms (Attempt ${config.__retryCount}/${maxRetries})...`);
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        return axiosInstance(config);
      }
    }

    if (error.response && error.response.status === 401) {
      const isLoginPath = window.location.pathname === "/login";
      if (!isLoginPath) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
