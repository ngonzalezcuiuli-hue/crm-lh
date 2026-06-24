// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { useAuthContext, AuthProvider } from '../hooks/useAuth.jsx';
import { useWhatsAppNotifications } from '../hooks/useWhatsAppNotifications';
import LoginPage from '../pages/LoginPage';
import FunnelPage from '../pages/FunnelPage';
import ProcesoPage from '../pages/ProcesoPage';
import InformesPage from '../pages/InformesPage';
import CompletadosPage from '../pages/CompletadosPage';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Dashboard';
import LostList from '../components/LostList';
import Spinner from '../components/Spinner';
import ProfileModal from '../components/ProfileModal';
import IntegrationsPage from '../pages/IntegrationsPage';
import WhatsAppNotificationBell from '../components/WhatsAppNotificationBell';

function AppLayout() {
  const { user } = useAuthContext();
  const [isFirstTimeModal, setFirstTimeModal] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Monitorear notificaciones de WhatsApp
  useWhatsAppNotifications();

  useEffect(() => {
    if (user && !user.displayName) setFirstTimeModal(true);
  }, [user]);

  return (
    <>
      <div className="h-screen flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenProfile={() => setProfileModalOpen(true)}
        />
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Header con campana de notificaciones */}
          <div className="bg-slate-800/50 border-b border-slate-700/50 px-4 md:px-8 py-3 flex items-center justify-between">
            {/* Mobile hamburger button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden bg-slate-700 hover:bg-slate-600 rounded-lg p-2 text-white transition-colors"
              aria-label="Abrir menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1" />
            {/* WhatsApp Notification Bell */}
            <WhatsAppNotificationBell />
          </div>

          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <ProfileModal
        open={isFirstTimeModal}
        onClose={() => setFirstTimeModal(false)}
        isFirstTime={true}
      />
      <ProfileModal
        open={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        isFirstTime={false}
      />
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
