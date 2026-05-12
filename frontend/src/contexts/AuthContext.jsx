import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { API_BASE_URL } from '../utils/apiUrl';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize authentication state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            // Token expired or invalid
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (username, password) => {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
    } catch (e) {
      throw new Error(`Erreur réseau: impossible de contacter le serveur (${e.message})`);
    }

    if (!response.ok) {
      let errorDetail = 'Identifiant ou mot de passe incorrect';
      try {
        const error = await response.json();
        errorDetail = error.detail || errorDetail;
      } catch (e) {
        // Not a JSON response
        if (response.status === 503) errorDetail = "Le serveur est en cours de démarrage ou la base de données est déconnectée.";
        else if (response.status === 404) errorDetail = "Route d'authentification non trouvée (404).";
        else errorDetail = `Erreur serveur (${response.status}).`;
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    setUser(data.user);
    setIsAuthenticated(true);
    
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
