import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth.jsx';
import useWhatsAppAutomation from '../hooks/useWhatsAppAutomation.js';

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.891-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.398 1.919 6.166l-1.138 4.162 4.273-1.12z" />
  </svg>
);

export default function WhatsAppNumberModal({ open, onClose }) {
  const { user } = useAuth() || {};
  const { saveUserWhatsAppNumber, getUserWhatsAppNumber, getUserWhatsAppDevice } = useWhatsAppAutomation(user?.uid);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [device, setDevice] = useState('web');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detectedDevice, setDetectedDevice] = useState('web');

  // Detectar automáticamente el dispositivo actual
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
    setDetectedDevice(isMobile ? 'mobile' : 'web');
  }, []);

  // Cargar número actual al abrir modal
  useEffect(() => {
    if (open && user?.uid) {
      loadCurrentSettings();
    }
  }, [open, user?.uid]);

  const loadCurrentSettings = async () => {
    setLoading(true);
    const currentNumber = await getUserWhatsAppNumber();
    const currentDevice = await getUserWhatsAppDevice();

    if (currentNumber) setPhoneNumber(currentNumber);
    // Usar dispositivo guardado, o si no hay, usar el detectado
    if (currentDevice) {
      setDevice(currentDevice);
    } else {
      setDevice(detectedDevice);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!phoneNumber.trim()) {
      alert('Por favor ingresa un número de WhatsApp');
      return;
    }

    setSaving(true);
    try {
      const success = await saveUserWhatsAppNumber(phoneNumber.trim(), device);
      if (success) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          onClose();
        }, 2000);
      } else {
        alert('Error al guardar el número');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-green-600 to-emerald-600">
          <WhatsAppIcon />
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">Configurar WhatsApp</h3>
            <p className="text-green-100 text-xs">Tu número y dispositivo</p>
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
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              💡 Puedes cambiar tu número en cualquier momento. Los cambios se guardan automáticamente.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Número de WhatsApp
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+54 9 11 23456789"
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Incluye el código de país (+54 para Argentina)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Dispositivo
            </label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="web">WhatsApp Web (navegador)</option>
              <option value="mobile">WhatsApp App (celular)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              {device === 'web'
                ? 'Se abrirá en web.whatsapp.com'
                : 'Se abrirá en tu app de WhatsApp (celular)'}
            </p>
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl shadow-lg shadow-green-600/20 transition-all disabled:opacity-50"
          >
            {saving ? '⏳ Guardando...' : '✓ Guardar'}
          </button>
        </div>

        {saved && (
          <div className="px-5 py-3 bg-green-600/20 border-t border-green-600/30 text-center">
            <p className="text-sm font-semibold text-green-300">¡Guardado correctamente!</p>
          </div>
        )}
      </div>
    </div>
  );
}
