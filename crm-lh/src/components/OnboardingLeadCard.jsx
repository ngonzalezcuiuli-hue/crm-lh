import React, { useState } from 'react';
// ✅ IMPORTACIÓN DE HOOKS Y SERVICIOS (Asumiendo que esta es la ruta correcta: src/components a src/hooks)
import { useAuthContext } from '../hooks/useAuth.jsx';
import { updateLead, markAsCompleted } from '../services/leadsService';
// NOTA: Se asume que getOnboardingTimeInfo, AccordionSection, ConfirmationModal, etc., están definidos aquí o importados.

// --- UTILITIES Y COMPONENTES AUXILIARES ---

// Función para determinar colores según tiempo (Mantenido localmente)
const getOnboardingTimeInfo = (timestamp) => {
  const now = new Date();
  const lastUpdated = timestamp instanceof Date ? timestamp : (timestamp && timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date());
  const diffHours = Math.abs(now.getTime() - lastUpdated.getTime()) / 3600000;

  if (diffHours >= 48) {
    return { cardBgClass: 'bg-red-100 border-red-400', textClass: 'text-red-800' };
  } else if (diffHours >= 24) {
    return { cardBgClass: 'bg-orange-100 border-orange-400', textClass: 'text-orange-800' };
  } else {
    return { cardBgClass: 'bg-green-100 border-green-400', textClass: 'text-green-800' };
  }
};

const AccordionSection = ({ title, children, startOpen = false }) => {
  const [isOpen, setIsOpen] = useState(startOpen);
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden my-2">
      <button
        className="w-full flex justify-between items-center p-3 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="font-semibold text-sm">{title}</h4>
        <svg
          className={`w-4 h-4 transition-transform duration-200 transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      <div className={`transition-max-height duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-3 bg-white text-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

const ChevronIcon = ({ isExpanded }) => (
  <svg className={`w-6 h-6 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
);

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-70 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
    <div className="bg-white p-6 rounded-xl shadow-2xl m-auto max-w-sm w-full transform transition-all">
      <p className="text-xl font-semibold text-gray-800 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium">
          Cancelar
        </button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-md hover:shadow-lg">
          Confirmar
        </button>
      </div>
    </div>
  </div>
);

const AlertModal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-70 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
    <div className="bg-white p-6 rounded-xl shadow-2xl m-auto max-w-sm w-full text-center transform transition-all">
      <p className="text-xl font-semibold text-gray-800 mb-6">{message}</p>
      <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md">
        Entendido
      </button>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---
export const OnboardingLeadCard = ({ lead }) => {
  // ✅ OBTENEMOS EL USUARIO Y EL ESTADO DE CARGA DEL CONTEXTO CENTRALIZADO
  const { user, loading: authLoading } = useAuthContext();

  const [procesoData, setProcesoData] = useState(lead.infoProceso || {});
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAlert, setShowAlert] = useState({ show: false, message: '' });
  const [showConfirm, setShowConfirm] = useState({ show: false, message: '' });
  const [pendingAction, setPendingAction] = useState(null);

  const { cardBgClass, textClass } = getOnboardingTimeInfo(lead.lastUpdatedAt);

  const formatCurrency = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProcesoData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async (e) => {
    e.stopPropagation();
    const userId = user?.uid;
    if (authLoading || !userId) {
      setShowAlert({ show: true, message: 'Error: El usuario no está autenticado o la autenticación aún está cargando. Intente de nuevo en unos segundos.' });
      return;
    }
    try {
      await updateLead(userId, lead.id, { infoProceso: procesoData });
      setShowAlert({ show: true, message: '¡Cambios guardados con éxito!' });
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      setShowAlert({ show: true, message: 'Error al guardar los cambios. ' + error.message });
    }
  };

  // Devuelve el lead al funnel de ventas en la etapa de Cierre
  const handleReturnToFunnel = async (e) => {
    e.stopPropagation();
    const userId = user?.uid;
    if (authLoading || !userId) {
      setShowAlert({ show: true, message: 'Error: El usuario no está autenticado o la autenticación aún está cargando. Intente de nuevo en unos segundos.' });
      return;
    }
    try {
      await updateLead(userId, lead.id, {
        // Al devolver al funnel, el estado debe ser 'Funnel' para que useLeads lo recupere.
        estado: 'Funnel',
        etapa: 'Cierre',
        infoProceso: {}, // limpiamos infoProceso para que no se muestre en la vista de proceso
      });
      setShowAlert({ show: true, message: 'El lead fue devuelto al funnel de ventas en la etapa de Cierre.' });
    } catch (error) {
      console.error('Error al devolver al funnel:', error);
      setShowAlert({ show: true, message: 'Error al devolver al funnel: ' + error.message });
    }
  };

  const handleCompleteProcess = async () => {
    const userId = user?.uid;

    if (authLoading || !userId) {
      // Si el UID aún no está disponible, mostramos el error y terminamos
      setShowAlert({ show: true, message: 'Error: El usuario no está autenticado o la autenticación aún está cargando. Intente de nuevo en unos segundos.' });
      setPendingAction(null);
      setShowConfirm({ show: false, message: '' });
      return;
    }

    try {
      // 1. Ejecutar la función de servicio que mueve/elimina el lead (markAsCompleted en leadsService.js)
      await markAsCompleted({ userId, leadId: lead.id, leadData: lead });

      // 2. Mostrar confirmación y limpiar estados del modal
      setShowAlert({ show: true, message: '¡Proceso completado! El lead se movió a Completados.' });
      setPendingAction(null);
      setShowConfirm({ show: false, message: '' });
    } catch (error) {
      // ✅ Si llega aquí, es un error de Firebase (ej: permisos denegados)
      console.error("Error al completar el proceso:", error);
      setShowAlert({ show: true, message: `Error: No se pudo completar la acción. (Detalle: ${error.message})` });
      setPendingAction(null);
      setShowConfirm({ show: false, message: '' });
    }
  };

  const handleConfirmAction = (e) => {
    e.stopPropagation();
    setShowConfirm({ show: true, message: '¿Estás seguro de que deseas marcar este proceso como completado?' });
    // Establece la función asíncrona para que se ejecute al confirmar
    setPendingAction(() => handleCompleteProcess);
  };

  const handleCancelAction = () => {
    setShowConfirm({ show: false, message: '' });
    setPendingAction(null);
  };

  const infoCotizacion = lead.infoCotizacion || {};

  if (!isExpanded) {
    return (
      <div
        className={`rounded-xl shadow-lg border p-4 cursor-pointer transition-all duration-300 hover:shadow-xl ${cardBgClass} ${textClass}`}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex justify-between items-center">
          <div className="text-gray-900">
            <h3 className={`text-lg font-bold ${textClass}`}>{lead.nombre}</h3>
            <p className={`text-sm ${textClass}`}>DNI: {lead.dni || 'N/A'}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className={`text-sm font-semibold text-gray-600`}>Forecast</p>
              <p className={`font-bold text-md text-green-700`}>
                {formatCurrency(infoCotizacion.valorForecast)}
              </p>
            </div>
            <div className={`text-gray-900 ${textClass}`}>
              <ChevronIcon isExpanded={isExpanded} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl shadow-2xl border p-6 ${cardBgClass} ${textClass}`}>
      {showAlert.show && <AlertModal message={showAlert.message} onClose={() => setShowAlert({ show: false, message: '' })} />}
      {/* El modal ejecuta pendingAction (que es handleCompleteProcess) al confirmar */}
      {showConfirm.show && <ConfirmationModal onConfirm={pendingAction} onCancel={handleCancelAction} message={showConfirm.message} />}

      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsExpanded(false)}>
        <h3 className={`text-2xl font-bold ${textClass}`}>{lead.nombre}</h3>
        <div className={`text-gray-900 ${textClass}`}>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
      </div>

      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
        <AccordionSection title="Datos Personales" startOpen={true}>
          <div className="space-y-1 text-gray-900">
            <p><strong>DNI:</strong> {lead.dni || 'N/A'}</p>
            <p><strong>Celular:</strong> {lead.celular || 'N/A'}</p>
            <p><strong>Email:</strong> {lead.mail || 'N/A'}</p>
            <p><strong>Localidad:</strong> {lead.zona?.localidad || 'N/A'}, {lead.zona?.provincia || 'N/A'}</p>
          </div>
        </AccordionSection>

        <AccordionSection title="Información Adicional">
          <div className="space-y-1 text-gray-900">
            <p><strong>Integrantes:</strong> {lead.infoAdicional?.cantidadIntegrantes || 'N/A'}</p>
            <p><strong>Edades:</strong> {lead.infoAdicional?.edades || 'N/A'}</p>
            <p><strong>CUIL:</strong> {lead.infoAdicional?.cuil || 'N/A'}</p>
            <p><strong>Obra Social:</strong> {lead.infoAdicional?.obraSocial || 'N/A'}</p>
          </div>
        </AccordionSection>

        <AccordionSection title="Información de Cotización">
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-gray-900">
              <p><strong>Plan:</strong> {infoCotizacion.plan || 'N/A'}</p>
              <p><strong>Valor Plan:</strong> {formatCurrency(infoCotizacion.valorPlan)}</p>
              <p><strong>Descuento Aportes:</strong> - {formatCurrency(infoCotizacion.descuentoAportes)}</p>
              <p><strong>Descuento Comercial:</strong> - {formatCurrency(infoCotizacion.descuentoComercial)}</p>
              <p><strong>IVA:</strong> {formatCurrency(infoCotizacion.iva)}</p>
              <p className="font-bold pt-2 border-t mt-2"><strong>Valor Final Socio:</strong> {formatCurrency(infoCotizacion.valorFinalSocio)}</p>
              <p className="text-xs text-gray-500">Descuentos Aplicados: {infoCotizacion.descuentosAplicados?.join(', ') || 'N/A'}</p>
              <p className="text-xs text-gray-500">Observaciones: {infoCotizacion.observaciones || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 font-semibold text-xs">Forecast</p>
              <p className="font-bold text-xl text-green-600">
                {formatCurrency(infoCotizacion.valorForecast)}
              </p>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="Información de Proceso (Editable)" startOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`idOnboarding-${lead.id}`} className="text-sm font-medium text-gray-700">ID de Onboarding</label>
              <input id={`idOnboarding-${lead.id}`} name="idOnboarding" value={procesoData.idOnboarding || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor={`numeroPrecarga-${lead.id}`} className="text-sm font-medium text-gray-700">Número de Precarga</label>
              <input id={`numeroPrecarga-${lead.id}`} name="numeroPrecarga" value={procesoData.numeroPrecarga || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor={`precarga-${lead.id}`} className="text-sm font-medium text-gray-700">Estado Precarga</label>
              <select id={`precarga-${lead.id}`} name="precarga" value={procesoData.precarga || 'Pendiente'} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500">
                <option>Pendiente</option>
                <option>Incompleta</option>
                <option>Completa</option>
              </select>
            </div>
            <div>
              <label htmlFor={`mesProduccion-${lead.id}`} className="text-sm font-medium text-gray-700">Mes de Producción</label>
              <input id={`mesProduccion-${lead.id}`} type="month" name="mesProduccion" value={procesoData.mesProduccion || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </AccordionSection>
      </div>

      <div className="flex flex-wrap justify-end gap-4 mt-6 pt-4 border-t border-gray-300">
        <button
          onClick={handleSaveChanges}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          Guardar Cambios
        </button>
        {/* Botón para devolver el lead al funnel de ventas en la etapa de Cierre */}
        <button
          onClick={handleReturnToFunnel}
          className="px-6 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors shadow-md"
        >
          Volver al Funnel
        </button>
        <button
          onClick={handleConfirmAction}
          className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-md"
        >
          Finalizar Proceso
        </button>
      </div>
    </div>
  );
};

export default OnboardingLeadCard;
