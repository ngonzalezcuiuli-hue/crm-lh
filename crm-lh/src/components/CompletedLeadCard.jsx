import React, { useState } from 'react';
import AccordionSection from './AccordionSection';
import { useAuthContext } from '../hooks/useAuth.jsx';
import { updateLead } from '../services/leadsService';

// Ícono para expandir/contraer
const ChevronIcon = ({ isExpanded }) => (
  <svg className={`w-6 h-6 transform transition-transform duration-200 text-gray-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
);

export default function CompletedLeadCard({ lead }) {
  const { user } = useAuthContext() || {};
  const [isExpanded, setIsExpanded] = useState(false);
  // Estado para manejar los datos editables del proceso
  const [procesoData, setProcesoData] = useState(lead.infoProceso || {});

  // Formatea los valores a moneda local (ARS)
  const formatCurrency = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);

  const infoCotizacion = lead.infoCotizacion || {};

  // Manejador para actualizar el estado cuando cambian los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProcesoData(prev => ({ ...prev, [name]: value }));
  };

  // Manejador para guardar los cambios en Firebase
  const handleSaveChanges = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert('Debes iniciar sesión para guardar cambios.');
      return;
    };
    try {
      const dataToUpdate = { infoProceso: { ...lead.infoProceso, ...procesoData } };
      await updateLead(user.uid, lead.id, dataToUpdate);
      alert('¡Cambios guardados con éxito!');
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      alert('Error al guardar los cambios.');
    }
  };


  // --- VISTA COMPACTA (Tarjeta contraída) ---
  if (!isExpanded) {
    return (
      <div
        className="bg-white rounded-lg shadow-md border p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-300"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-800">{lead.nombre}</h3>
              {/* MOSTRAR MES EN COMPACTO SI EXISTE */}
              {procesoData.mesProduccion && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                  {procesoData.mesProduccion}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Trámite: {infoCotizacion.plan || 'No especificado'}
            </p>
            {/* NUEVO: Número de trámite visible en compacto */}
            <p className="text-xs text-gray-500 font-mono mt-1">
              ID Trámite: {lead.numeroTramite || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-500">Forecast</p>
              <p className="font-bold text-md text-green-700">
                {formatCurrency(infoCotizacion.valorForecast)}
              </p>
            </div>
            <div>
              <ChevronIcon isExpanded={isExpanded} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA EXPANDIDA (Tarjeta expandida) ---
  return (
    <div className="bg-white rounded-lg shadow-xl border-2 border-blue-400 p-6">
      <div className="flex justify-between items-start mb-4 cursor-pointer" onClick={() => setIsExpanded(false)}>
        <div>
          <h3 className="text-2xl font-bold text-gray-800">{lead.nombre}</h3>
          {/* NUEVO: Número de trámite visible en expandido */}
          <p className="text-sm text-gray-500 font-mono">
            ID Trámite: {lead.numeroTramite || 'N/A'}
          </p>
        </div>
        <div>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
      </div>

      <div className="space-y-3 bg-gray-100 rounded-lg p-4">

        <AccordionSection title="Datos Personales" startOpen={true}>
          <div className="text-sm space-y-1 text-gray-900 p-2">
            <p><strong>DNI:</strong> {lead.dni || 'N/A'}</p>
            <p><strong>Celular:</strong> {lead.celular || 'N/A'}</p>
            <p><strong>Email:</strong> {lead.mail || 'N/A'}</p>
            <p><strong>Localidad:</strong> {lead.zona?.localidad || 'N/A'}, {lead.zona?.provincia || 'N/A'}</p>
          </div>
        </AccordionSection>

        <AccordionSection title="Información Adicional">
          <div className="text-sm space-y-1 text-gray-900 p-2">
            <p><strong>Integrantes:</strong> {lead.infoAdicional?.cantidadIntegrantes || 'N/A'}</p>
            <p><strong>Edades:</strong> {lead.infoAdicional?.edades || 'N/A'}</p>
            <p><strong>CUIL:</strong> {lead.infoAdicional?.cuil || 'N/A'}</p>
            <p><strong>Obra Social:</strong> {lead.infoAdicional?.obraSocial || 'N/A'}</p>
          </div>
        </AccordionSection>

        <AccordionSection title="Información de Cotización">
          <div className="flex justify-between items-start text-sm p-2 text-gray-900">
            <div className="space-y-1">
              <p><strong>Plan:</strong> {infoCotizacion.plan || 'N/A'}</p>
              <p><strong>Valor Plan:</strong> {formatCurrency(infoCotizacion.valorPlan)}</p>
              <p><strong>Descuento Aportes:</strong> - {formatCurrency(infoCotizacion.descuentoAportes)}</p>
              <p><strong>Descuento Comercial:</strong> - {formatCurrency(infoCotizacion.descuentoComercial)}</p>
              <p><strong>IVA:</strong> {formatCurrency(infoCotizacion.iva)}</p>
              <p className="font-bold"><strong>Valor Final Socio:</strong> {formatCurrency(infoCotizacion.valorFinalSocio)}</p>
              <p><strong>Descuentos Aplicados:</strong> {infoCotizacion.descuentosAplicados?.join(', ') || 'N/A'}</p>
              <p><strong>Observaciones:</strong> {infoCotizacion.observaciones || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 font-semibold">Forecast</p>
              <p className="font-bold text-lg text-green-600">
                {formatCurrency(infoCotizacion.valorForecast)}
              </p>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="Información de Proceso (Editable)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
            <div>
              <label htmlFor={`idOnboarding-${lead.id}`} className="text-sm font-medium text-gray-700">ID de Onboarding</label>
              <input
                id={`idOnboarding-${lead.id}`}
                name="idOnboarding"
                value={procesoData.idOnboarding || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded mt-1 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label htmlFor={`numeroPrecarga-${lead.id}`} className="text-sm font-medium text-gray-700">Número de Precarga</label>
              <input
                id={`numeroPrecarga-${lead.id}`}
                name="numeroPrecarga"
                value={procesoData.numeroPrecarga || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded mt-1 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* NUEVO: Mes de Producción Editable */}
            <div>
              <label htmlFor={`mesProduccion-${lead.id}`} className="text-sm font-medium text-gray-700">Mes de Producción</label>
              <input
                type="month" // Tipo month para selector de fecha nativo (YYYY-MM)
                id={`mesProduccion-${lead.id}`}
                name="mesProduccion"
                value={procesoData.mesProduccion || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded mt-1 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-sm text-gray-900"><strong>Estado Precarga:</strong> {lead.infoProceso?.precarga || 'N/A'}</p>
            </div>
          </div>
        </AccordionSection>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
        <button onClick={handleSaveChanges} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">Guardar Cambios</button>
      </div>
    </div>
  );
}