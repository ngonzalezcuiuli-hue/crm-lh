// src/components/LostList.jsx
import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { useLostLeads } from '../hooks/useLostLeads';
import useAuth from '../hooks/useAuth.jsx';
import Spinner from './Spinner';
import WhatsAppModal from './WhatsAppModal';
import { buildNexoExportRows, downloadCSV } from '../utils/exportLeads';
import { reactivateLead } from '../services/leadsService';

export default function LostList() {
  const { lostLeads, rawLostLeads, loading } = useLostLeads();
  const { user } = useAuth();

  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [reasonFilter, setReasonFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [exportMessage, setExportMessage] = useState({ type: '', text: '' });

  // --- Estado para WhatsApp Modal (Recontacto) ---
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppLead, setWhatsAppLead] = useState(null);

  // --- Estado para Reactivación ---
  const [reactivatingId, setReactivatingId] = useState(null);
  const [confirmReactivateId, setConfirmReactivateId] = useState(null);
  const [reactivateMessage, setReactivateMessage] = useState({ type: '', text: '' });

  // ========================================================================
  // 1. MANEJO DE FECHAS (Solución "Invalid Date")
  // ========================================================================

  // Convierte fecha string "07/11/2025" -> llave "2025-11" para filtrar
  const getYearMonthKey = (dateStr) => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();

    // Si viene como DD/MM/AAAA (Formato que muestra tu tabla)
    if (s.includes('/')) {
      const parts = s.split('/'); // ["07", "11", "2025"]
      if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1].padStart(2, '0');
        const year = parts[2].split(' ')[0]; // Limpia si hay hora pegada
        return `${year}-${month}`; // Retorna "2025-11"
      }
    }
    // Si viene como ISO YYYY-MM-DD
    if (s.includes('-')) {
      return s.substring(0, 7);
    }
    return null;
  };

  // Muestra "Noviembre 2025" en el selector
  const formatMonthLabel = (yearMonthKey) => {
    if (!yearMonthKey) return '';
    try {
      const [year, month] = yearMonthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const text = date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
      return text.charAt(0).toUpperCase() + text.slice(1);
    } catch (e) {
      return yearMonthKey;
    }
  };

  // ========================================================================
  // 2. MAPEO DE DATOS (Basado en tu JSON de Firebase)
  // ========================================================================

  const normalizeText = (s) => (s ?? '').toString().trim();

  const resolveProvinciaLocalidad = (lead) => {
    const provincia = lead?.zona?.provincia || lead?.provincia || lead?.ubicacion?.provincia || '';
    const localidad = lead?.zona?.localidad || lead?.localidad || lead?.ubicacion?.localidad || '';

    return {
      provincia: normalizeText(provincia),
      localidad: normalizeText(localidad)
    };
  };

  const resolveInfoAdicional = (lead) => {
    const info = lead?.infoAdicional || {};
    const members = lead?.cotizacionMiembros || [];

    let edadesFinal = normalizeText(info.edades);
    if (!edadesFinal && Array.isArray(members) && members.length > 0) {
      edadesFinal = members
        .map(m => m.ageGroup)
        .filter(Boolean)
        .join(', ');
    }

    return {
      cantidadIntegrantes: normalizeText(info.cantidadIntegrantes ?? lead?.cantidadIntegrantes),
      edades: edadesFinal,
      cuitEmpleador: normalizeText(info.cuitEmpleador ?? info.cuit ?? lead?.cuitEmpleador),
      obraSocial: normalizeText(info.obraSocial ?? info.os ?? lead?.obraSocial),
      observaciones: normalizeText(info.observaciones ?? lead?.observaciones),
    };
  };

  const formatPhoneForWhatsAppAR = (input) => {
    if (!input) return '';
    let d = String(input).replace(/\D/g, '');
    if (d.startsWith('54')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    let m;
    if ((m = d.match(/^(\d{4})15(\d+)$/))) d = m[1] + m[2];
    else if ((m = d.match(/^(\d{3})15(\d+)$/))) d = m[1] + m[2];
    else if ((m = d.match(/^(\d{2})15(\d+)$/))) d = m[1] + m[2];

    const wa = '549' + d;
    return "'" + wa; // Comilla simple para forzar texto en Excel
  };

  // ========================================================================
  // 3. LÓGICA DEL COMPONENTE
  // ========================================================================

  const filteredLeads = useMemo(() => {
    let result = lostLeads || [];

    // Filtro Mes
    if (monthFilter) {
      result = result.filter((l) => {
        const key = getYearMonthKey(l?.fechaIngreso);
        return key === monthFilter;
      });
    }

    // Filtro Motivo
    if (reasonFilter) {
      const needle = reasonFilter.toLowerCase();
      result = result.filter((l) =>
        (l?.razonPerdida ?? '').toString().toLowerCase().includes(needle)
      );
    }

    return result;
  }, [lostLeads, reasonFilter, monthFilter]);

  // Generar lista de meses única y ordenada
  const allMonths = useMemo(() => {
    const set = new Set();
    (lostLeads || []).forEach((l) => {
      const key = getYearMonthKey(l?.fechaIngreso);
      if (key) set.add(key);
    });
    return Array.from(set).sort().reverse();
  }, [lostLeads]);

  const allReasons = useMemo(() => {
    const set = new Set((lostLeads || []).map((l) => l?.razonPerdida ?? '').filter(Boolean));
    return Array.from(set).sort();
  }, [lostLeads]);

  // ========================================================================
  // 4. EXPORTACIÓN (usando utilidad centralizada)
  // ========================================================================

  const handleExportFiltered = () => {
    setExportMessage({ type: '', text: '' });
    if (!filteredLeads || filteredLeads.length === 0) return;

    const mapRaw = new Map((rawLostLeads || []).map((l) => [l?.id, l]));
    const merged = filteredLeads.map((l) => {
      const raw = mapRaw.get(l.id) || {};
      return { ...raw, ...l };
    });

    downloadCSV(buildNexoExportRows(merged), 'leads_perdidos_filtrados');
    setExportMessage({ type: 'success', text: `Exportados ${merged.length} leads filtrados.` });
  };

  const handleExportSelected = () => {
    setExportMessage({ type: '', text: '' });
    const mapRaw = new Map((rawLostLeads || []).map((l) => [l?.id, l]));
    const toExport = Array.from(selectedLeads).map((id) => mapRaw.get(id)).filter(Boolean);

    if (toExport.length === 0) return;
    downloadCSV(buildNexoExportRows(toExport), 'leads_perdidos_seleccion');
    setExportMessage({ type: 'success', text: `Exportados ${toExport.length} leads.` });
  };

  // ========================================================================
  // 5. RECONTACTO & REACTIVACIÓN
  // ========================================================================

  const handleRecontact = (lead) => {
    setWhatsAppLead(lead);
    setIsWhatsAppOpen(true);
  };

  const handleReactivate = async (leadId, leadName) => {
    if (!user) return;
    setReactivatingId(leadId);
    setReactivateMessage({ type: '', text: '' });
    try {
      await reactivateLead({ userId: user.uid, leadId });
      setReactivateMessage({ type: 'success', text: `✅ ${leadName} fue reactivado al Funnel de Ventas.` });
      setConfirmReactivateId(null);
      // Limpiar selección si estaba seleccionado
      setSelectedLeads(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    } catch (error) {
      console.error("Error al reactivar:", error);
      setReactivateMessage({ type: 'error', text: `Error al reactivar el lead. Intenta de nuevo.` });
    } finally {
      setReactivatingId(null);
    }
  };

  // Helpers UI
  const toggleSelect = (id) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const ids = filteredLeads.map(l => l.id);
    setSelectedLeads(new Set(ids));
  };

  const clearSelection = () => setSelectedLeads(new Set());

  if (loading) return <div className="w-full py-12 flex justify-center"><Spinner /></div>;

  return (
    <div className="p-6 min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-extrabold text-gray-900">Leads Perdidos</h2>
          <div className="flex gap-2">
            <button onClick={handleExportSelected} disabled={selectedLeads.size === 0} className="px-4 py-2 bg-blue-700 text-white font-bold rounded shadow hover:bg-blue-800 disabled:bg-gray-300 transition-all">
              Exportar Sel. ({selectedLeads.size})
            </button>
            <button onClick={handleExportFiltered} disabled={filteredLeads.length === 0} className="px-4 py-2 bg-emerald-700 text-white font-bold rounded shadow hover:bg-emerald-800 disabled:bg-gray-300 transition-all">
              Exportar Reporte ({filteredLeads.length})
            </button>
          </div>
        </div>

        {/* Filtros High Contrast */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100 rounded-lg border border-gray-300">

          {/* Filtro Mes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700 uppercase">📅 Mes de Ingreso</label>
            <select
              className="w-full border border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">-- Todos los meses --</option>
              {allMonths.map(key => (
                <option key={key} value={key}>{formatMonthLabel(key)}</option>
              ))}
            </select>
          </div>

          {/* Filtro Motivo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700 uppercase">🔍 Motivo</label>
            <select
              className="w-full border border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <option value="">-- Todos --</option>
              {allReasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex items-end justify-end pb-2">
            <span className="text-sm font-bold text-gray-600">Viendo <span className="text-blue-700 text-lg">{filteredLeads.length}</span> leads</span>
          </div>
        </div>

        {exportMessage.text && (
          <div className={`mt-4 p-3 rounded font-bold text-sm border ${exportMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
            {exportMessage.text}
          </div>
        )}

        {reactivateMessage.text && (
          <div className={`mt-4 p-3 rounded font-bold text-sm border animate-pulse ${reactivateMessage.type === 'success' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
            {reactivateMessage.text}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-300">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-400 focus:ring-blue-500"
                    onChange={(e) => e.target.checked ? selectAllFiltered() : clearSelection()}
                    checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length}
                  />
                </th>
                <th className="px-4 py-3 text-xs font-extrabold text-gray-700 uppercase">Datos Lead</th>
                <th className="px-4 py-3 text-xs font-extrabold text-gray-700 uppercase">Motivo / Fecha</th>
                <th className="px-4 py-3 text-xs font-extrabold text-gray-700 uppercase">Info Extra</th>
                <th className="px-4 py-3 text-xs font-extrabold text-gray-700 uppercase">Obs.</th>
                <th className="px-4 py-3 text-xs font-extrabold text-gray-700 uppercase text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredLeads.map(lead => {
                const info = resolveInfoAdicional(lead);
                const { provincia, localidad } = resolveProvinciaLocalidad(lead);
                const isSelected = selectedLeads.has(lead.id);
                const isConfirming = confirmReactivateId === lead.id;
                const isReactivating = reactivatingId === lead.id;

                return (
                  <tr key={lead.id} className={`hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} className="w-4 h-4 text-blue-600 rounded border-gray-400 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{lead.nombre}</div>
                      <div className="text-xs text-gray-600 font-medium">{formatPhoneForWhatsAppAR(lead.celular)}</div>
                      <div className="text-xs text-gray-500 mt-1">{provincia}, {localidad}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-block bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded border border-red-200 mb-1">
                        {lead.razonPerdida}
                      </span>
                      <div className="text-xs text-gray-700 font-semibold">Ingreso: {lead.fechaIngreso}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-700 space-y-1">
                      {info.cantidadIntegrantes && <div>👥 <b>Int:</b> {info.cantidadIntegrantes}</div>}
                      {info.edades && <div title={info.edades}>🎂 <b>Edades:</b> {info.edades}</div>}
                      {info.cuitEmpleador && <div>🏢 <b>CUIT:</b> {info.cuitEmpleador}</div>}
                      {info.obraSocial && <div title={info.obraSocial}>🏥 <b>OS:</b> {info.obraSocial}</div>}
                      {!info.cantidadIntegrantes && !info.cuitEmpleador && !info.obraSocial && <span className="text-gray-400">- Sin datos -</span>}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500 italic max-w-xs truncate">
                      {info.observaciones || '-'}
                    </td>

                    {/* === COLUMNA DE ACCIONES === */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-2">
                        {isConfirming ? (
                          /* Confirmación inline de reactivación */
                          <div className="flex flex-col items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg p-2 animate-fade-in">
                            <span className="text-xs font-bold text-blue-800 text-center">¿Reactivar al Funnel?</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleReactivate(lead.id, lead.nombre)}
                                disabled={isReactivating}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-all disabled:opacity-50"
                              >
                                {isReactivating ? '...' : '✓ Sí'}
                              </button>
                              <button
                                onClick={() => setConfirmReactivateId(null)}
                                disabled={isReactivating}
                                className="px-2.5 py-1 text-xs font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded transition-all"
                              >
                                ✕ No
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Botones de acción normales */
                          <>
                            {/* Botón Recontactar vía WhatsApp */}
                            <button
                              onClick={() => handleRecontact(lead)}
                              disabled={!lead.celular || lead.celular === 'Sin celular'}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full justify-center"
                              title="Enviar mensaje de recontacto por WhatsApp"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.891-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.398 1.919 6.166l-1.138 4.162 4.273-1.12z" />
                              </svg>
                              Recontactar
                            </button>

                            {/* Botón Reactivar al Funnel */}
                            <button
                              onClick={() => setConfirmReactivateId(lead.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-all w-full justify-center"
                              title="Reactivar este lead al Funnel de Ventas"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                              </svg>
                              Reactivar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && <div className="p-10 text-center text-gray-500 font-bold bg-gray-50">No hay leads que coincidan con los filtros.</div>}
      </div>

      {/* Modal de WhatsApp para Recontacto */}
      <WhatsAppModal
        open={isWhatsAppOpen}
        onClose={() => { setIsWhatsAppOpen(false); setWhatsAppLead(null); }}
        lead={whatsAppLead}
        userName={user?.displayName}
        variant="recontacto"
      />
    </div>
  );
}