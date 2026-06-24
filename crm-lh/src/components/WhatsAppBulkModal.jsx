import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth.jsx';
import useWhatsAppAutomation from '../hooks/useWhatsAppAutomation.js';
import { getDefaultMessageByStage } from '../services/whatsappAutomationService';

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.891-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.398 1.919 6.166l-1.138 4.162 4.273-1.12z" />
  </svg>
);

export default function WhatsAppBulkModal({ open, onClose, leads = [], stage = 'Primer Contacto' }) {
  const { user } = useAuth() || {};
  const { sendBulkWhatsApp, scheduleWhatsAppBulk, loading: automationLoading } = useWhatsAppAutomation(user?.uid);

  const [message, setMessage] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sending, setSending] = useState(false);

  // Generar mensaje inicial usando {nombre} como placeholder personalizable por lead
  useEffect(() => {
    if (open && leads.length > 0) {
      const templateLead = { ...leads[0], nombre: '{nombre}' };
      const defaultMsg = getDefaultMessageByStage(templateLead, stage, user?.displayName || 'tu asesor');
      setMessage(defaultMsg);
      setShowScheduleForm(false);
    }
  }, [open, leads, stage, user?.displayName]);

  const leadsConCelular = leads.filter(l => l.celular);

  const handleSendNow = async () => {
    if (!message.trim()) {
      alert('Por favor escribe un mensaje');
      return;
    }

    setSending(true);
    try {
      const success = await sendBulkWhatsApp(leads, stage, message.trim(), user?.displayName || 'tu asesor');
      if (success) {
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        alert('Error al enviar los mensajes');
      }
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!message.trim()) {
      alert('Por favor escribe un mensaje');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      alert('Por favor selecciona fecha y hora');
      return;
    }

    setSending(true);
    try {
      const dateTimeString = `${scheduleDate}T${scheduleTime}`;
      const success = await scheduleWhatsAppBulk(leads, stage, dateTimeString, message.trim());
      if (success) {
        alert(`✓ ${leads.length} mensajes programados para ${scheduleDate} a las ${scheduleTime}`);
        onClose();
      } else {
        alert('Error al programar los mensajes');
      }
    } finally {
      setSending(false);
    }
  };

  if (!open || leads.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 bg-slate-800 rounded-2xl shadow-2xl border border-slate-600/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-green-600 to-emerald-600">
          <WhatsAppIcon />
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">Enviar Barrido</h3>
            <p className="text-green-100 text-xs">{stage} - {leads.length} mensaje{leads.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-bold">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Confirmación */}
          <div className="p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg space-y-1">
            <p className="text-sm text-blue-200">
              Se abrirá WhatsApp para <span className="font-bold">{leadsConCelular.length} lead{leadsConCelular.length !== 1 ? 's' : ''}</span> con número de celular.
            </p>
            {leadsConCelular.length < leads.length && (
              <p className="text-xs text-yellow-300">
                ⚠️ {leads.length - leadsConCelular.length} lead{leads.length - leadsConCelular.length !== 1 ? 's' : ''} sin celular serán ignorados.
              </p>
            )}
            <p className="text-xs text-blue-300 mt-1">
              El mensaje se personalizará con el nombre de cada lead.
            </p>
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Mensaje
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe o personaliza el mensaje..."
              className="w-full min-h-[120px] p-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Usá <span className="font-mono bg-slate-700 px-1 rounded">{'{nombre}'}</span> donde quieras insertar el nombre de cada lead. Se reemplazará automáticamente al enviar.
            </p>
          </div>

          {/* Formulario de programación (condicional) */}
          {showScheduleForm && (
            <div className="p-4 bg-slate-700/50 border border-slate-600/30 rounded-lg space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">Programar para más tarde</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Hora</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-800/80 border-t border-slate-700/50">
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors underline"
          >
            {showScheduleForm ? 'Cancelar programación' : '⏱️ Programar para después'}
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
            >
              Cancelar
            </button>

            {showScheduleForm ? (
              <button
                onClick={handleSchedule}
                disabled={sending || automationLoading}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                {sending ? '⏳ Programando...' : '📅 Programar'}
              </button>
            ) : (
              <button
                onClick={handleSendNow}
                disabled={sending || automationLoading || leadsConCelular.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl shadow-lg shadow-green-600/20 transition-all disabled:opacity-50"
              >
                <WhatsAppIcon />
                {sending ? '⏳ Enviando...' : `Enviar ${leadsConCelular.length}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
