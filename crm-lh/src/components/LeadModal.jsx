import React, { useState, useEffect } from 'react';
import AccordionSection from './AccordionSection';
import Cotizador from './Cotizador';

// Se mantiene la misma estructura inicial
const initialFormState = {
  nombre: "",
  dni: "",
  celular: "",
  mail: "",
  zona: { provincia: "", localidad: "" },
  origenDato: "Web",
  numeroTramite: "",
  etapa: "Primer Contacto",
  cotizacionMiembros: null,
  infoAdicional: { cantidadIntegrantes: 1, edades: "", cuil: "", cuitEmpleador: "", obraSocial: "", observaciones: "" },
  infoCotizacion: { plan: "", cantidadIntegrantes: 1, valorPlan: 0, valorConDescuento: 0, diferenciaAPagar: 0, descuentoComercial: 0, descuentoAportes: 0, valorFinalSocio: 0, valorForecast: 0, observaciones: "" },
  infoProceso: { idOnboarding: "", precarga: "Pendiente", mesProduccion: "", numeroPrecarga: "" }
};

function validateCelular(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return 'Número inválido';
  return '';
}

export default function LeadModal({ open, onClose, onSave, initialData, onStartOnboarding }) {
  const [leadData, setLeadData] = useState(initialFormState);
  const [bulkText, setBulkText] = useState("");
  const [celularError, setCelularError] = useState('');
  const isEditing = !!initialData;

  useEffect(() => {
    if (isEditing) {
      setLeadData(prev => ({
        ...initialFormState,
        ...initialData,
        zona: { ...initialFormState.zona, ...initialData.zona },
        infoAdicional: { ...initialFormState.infoAdicional, ...initialData.infoAdicional },
        infoCotizacion: { ...initialFormState.infoCotizacion, ...initialData.infoCotizacion },
        infoProceso: { ...initialFormState.infoProceso, ...initialData.infoProceso },
      }));
    } else {
      setLeadData(initialFormState);
      setBulkText("");
    }
  }, [initialData, isEditing, open]);

  const handleQuoteUpdate = (quoteResult) => {
    const { miembros, ...cotizacion } = quoteResult;
    setLeadData(prev => ({
        ...prev,
        cotizacionMiembros: miembros,
        infoCotizacion: { ...prev.infoCotizacion, ...cotizacion },
        infoAdicional: { ...prev.infoAdicional, cantidadIntegrantes: quoteResult.cantidadIntegrantes }
      }));
  };
  
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name === 'celular') setCelularError(validateCelular(value));
    setLeadData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleNestedChange = (e, category) => {
    const { name, value, type } = e.target;
    setLeadData(prev => ({
      ...prev,
      [category]: { ...prev[category], [name]: type === 'number' ? parseFloat(value) || 0 : value }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(leadData);
  };

  const handleBulkParse = () => {
    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    const newData = {};
    lines.forEach((line, index) => {
        if (line.toLowerCase().includes('dni')) { newData.dni = lines[index + 1]?.trim(); }
        else if (line.toLowerCase().includes('teléfonos')) { newData.celular = lines[index + 1]?.trim(); }
        else if (line.toLowerCase().includes('email')) { newData.mail = lines[index + 1]?.trim(); }
        else if (line.toLowerCase().includes('provincia')) { const provincia = lines[index + 1]?.trim() || ''; newData.zona = { ...newData.zona, provincia }; }
        else if (line.toLowerCase().includes('partido')) { const localidad = lines[index + 1]?.trim() || ''; newData.zona = { ...newData.zona, localidad }; }
    });
    setLeadData(prev => ({ ...prev, ...newData }));
  };


  if (!open) return null;

  const showCotizador = isEditing && leadData.etapa === 'Cotización';
  const hasQuoteInfo = leadData.infoCotizacion && leadData.infoCotizacion.plan;
  const infoCotizacion = leadData.infoCotizacion || {};
  const formatCurrency = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);

  // --- CORRECCIÓN DE VISIBILIDAD ---
  // Se añaden las clases `text-gray-900` para el texto y `placeholder-gray-500` para el placeholder.
  const inputStyles = "w-full p-2 mt-1 border border-gray-300 rounded-md bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition";
  const labelStyles = "text-sm font-medium text-gray-700";
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Editar Lead' : 'Nuevo Lead'}</h2>
          <div className="space-y-4">
            
            {!isEditing && (
                <AccordionSection title="Carga Rápida de Datos" startOpen={true}>
                    <div className="p-2">
                        <label htmlFor="bulk-text" className={labelStyles}>Pega aquí los datos del prospecto:</label>
                        <textarea
                            id="bulk-text"
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            className={`${inputStyles} h-32`}
                            placeholder="DNI&#10;22000679&#10;Teléfonos&#10;+54-11-65841464&#10;Email&#10;..."
                        ></textarea>
                        <button type="button" onClick={handleBulkParse} className="w-full mt-2 bg-indigo-600 text-white font-semibold py-2 rounded-md hover:bg-indigo-700 transition">
                            Procesar y Autocompletar
                        </button>
                    </div>
                </AccordionSection>
            )}

            <AccordionSection title="Datos Personales" startOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="nombre" value={leadData.nombre} onChange={handleChange} placeholder="Nombre Completo" className={inputStyles.replace('mt-1', '')} required />
                <input name="dni" value={leadData.dni} onChange={handleChange} placeholder="DNI" className={inputStyles.replace('mt-1', '')} />
                <div>
                  <input name="celular" value={leadData.celular} onChange={handleChange} placeholder="Celular" className={`${inputStyles.replace('mt-1', '')} ${celularError ? 'border-red-400' : ''}`} />
                  {celularError && <p className="mt-0.5 text-xs text-red-500">{celularError}</p>}
                </div>
                <input name="mail" type="email" value={leadData.mail} onChange={handleChange} placeholder="Email" className={inputStyles.replace('mt-1', '')} />
                <input name="zona.provincia" value={leadData.zona.provincia} onChange={(e) => handleNestedChange(e, 'zona')} placeholder="Provincia" className={inputStyles.replace('mt-1', '')} />
                <input name="zona.localidad" value={leadData.zona.localidad} onChange={(e) => handleNestedChange(e, 'zona')} placeholder="Localidad" className={inputStyles.replace('mt-1', '')} />
              </div>
            </AccordionSection>

            <AccordionSection title="Datos de Origen" startOpen={true}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="numeroTramite" value={leadData.numeroTramite} onChange={handleChange} placeholder="Número de Trámite" className={inputStyles.replace('mt-1', '')} />
                <select name="origenDato" value={leadData.origenDato} onChange={handleChange} className={inputStyles.replace('mt-1', '')}>
                  <option>Web</option><option>Chatbot</option><option>Referido</option><option>Pyme</option><option>Inclusion</option>
                </select>
              </div>
            </AccordionSection>
            
            <AccordionSection title="Información Adicional">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                 <div>
                  <label htmlFor="cantidadIntegrantes" className={labelStyles}>Cantidad de Integrantes</label>
                  <input id="cantidadIntegrantes" type="number" name="cantidadIntegrantes" value={leadData.infoAdicional.cantidadIntegrantes} onChange={(e) => handleNestedChange(e, 'infoAdicional')} className={inputStyles} />
                </div>
                <div>
                  <label htmlFor="edades" className={labelStyles}>Edades</label>
                  <input id="edades" name="edades" value={leadData.infoAdicional.edades} onChange={(e) => handleNestedChange(e, 'infoAdicional')} placeholder="ej: 30, 28" className={inputStyles} />
                </div>
                <div>
                  <label htmlFor="cuitEmpleador" className={labelStyles}>CUIT Empleador</label>
                  <input id="cuitEmpleador" name="cuitEmpleador" value={leadData.infoAdicional.cuitEmpleador} onChange={(e) => handleNestedChange(e, 'infoAdicional')} className={inputStyles} />
                </div>
                <div>
                  <label htmlFor="obraSocial" className={labelStyles}>Obra Social</label>
                  <input id="obraSocial" name="obraSocial" value={leadData.infoAdicional.obraSocial} onChange={(e) => handleNestedChange(e, 'infoAdicional')} className={inputStyles} />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="observaciones" className={labelStyles}>Observaciones</label>
                    <textarea id="observaciones" name="observaciones" value={leadData.infoAdicional.observaciones} onChange={(e) => handleNestedChange(e, 'infoAdicional')} className={inputStyles} rows="3" placeholder="Añadir notas o comentarios relevantes..."></textarea>
                </div>
              </div>
            </AccordionSection>
            
            <AccordionSection title="Información de Cotización" startOpen={true}>
               {showCotizador ? (<Cotizador onQuoteResult={handleQuoteUpdate} initialMembers={leadData.cotizacionMiembros} leadName={leadData} />) : 
                 (hasQuoteInfo ? (
                    <>
                      {['Seguimiento', 'Cierre'].includes(leadData.etapa) ? (
                        <div className="flex justify-between items-start text-sm p-2">
                          <div className="space-y-1 text-gray-600">
                            <p><strong>Plan:</strong> {infoCotizacion.plan || 'N/A'}</p>
                            <p><strong>Valor Plan:</strong> {formatCurrency(infoCotizacion.valorPlan)}</p>
                            <p><strong>Descuento Aportes:</strong> - {formatCurrency(infoCotizacion.descuentoAportes)}</p>
                            <p><strong>Descuento Comercial:</strong> - {formatCurrency(infoCotizacion.descuentoComercial)}</p>
                            <p><strong>IVA:</strong> {formatCurrency(infoCotizacion.iva)}</p>
                            <p className="font-bold text-gray-800"><strong>Valor Final Socio:</strong> {formatCurrency(infoCotizacion.valorFinalSocio)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500 font-semibold">Forecast</p>
                            <p className="font-bold text-lg text-green-600">{formatCurrency(infoCotizacion.valorForecast)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 text-sm space-y-1 text-gray-700">
                          <p><strong>Plan:</strong> {infoCotizacion.plan}</p>
                          <p className="font-bold"><strong>Total a Pagar:</strong> {formatCurrency(infoCotizacion.valorFinalSocio)}</p>
                        </div>
                      )}
                    </>
                 ) : (<div className="p-2 text-sm text-gray-600">No hay una cotización guardada.</div>)
               )}
            </AccordionSection>

            {isEditing && (leadData.estado === 'Onboarding' || leadData.estado === 'Completado') && (
              <AccordionSection title="Información de Proceso">{/* ... */}</AccordionSection>
            )}
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <div>
              {leadData.estado !== 'Completado' && (
                <div className="flex items-end gap-4">
                  <div>
                    <label htmlFor="etapa" className={`${labelStyles} mb-1 block`}>Etapa Actual</label>
                    <select id="etapa" name="etapa" value={leadData.etapa} onChange={handleChange} className={`${inputStyles} h-[42px]`}>
                        <option>Primer Contacto</option> <option>Segundo Contacto</option> <option>Cotización</option> <option>Seguimiento</option> <option>Cierre</option>
                    </select>
                  </div>
                  {isEditing && leadData.etapa === 'Cierre' && (
                      <button type="button" onClick={() => onStartOnboarding(leadData)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm h-[42px] transition">
                          Iniciar Proceso de Alta
                      </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold text-sm transition">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm transition">{isEditing ? 'Guardar Cambios' : 'Crear Lead'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

