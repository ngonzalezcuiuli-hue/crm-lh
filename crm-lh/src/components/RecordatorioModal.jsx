import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function RecordatorioModal({ open, onClose, onSave, initialData = null }) {
  const [fechaProximo, setFechaProximo] = useState('');
  const [nota, setNota] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && initialData?.recordatorio?.fechaProximoContacto) {
      try {
        const date = initialData.recordatorio.fechaProximoContacto.toDate
          ? initialData.recordatorio.fechaProximoContacto.toDate()
          : new Date(initialData.recordatorio.fechaProximoContacto);

        const dateStr = date.toISOString().split('T')[0];
        setFechaProximo(dateStr);
        setNota(initialData.recordatorio.nota || '');
      } catch (e) {
        setFechaProximo('');
        setNota('');
      }
    } else {
      setFechaProximo('');
      setNota('');
    }
    setError('');
  }, [open, initialData]);

  if (!open) return null;

  const handleSave = async () => {
    if (!fechaProximo) {
      setError('Por favor selecciona una fecha');
      return;
    }

    const selectedDate = new Date(fechaProximo);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError('La fecha debe ser en el futuro');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        fechaProximoContacto: selectedDate,
        nota: nota.trim()
      });
    } catch (err) {
      setError('Error al guardar el recordatorio');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onSave(null);
    } catch (err) {
      setError('Error al limpiar el recordatorio');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const diasFuturos = fechaProximo ? Math.ceil((new Date(fechaProximo) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-600 to-orange-600">
          <Calendar className="w-5 h-5 text-white" />
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">Agendar Contacto</h3>
            <p className="text-amber-100 text-xs">Próxima fecha de contacto</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors text-xl font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-600/20 border border-red-500/50 rounded-lg px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              📅 Próximo Contacto
            </label>
            <input
              type="date"
              value={fechaProximo}
              onChange={(e) => {
                setFechaProximo(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
            {diasFuturos && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {diasFuturos === 1 ? 'Mañana' : `En ${diasFuturos} días`}
              </p>
            )}
          </div>

          {/* Nota */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              📝 Nota (Opcional)
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Llamar primero, hablar sobre descuentos..."
              maxLength={250}
              className="w-full min-h-[90px] px-3 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
            <p className="text-xs text-slate-400 text-right">
              {nota.length}/250
            </p>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-800/80 border-t border-slate-700/50">
          <button
            onClick={handleClear}
            disabled={isSaving}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-700/50 disabled:opacity-50"
            title="Limpiar recordatorio"
          >
            Limpiar
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !fechaProximo}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '✓ Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
