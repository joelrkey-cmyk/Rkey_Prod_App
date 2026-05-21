import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from 'sonner';
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./components/LoginPage";
import LocationApp from "./components/LocationApp";
import Navigation from "./components/Navigation";
import HomePage from "./components/HomePage";
import ContractHtmlPreview from "./components/ContractHtmlPreview";
import Settings from "./components/Settings";
import Contracts2App from "./components/Contracts2App";
import CRMApp from "./components/CRMApp";
import BilletterieApp from "./components/BilletterieApp";
import DjProfilesApp from "./components/DjProfilesApp";
import DevisEnvoiApp from "./components/DevisEnvoiApp";
import ContractEmailPage from "./components/ContractEmailPage";
import RentalApp from "./components/rental/RentalApp";
import DeliveryApp from "./components/delivery/DeliveryApp";
import MobileHome from "./components/mobile/MobileHome";

import AbonnementsApp from "./components/AbonnementsApp";
import FormsApp from "./components/FormsApp";
import GlobalSettingsApp from "./components/GlobalSettingsApp";
import PartnersApp from "./components/PartnersApp";
import DjClientApp from "./components/DjClientApp";
import AgendaPrestationApp from "./components/AgendaPrestationApp";

const SmartHomePage = () => {
  const savedUser = localStorage.getItem('user');
  let interfaceType = 'desktop';
  try {
    const u = JSON.parse(savedUser);
    interfaceType = u?.interface_type || (u?.role === 'location' ? 'mobile' : 'desktop');
  } catch(e) {}
  if (interfaceType === 'mobile') return <MobileHome />;
  return <HomePage />;
};

function App() {
  return (
    <ErrorBoundary>
      <div className="App min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Page de connexion - publique */}
              <Route path="/login" element={<LoginPage />} />
              
              <Route path="/contracts/html-preview/:id" element={
                <ErrorBoundary>
                  <ContractHtmlPreview />
                </ErrorBoundary>
              } />
              
              {/* Page d'accueil - protégée */}
              <Route path="/" element={
                <ProtectedRoute>
                  <SmartHomePage />
                </ProtectedRoute>
              } />
              
              <Route path="/contracts2" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <Contracts2App />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />

              <Route path="/contracts2/send-email" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <ContractEmailPage />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
              
              <Route path="/location/*" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <LocationApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
              
              <Route path="/rental/*" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <RentalApp />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              
              <Route path="/delivery/*" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DeliveryApp />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              
              
              <Route path="/crm" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <CRMApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
              
              <Route path="/billetterie" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <BilletterieApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
              
              <Route path="/dj-client" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <DjClientApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />

              <Route path="/abonnements" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <AbonnementsApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
              
              <Route path="/dj-profiles" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <DjProfilesApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <Settings />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
              
              <Route path="/devis" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <DevisEnvoiApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />

              <Route path="/agenda-prestation" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <AgendaPrestationApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
              
              <Route path="/formulaires" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <FormsApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />

              <Route path="/parametres" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <GlobalSettingsApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />

              <Route path="/partenaires" element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ErrorBoundary>
                      <PartnersApp />
                    </ErrorBoundary>
                  </>
                </ProtectedRoute>
              } />
               <Route path="/:slug" element={
                 <ErrorBoundary>
                   <DjClientApp isPublic={true} />
                 </ErrorBoundary>
               } />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}

export default App;
