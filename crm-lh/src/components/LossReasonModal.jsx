import React, { useState, useMemo } from 'react';
// import Papa from 'papaparse'; // Removido: Usaremos un generador de CSV manual
// import { useLostLeads } from '../hooks/useLostLeads'; // Removido: Usaremos un hook mock
// import Spinner from './Spinner'; // Removido: Usaremos un componente Spinner inline

// --- SPINNER (in-file) ---
// Reemplazo del import './Spinner' para que el componente sea autónomo
const Spinner = () => (
  <div className="flex justify-center items-center">
    <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-16 h-16 animate-spin" role="status">
      <span className="sr-only">Cargando...</span>
    </div>
  </div>
);

// --- MOCK HOOK (in-file) ---
// Mock de useLostLeads para reemplazar el import y hacer el componente autónomo
// En tu app real, React usará tu hook original con tus datos de Firebase.
const useLostLeads = () => {
  const mockRawLeads = [
    { id: '1', nombre: 'Juan Perez', fechaIngreso: '2023-10-01', razonPerdida: 'Precio', celular: '5491122334455', dni: '12345678', provincia: 'Buenos Aires', localidad: 'CABA', otroCampo: 'data' },
    { id: '2', nombre: 'Maria Gomez', fechaIngreso: '2023-10-02', razonPerdida: 'No interesado', celular: '1166778899', dni: '87654321', provincia: 'Cordoba', localidad: 'Cordoba', otroCampo: 'data2' },
    { id: '3', nombre: 'Carlos Ruiz', fechaIngreso: '2023-10-03', razonPerdida: 'Precio', celular: '541199887766', dni: '11223344', provincia: 'Santa Fe', localidad: 'Rosario', otroCampo: 'data3' },
    { id: '4', nombre: 'Ana Lopez', fechaIngreso: '2023-10-04', razonPerdida: 'Demo', celular: '+54 9 11 1234 5678', dni: '44556677', provincia: 'Buenos Aires', localidad: 'La Plata', otroCampo: 'data4' },
  ];
  
  const mockLostLeads = mockRawLeads.map(lead => ({
     id: lead.id,
     nombre: lead.nombre,
     fechaIngreso: new Date(lead.fechaIngreso).toLocaleDateString('es-AR'), // Data procesada
     razonPerdida: lead.razonPerdida,
     celular: lead.celular
  }));

  return {
    lostLeads: mockLostLeads,
    rawLostLeads: mockRawLeads,
    loading: false // Poner en 'true' para probar el Spinner
  };
};

// --- MANUAL CSV GENERATOR (in-file) ---
// Reemplazo de Papa.unparse para eliminar la dependencia externa
const unparseCsv = (data) => {
  if (!data || data.length === 0) {
    return "";
  }
  const headers = Object.keys(data[0]);
  
  // Función para escapar celdas de CSV (maneja comas, comillas, saltos de línea)
  const escapeCsvCell = (cell) => {
    let str = String(cell == null ? "" : cell);
    // Si contiene caracteres problemáticos, envolver en comillas dobles
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      // Escapar comillas dobles internas duplicándolas
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCsvCell).join(',');
  const bodyRows = data.map(row => 
    headers.map(header => escapeCsvCell(row[header])).join(',')
  );

  return [headerRow, ...bodyRows].join('\n');
};


export default function LostList() {
  const { lostLeads, rawLostLeads, loading } = useLostLeads();
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [reasonFilter, setReasonFilter] = useState('');
  
  // State to handle export errors instead of using alert()
  const [exportMessage, setExportMessage] = useState({ type: '', text: '' });

  const filteredLeads = useMemo(() => {
    if (!reasonFilter) {
      return lostLeads;
    }
    return lostLeads.filter(lead =>
      (lead.razonPerdida || '').toLowerCase().includes(reasonFilter.toLowerCase())
    );
  }, [lostLeads, reasonFilter]);


  const handleSelectLead = (leadId) => {
    setSelectedLeads(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(leadId)) {
        newSelected.delete(leadId);
      } else {
        newSelected.add(leadId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    const filteredIds = filteredLeads.map(lead => lead.id);
    const allFilteredAreSelected = filteredIds.length > 0 && filteredIds.every(id => selectedLeads.has(id));

    if (allFilteredAreSelected) {
      setSelectedLeads(prev => {
        const newSet = new Set(prev);
        filteredIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedLeads(prev => {
        const newSet = new Set(prev);
        filteredIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  // --- HELPER FUNCTION (Data/Automation) ---
  /**
   * Cleans and formats a phone number for export.
   * Attempts to normalize to a format usable by automation tools (+54 9...).
   * @param {string} celular - The raw phone number.
   * @returns {string} The formatted phone number.
   */
  const formatPhoneForExport = (celular) => {
    if (!celular) return ""; // Return empty if no number
    
    // 1. Clean all non-digit characters
    let digits = String(celular).replace(/\D/g, '');

    // 2. Normalization logic (Argentina-specific)
    if (digits.startsWith('549') && digits.length > 10) {
      return `+${digits}`; // Just add the '+'
    }
    if (digits.length === 10) {
      return `+54 9 ${digits}`;
    }
    if (digits.startsWith('54') && digits.length === 12) {
      const areaAndNum = digits.substring(2);
      return `+54 9 ${areaAndNum}`;
    }

    // Fallback: If it doesn't match common patterns, return the original
    return celular || "";
  };

  // --- MODIFIED FUNCTION (Core Task) ---
  const handleExport = () => {
    // Clear any previous messages
    setExportMessage({ type: '', text: '' });

    const leadsToExport = rawLostLeads.filter(lead => selectedLeads.has(lead.id));

    if (leadsToExport.length === 0) {
      // --- UX Improvement: Use state for messages, not alert() ---
      setExportMessage({ type: 'error', text: 'Por favor, selecciona al menos un lead para exportar.' });
      setTimeout(() => setExportMessage({ type: '', text: '' }), 3000); // Clear message after 3s
      return;
    }

    // --- MODIFICATION: Map only the required fields ---
    const dataForExport = leadsToExport.map(lead => ({
      // Use user-friendly headers for the CSV file
      "Nombre": lead.nombre || '',
      "Telefono": formatPhoneForExport(lead.celular), // Use the helper function
      "DNI": lead.dni || '',
      "Provincia": lead.provincia || '',
      "Localidad": lead.localidad || '',
      "Razón de pérdida": lead.razonPerdida || '',
    }));
    
    // --- MODIFICATION: Use manual CSV generator ---
    const csv = unparseCsv(dataForExport);
    // --- END OF MODIFICATION ---

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fecha = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `leads-perdidos-seleccion-${fecha}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Set success message
    setExportMessage({ type: 'success', text: `¡Exportados ${leadsToExport.length} leads!` });
    setTimeout(() => setExportMessage({ type: '', text: '' }), 3000);
  };

  if (loading) {
    // Usamos el Spinner inline
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  const areAllFilteredSelected = filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeads.has(lead.id));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Leads Perdidos</h2>
        <button
          onClick={handleExport}
          disabled={selectedLeads.size === 0}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Exportar ({selectedLeads.size})
        </button>
      </div>

      {/* --- NEW UI ELEMENT (UX Improvement) --- */}
      {exportMessage.text && (
        <div className={`mb-4 p-3 text-center text-sm rounded-lg ${
          exportMessage.type === 'error' ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100'
        }`}>
          {exportMessage.text}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          placeholder="Filtrar por razón..."
          className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {lostLeads.length === 0 ? (
         <p className="text-gray-600">No se encontraron leads perdidos.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="p-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      onChange={handleSelectAll}
                      checked={areAllFilteredSelected}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Ingreso</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Razón</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className={`hover:bg-gray-50 ${selectedLeads.has(lead.id) ? 'bg-blue-50' : ''}`}>
                    <td className="p-4">
                       <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        onChange={() => handleSelectLead(lead.id)}
                        checked={selectedLeads.has(lead.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.fechaIngreso}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.razonPerdida}</td>
                    <td className="px-6 py-4 whitespace-n'owrap text-sm text-gray-600">{lead.celular}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}