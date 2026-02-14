import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import KanbanBoard from '../components/KanbanBoard';
import LostList from '../components/LostList';
import Reports from '../components/Reports'; // Nueva importación

const AppRoutes = () => {
  return (
    <Routes>
      {/* Ruta por defecto */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />
      
      {/* Kanban Board */}
      <Route path="/kanban" element={<KanbanBoard />} />
      
      {/* Lost Leads */}
      <Route path="/lost" element={<LostList />} />
      
      {/* Reports - Nueva ruta */}
      <Route path="/reports" element={<Reports />} />
      
      {/* Ruta por defecto para rutas no encontradas */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;