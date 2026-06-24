import React, { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthContext } from '../hooks/useAuth.jsx';
import { db } from "../services/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

// Hooks
import useLeads from "../hooks/useLeads";
import useOnboardingLeads from "../hooks/useOnboardingLeads";

// Utils
import { getFunnelTimeInfo } from "../utils/funnelTimeUtils";
import { getOnboardingTimeInfo } from "../utils/timeUtils";

// Constantes
const STAGE_ORDER = ['Primer Contacto', 'Segundo Contacto', 'Cotización', 'Seguimiento', 'Cierre'];

// --- Componentes Internos ---

const NavItem = ({ to, children, alertCount, onClick }) => {
  const baseClasses = "flex justify-between items-center p-2 rounded-md text-sm font-medium transition-colors";
  const activeClasses = "bg-blue-100 text-blue-700";
  const inactiveClasses = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";

  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      <span>{children}</span>
      {alertCount > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {alertCount}
        </span>
      )}
    </NavLink>
  );
};

const StatusPill = ({ label, count, color }) => (
  <div className="flex justify-between items-center text-xs px-2 py-1.5 bg-gray-50 rounded-md">
    <span className="font-semibold text-gray-700">{label}</span>
    <span className={`font-bold px-2 py-0.5 rounded-full text-white ${color}`}>
      {count}
    </span>
  </div>
);

const StageDetail = ({ stage, counts }) => (
  <div className="flex justify-between items-center text-xs px-2 py-1.5">
    <span className="font-medium text-gray-500 truncate">{stage}</span>
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="font-bold bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">
        {counts.total}
      </span>
      {counts.green > 0 && <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span><span className="text-gray-600 font-medium">{counts.green}</span></div>}
      {counts.yellow > 0 && <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400"></span><span className="text-gray-600 font-medium">{counts.yellow}</span></div>}
      {counts.red > 0 && <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"></span><span className="text-gray-600 font-medium">{counts.red}</span></div>}
    </div>
  </div>
);


export default function Sidebar({ isOpen, onClose, onOpenProfile }) {
  const { user } = useAuthContext() || {};
  const [allLeadsForTotals, setAllLeadsForTotals] = useState([]);
  const { leads: funnelLeads } = useLeads(user?.uid);
  const { onboardingLeads } = useOnboardingLeads(user?.uid);
  const location = useLocation();

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const leadsRef = collection(db, `users/${user.uid}/leads`);
    const q = query(leadsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllLeadsForTotals(leadsData);
    });
    return () => unsubscribe();
  }, [user]);

  // --- CÁLCULOS ---
  const funnelAlertCount = useMemo(() => funnelLeads.filter(lead => (getFunnelTimeInfo(lead).colorState === 'yellow' || getFunnelTimeInfo(lead).colorState === 'red')).length, [funnelLeads]);
  const onboardingAlertCount = useMemo(() => onboardingLeads.filter(lead => (getOnboardingTimeInfo(lead.lastUpdatedAt).colorState === 'yellow' || getOnboardingTimeInfo(lead.lastUpdatedAt).colorState === 'red')).length, [onboardingLeads]);

  const monthlyLeadsCount = useMemo(() => {
    const now = new Date();
    return allLeadsForTotals.filter(lead => {
      const leadDate = lead.createdAt?.toDate();
      return leadDate && leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
    }).length;
  }, [allLeadsForTotals]);

  const funnelStageCounts = useMemo(() => {
    const counts = {};
    funnelLeads.forEach(lead => {
      const stage = lead.etapa;
      if (!counts[stage]) counts[stage] = { total: 0, green: 0, yellow: 0, red: 0 };
      counts[stage].total++;
      const { colorState } = getFunnelTimeInfo(lead);
      counts[stage][colorState]++;
    });
    return counts;
  }, [funnelLeads]);

  const otherStatusCounts = useMemo(() => ({
    totalActivos: funnelLeads.length,
    onboarding: allLeadsForTotals.filter(l => l.estado === 'Onboarding').length,
    completado: allLeadsForTotals.filter(l => l.estado === 'Completado').length,
    perdido: allLeadsForTotals.filter(l => l.estado === 'Perdido').length,
  }), [allLeadsForTotals, funnelLeads]);

  const sidebarContent = (
    <>
      {/* Close button - only visible on mobile */}
      <div className="flex items-center justify-between mb-2 md:hidden">
        <span className="text-sm font-bold text-gray-700">Menú</span>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          aria-label="Cerrar menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex flex-col gap-2">
        <NavItem to="/" alertCount={funnelAlertCount}>Funnel de Ventas</NavItem>
        <NavItem to="/dashboard">Dashboard</NavItem>
        <NavItem to="/proceso" alertCount={onboardingAlertCount}>Proceso</NavItem>
        <NavItem to="/perdidos">Perdidos</NavItem>
        <NavItem to="/completados">Completados</NavItem>
        <NavItem to="/informes">Informes</NavItem>
        <NavItem to="/integraciones">Integraciones</NavItem>
      </nav>

      <div className="mt-6 pt-4 border-t space-y-5">
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Leads del Mes</p>
          <p className="text-3xl font-bold text-blue-600">{monthlyLeadsCount}</p>
        </div>

        {otherStatusCounts.totalActivos > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Funnel Activo</h3>
            <div className="bg-gray-50 rounded-md p-1.5 space-y-1">
              <StatusPill label="Total en Funnel" count={otherStatusCounts.totalActivos} color="bg-blue-500" />
              <hr className="border-gray-200" />
              {STAGE_ORDER.map(stage =>
                funnelStageCounts[stage]?.total > 0 && (
                  <StageDetail key={stage} stage={stage} counts={funnelStageCounts[stage]} />
                )
              )}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Otros Estados</h3>
          <div className="space-y-1">
            <StatusPill label="En Proceso" count={otherStatusCounts.onboarding} color="bg-yellow-500" />
            <StatusPill label="Completados" count={otherStatusCounts.completado} color="bg-green-500" />
            <StatusPill label="Perdidos" count={otherStatusCounts.perdido} color="bg-red-500" />
          </div>
        </div>

        <div className="pt-3 border-t">
          <button
            onClick={onOpenProfile}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-left"
          >
            <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="truncate font-medium">{user?.displayName || 'Mi Perfil'}</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar — always visible on md+ */}
      <div className="hidden md:flex w-52 bg-white p-3 border-r shadow-sm flex-col overflow-y-auto">
        {sidebarContent}
      </div>

      {/* Mobile Drawer — only on < md */}
      {/* Overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white p-4 shadow-xl flex-col overflow-y-auto sidebar-drawer md:hidden ${isOpen ? 'open flex' : 'closed'}`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
