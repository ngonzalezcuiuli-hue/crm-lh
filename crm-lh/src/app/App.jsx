// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { useAuthContext, AuthProvider } from '../hooks/useAuth.jsx';
import { auth } from '../services/firebase';
import { updateProfile } from 'firebase/auth';

import LoginPage from '../pages/LoginPage';
import FunnelPage from '../pages/FunnelPage';
import ProcesoPage from '../pages/ProcesoPage';
import InformesPage from '../pages/InformesPage';
import CompletadosPage from '../pages/CompletadosPage';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Dashboard';
import LostList from '../components/LostList';
import Spinner from '../components/Spinner';
import ProfileNameModal from '../components/ProfileNameModal';
import IntegrationsPage from '../pages/IntegrationsPage';

function AppLayout() {
  const { user } = useAuthContext();
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user && !user.displayName) setProfileModalOpen(true);
  }, [user]);

  const handleSaveProfileName = async (nombre) => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: nombre });
        setProfileModalOpen(false);
        window.location.reload();
      }
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
    }
  };

  return (
    <>
      <div className="h-screen flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden fixed top-3 left-3 z-30 bg-white shadow-lg rounded-full p-2 text-gray-700 hover:bg-gray-100"
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <ProfileNameModal open={isProfileModalOpen} onSave={handleSaveProfileName} />
    </>
  );
}


function AuthRouter() {
  const { user, loading: authLoading } = useAuthContext();
  if (authLoading) return <Spinner />;

  return (
    <BrowserRouter>
      <Routes>
        {user ? (
          <Route path="/*" element={<AppLayout />}>
            <Route index element={<FunnelPage />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="proceso" element={<ProcesoPage />} />
            <Route path="perdidos" element={<LostList />} />
            <Route path="completados" element={<CompletadosPage />} />
            <Route path="informes" element={<InformesPage />} />
            <Route path="integraciones" element={<IntegrationsPage />} />
          </Route>
        ) : (
          <Route path="*" element={<LoginPage />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthRouter />
    </AuthProvider>
  );
}
