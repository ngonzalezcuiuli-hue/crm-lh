import React, { useState } from 'react';
import { useAuthContext } from '../hooks/useAuth.jsx';
import useCompletedLeads from '../hooks/useCompletedLeads';
import Topbar from '../components/Topbar';
import Spinner from '../components/Spinner';
import CompletedLeadCard from '../components/CompletedLeadCard';
import LeadModal from '../components/LeadModal';
import { updateLead } from '../services/leadsService';
import { buildNexoExportRows, downloadCSV } from '../utils/exportLeads';

export default function CompletadosPage() {
  const { user } = useAuthContext() || {};
  const { completedLeads, loading } = useCompletedLeads(user?.uid);

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setModalOpen(true);
  };

  const handleSaveLead = async (leadDataFromModal) => {
    if (!user) return;
    try {
      await updateLead(user.uid, editingLead.id, leadDataFromModal);
      setModalOpen(false);
      setEditingLead(null);
    } catch (error) {
      console.error("Error al actualizar el lead:", error);
    }
  };

  const handleExport = () => {
    if (!completedLeads || completedLeads.length === 0) return;
    const rows = buildNexoExportRows(completedLeads);
    downloadCSV(rows, 'leads_completados_nexo');
  };

  return (
    <>
      <Topbar onExport={handleExport} exportCount={completedLeads.length} />
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Leads Completados</h1>
        {loading ? (
          <Spinner />
        ) : completedLeads.length > 0 ? (
          <div className="space-y-4">
            {completedLeads.map(lead => (
              <CompletedLeadCard
                key={lead.id}
                lead={lead}
                onEdit={handleEditLead}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Aún no hay leads completados.</p>
        )}
      </div>

      {isModalOpen && (
        <LeadModal
          open={isModalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveLead}
          initialData={editingLead}
        />
      )}
    </>
  );
}