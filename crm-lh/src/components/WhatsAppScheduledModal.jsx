import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import useWhatsAppAutomation from '../hooks/useWhatsAppAutomation';

export default function WhatsAppScheduledModal({ open, onClose, pendingLeads, onSent }) {
  const { user } = useAuth() || {};
  const { sendBulkWhatsApp } = useWhatsAppAutomation(user?.uid);
  const [sending, setSending] = useState(false);

  const handleSendAll = async () => {
    if (pendingLeads.length === 0) {
      onClose();
      return;
    }

    setSending(true);
    try {
      // Agrupar por etapa
      const byStage = {};
      pendingLeads.forEach(lead => {
        const stage = lead.whatsappProximo?.etapa || 'Seguimiento';
        if (!byStage[stage]) byStage[stage] = [];
        byStage[stage].push(lead);
      });

      // Enviar por cada etapa
      for (const [stage, leads] of Object.entries(byStage)) {
        await sendBulkWhatsApp(leads, stage);
      }

      onSent();
      setSending(false);
    } catch (error) {
      console.error('Error enviando mensajes programados:', error);
      setSending(false);
    }
  };

  if (!open || pendingLeads.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-slate-800 rounded-2xl shadow-2xl border border-slate-600/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-orange-600 to-red-600">
          <svg className="w-6 h-6 text-white animate-bounce" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">⏰ Mensajes Listos</h3>
            <p className="text-orange-100 text-xs">{pendingLeads.length} mensajes programados</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-6 space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <p className="text-sm text-orange-300">
              ⏱️ Estos {pendingLeads.length} mensajes fueron programados y llegó su hora de envío.
              <br />
              <strong>Haz click para abrirlos en WhatsApp</strong>
            </p>
          </div>

          {/* Lista de leads */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingLeads.map(lead => (
              <div
                key={lead.id}
                className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/30 hover:bg-slate-700/70 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{lead.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      📱 Etapa: <span className="text-slate-300">{lead.whatsappProximo?.etapa}</span>
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-orange-600/50 text-orange-200 text-xs rounded whitespace-nowrap">
                    Listo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-800/80 border-t border-slate-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSendAll}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50"
          >
            {sending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20m10-10H2" />
                </svg>
                Abriendo...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Enviar {pendingLeads.length}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
