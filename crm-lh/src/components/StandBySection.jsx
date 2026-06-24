import React, { useState } from 'react';
import { Clock, CheckCircle, X } from 'lucide-react';
import { clearRecordatorio, moveLeadToStage } from '../services/leadsService';
import useAuth from '../hooks/useAuth.jsx';

export default function StandBySection({ leads = [], onLeadActivated = null }) {
  const { user } = useAuth() || {};
  const [activatingId, setActivatingId] = useState(null);

  const calculateDaysUntil = (date) => {
    try {
      const fechaProximo = date.toDate ? date.toDate() : new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      fechaProximo.setHours(0, 0, 0, 0);
      const diffTime = fechaProximo - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return 0;
    }
  };

  const formatDate = (date) => {
    try {
      const fechaProximo = date.toDate ? date.toDate() : new Date(date);
      return fechaProximo.toLocaleDateString('es-AR', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  };

  const handleActivateNow = async (lead) => {
    if (!user?.uid) {
      alert('Error: No se pudo obtener el usuario');
      return;
    }

    setActivatingId(lead.id);
    try {
      // Mover el lead a su etapa original (o Primer Contacto si no existe)
      const etapaActual = lead.etapa || 'Primer Contacto';
      await moveLeadToStage({ userId: user.uid, leadId: lead.id, newEtapa: etapaActual });

      // Limpiar el recordatorio
      await clearRecordatorio({ userId: user.uid, leadId: lead.id });

      if (onLeadActivated) onLeadActivated(lead);
    } catch (error) {
      console.error('Error activando lead:', error);
      alert('Error al activar el lead');
    } finally {
      setActivatingId(null);
    }
  };

  if (leads.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Stand By</h3>
        <span className="text-sm font-semibold bg-amber-600/40 text-amber-200 px-3 py-1 rounded-full border border-amber-500/50">
          {leads.length} agendado{leads.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {leads.map((lead) => {
          const daysUntil = calculateDaysUntil(lead.recordatorio.fechaProximoContacto);
          const formattedDate = formatDate(lead.recordatorio.fechaProximoContacto);

          return (
            <div
              key={lead.id}
              className="bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-orange-900/40 backdrop-blur-sm rounded-xl p-4 border border-amber-700/50 shadow-lg hover:shadow-xl transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-bold text-white text-sm truncate">{lead.nombre}</p>
                  <p className="text-xs text-amber-300 mt-0.5">{lead.numeroTramite || 'Sin Trámite'}</p>
                </div>
                <span className="text-xs font-semibold bg-amber-600/60 text-amber-100 px-2 py-1 rounded">
                  {lead.etapa}
                </span>
              </div>

              {/* Fecha Próximo Contacto */}
              <div className="flex items-center gap-2 mb-3 p-2 bg-amber-600/40 rounded-lg">
                <Calendar className="w-4 h-4 text-amber-300" />
                <div>
                  <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Reactiva</p>
                  <p className="text-sm font-bold text-amber-100">{formattedDate}</p>
                  <p className="text-[10px] text-amber-300 mt-0.5">
                    {daysUntil === 0
                      ? '⏰ Hoy'
                      : daysUntil === 1
                      ? '⏰ Mañana'
                      : `⏱️ En ${daysUntil} días`}
                  </p>
                </div>
              </div>

              {/* Nota si existe */}
              {lead.recordatorio.nota && (
                <p className="text-xs text-slate-300 mb-3 p-2 bg-slate-800/40 rounded border border-slate-700/50">
                  <span className="text-slate-400 font-semibold">📝 Nota:</span> {lead.recordatorio.nota}
                </p>
              )}

              {/* Contacto */}
              {lead.celular && (
                <p className="text-xs text-slate-400 mb-3">
                  <span className="text-slate-500">📱</span> {lead.celular}
                </p>
              )}

              {/* Botón Activar Ahora */}
              <button
                onClick={() => handleActivateNow(lead)}
                disabled={activatingId === lead.id}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activatingId === lead.id ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Activando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Activar Ahora
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Calendar = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <path d="M16 2v4M8 2v4M3 10h18"></path>
  </svg>
);
