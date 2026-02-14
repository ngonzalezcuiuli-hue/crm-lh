// src/components/LostList.jsx
import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { useLostLeads } from '../hooks/useLostLeads';
import Spinner from './Spinner';

export default function LostList() {
  const { lostLeads, rawLostLeads, loading } = useLostLeads();

  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [reasonFilter, setReasonFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [exportMessage, setExportMessage] = useState({ type: '', text: '' });

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
    // Prioridad: lead.zona (según tu JSON) -> luego busca en raíz
    const provincia = lead?.zona?.provincia || lead?.provincia || lead?.ubicacion?.provincia || '';
    const localidad = lead?.zona?.localidad || lead?.localidad || lead?.ubicacion?.localidad || '';
    
    return { 
      provincia: normalizeText(provincia), 
      localidad: normalizeText(localidad) 
    };
  };

  const resolveInfoAdicional = (lead) => {
    // Tu estructura JSON pone estos datos en 'infoAdicional'
    const info = lead?.infoAdicional || {};
    const members = lead?.cotizacionMiembros || []; // Array con datos de edades

    // Lógica inteligente para Edades:
    // Si infoAdicional.edades está vacío, buscamos en el array de miembros (cotizacionMiembros)
    let edadesFinal = normalizeText(info.edades);
    if (!edadesFinal && Array.isArray(members) && members.length > 0) {
      // Extrae "36 a 40 años", etc. y los une con comas
      edadesFinal = members
        .map(m => m.ageGroup)
        .filter(Boolean)
        .join(', ');
    }

    return {
      cantidadIntegrantes: normalizeText(info.cantidadIntegrantes ?? lead?.cantidadIntegrantes),
      edades: edadesFinal, // Usa la lógica inteligente
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
    // Heurística para quitar el 15 después del código de área
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
        const key = getYearMonthKey(l?.fechaIngreso); // Usa el parser corregido
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
    return Array.from(set).sort().reverse(); // Más reciente arriba
  }, [lostLeads]);

  const allReasons = useMemo(() => {
    const set = new Set((lostLeads || []).map((l) => l?.razonPerdida ?? '').filter(Boolean));
    return Array.from(set).sort();
  }, [lostLeads]);

  // ========================================================================
  // 4. EXPORTACIÓN
  // ========================================================================

  const buildExportRows = (leadsArray) => {
    return leadsArray.map((lead) => {
      const { provincia, localidad } = resolveProvinciaLocalidad(lead);
      const info = resolveInfoAdicional(lead);

      // Reordenamos y nombramos las columnas para que el CSV generado por LostList
      // sea compatible con el importador de leads (CSVImporter).  Las columnas
      // principales aparecen primero en el orden esperado por CSVImporter.  Las
      // columnas "Motivo de pérdida" y "Fecha Ingreso" se incluyen al final como
      // información adicional, sin interferir con el orden que requiere el importador.
      return {
        'Nombre': normalizeText(lead?.nombre),
        'Celular': formatPhoneForWhatsAppAR(lead?.celular),
        'Provincia': provincia,
        'Localidad': localidad,
        'Cant. Integrantes': info.cantidadIntegrantes,
        'Edades': info.edades,
        'CUIT Empleador': info.cuitEmpleador,
        'Obra Social': info.obraSocial,
        'Observaciones': info.observaciones,
        'Motivo de pérdida': normalizeText(lead?.razonPerdida),
        'Fecha Ingreso': normalizeText(lead?.fechaIngreso),
      };
    });
  };

  const downloadCSV = (rows, filenameBase) => {
    const csv = Papa.unparse(rows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${filenameBase}_${fecha}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFiltered = () => {
    setExportMessage({ type: '', text: '' });
    if (!filteredLeads || filteredLeads.length === 0) return;

    // Merge con rawLostLeads para asegurar integridad de datos ocultos
    const mapRaw = new Map((rawLostLeads || []).map((l) => [l?.id, l]));
    const merged = filteredLeads.map((l) => {
        const raw = mapRaw.get(l.id) || {};
        return { ...raw, ...l }; 
    });

    downloadCSV(buildExportRows(merged), 'leads_perdidos_filtrados');
    setExportMessage({ type: 'success', text: `Exportados ${merged.length} leads filtrados.` });
  };

  const handleExportSelected = () => {
    setExportMessage({ type: '', text: '' });
    const mapRaw = new Map((rawLostLeads || []).map((l) => [l?.id, l]));
    const toExport = Array.from(selectedLeads).map((id) => mapRaw.get(id)).filter(Boolean);

    if (toExport.length === 0) return;
    downloadCSV(buildExportRows(toExport), 'leads_perdidos_seleccion');
    setExportMessage({ type: 'success', text: `Exportados ${toExport.length} leads.` });
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredLeads.map(lead => {
                const info = resolveInfoAdicional(lead);
                const { provincia, localidad } = resolveProvinciaLocalidad(lead);
                const isSelected = selectedLeads.has(lead.id);
                
                return (
                  <tr key={lead.id} className={`hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} className="w-4 h-4 text-blue-600 rounded border-gray-400 focus:ring-blue-500"/>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && <div className="p-10 text-center text-gray-500 font-bold bg-gray-50">No hay leads que coincidan con los filtros.</div>}
      </div>
    </div>
  );
}