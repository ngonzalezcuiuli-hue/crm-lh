import React, { useState, useMemo } from "react";
import KanbanBoard from "../components/KanbanBoard";
import LeadModal from "../components/LeadModal";
import LossReasonModal from "../components/LossReasonModal";
import Topbar from "../components/Topbar";
import Spinner from "../components/Spinner";
import StandBySection from "../components/StandBySection";
import { useAuthContext } from '../hooks/useAuth.jsx';
import useLeads from "../hooks/useLeads";
import useStandByLeads from "../hooks/useStandByLeads";
import { createLead, updateLead, markLeadLost, startOnboarding, moveLeadToStage } from "../services/leadsService";
import { buildNexoExportRows, downloadCSV } from "../utils/exportLeads";

const RAZONES_DE_PERDIDA = ["Por precio", "Preexistencia", "Embarazo", "Por edad", "Dato error", "Imposible contactar", "Cotizado sin respuesta"];

export default function FunnelPage() {
  const { user } = useAuthContext() || {};
  // El hook useLeads ahora se ejecutará de forma segura solo cuando user.uid exista
  const { leads, loading: leadsLoading } = useLeads(user?.uid);
  const { leads: standByLeads, loading: standByLoading } = useStandByLeads(user?.uid);

  const [searchTerm, setSearchTerm] = useState('');
  const [isLeadModalOpen, setLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [isLossModalOpen, setLossModalOpen] = useState(false);
  const [losingLead, setLosingLead] = useState(null);

  const boardData = useMemo(() => {
    // Obtener IDs de leads en Stand By para excluirlos del Kanban
    const standByIds = new Set(standByLeads.map(l => l.id));

    // Filtrar leads: excluir los que están en Stand By
    const filteredLeads = leads.filter(lead => {
      if (standByIds.has(lead.id)) return false;

      const searchTermLower = searchTerm.toLowerCase();
      const nombreLower = lead.nombre?.toLowerCase() || '';
      const tramiteLower = lead.numeroTramite?.toLowerCase() || '';
      return nombreLower.includes(searchTermLower) || tramiteLower.includes(searchTermLower);
    });

    return filteredLeads.reduce((acc, lead) => {
      const stage = lead.etapa;
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(lead);
      return acc;
    }, {});
  }, [leads, standByLeads, searchTerm]);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    moveLeadToStage({ userId: user.uid, leadId: draggableId, newEtapa: destination.droppableId });
  };

  const handleNewLead = () => { setEditingLead(null); setLeadModalOpen(true); };
  const handleEditLead = (lead) => { setEditingLead(lead); setLeadModalOpen(true); };
  const handleSaveLead = async (leadData) => {
    if (!user) return;
    try {
      if (editingLead) await updateLead(user.uid, editingLead.id, leadData);
      else await createLead(user.uid, leadData);
      setLeadModalOpen(false); setEditingLead(null);
    } catch (error) { console.error("Error al guardar el lead:", error); }
  };
  const handleMarkLost = (lead) => { setLosingLead(lead); setLossModalOpen(true); };
  const confirmMarkLost = async (reason) => {
    if (!user || !losingLead) return;
    await markLeadLost({ userId: user.uid, leadId: losingLead.id, reason: reason });
    setLossModalOpen(false); setLosingLead(null);
  };
  const handleStartOnboarding = async (lead) => {
    if (!user) return;
    if (confirm(`¿Seguro que quieres iniciar el alta para ${lead.nombre}?`)) {
      await startOnboarding({ userId: user.uid, leadId: lead.id });
    }
  };

  const handleExportLeads = () => {
    if (!leads || leads.length === 0) return;
    const rows = buildNexoExportRows(leads);
    downloadCSV(rows, 'leads_funnel_nexo');
  };

  return (
    <>
      <Topbar onNew={handleNewLead} searchTerm={searchTerm} onSearchChange={setSearchTerm} onExport={handleExportLeads} exportCount={leads.length} />
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
        {leadsLoading || standByLoading ? (
          <Spinner />
        ) : (
          <>
            {/* Kanban Board */}
            <KanbanBoard
              data={boardData}
              onDragEnd={handleDragEnd}
              onEdit={handleEditLead}
              onMarkLost={handleMarkLost}
              onStartOnboarding={handleStartOnboarding}
              userName={user?.displayName}
              makeWebhookUrl={user?.makeWebhookUrl}
            />

            {/* Stand By Section (Al Final) */}
            {standByLeads.length > 0 && (
              <StandBySection leads={standByLeads} />
            )}
          </>
        )}
      </div>
      {isLeadModalOpen && <LeadModal open={isLeadModalOpen} onClose={() => setLeadModalOpen(false)} onSave={handleSaveLead} initialData={editingLead} onStartOnboarding={handleStartOnboarding} />}
      {isLossModalOpen && <LossReasonModal open={isLossModalOpen} onClose={() => setLossModalOpen(false)} onConfirm={confirmMarkLost} reasons={RAZONES_DE_PERDIDA} />}
    </>
  );
}
