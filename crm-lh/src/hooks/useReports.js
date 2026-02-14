import { useState, useCallback } from 'react';
import { useAuthContext } from '../hooks/useAuth.jsx';
import { getLeadsByStatus } from '../services/leadsService';
import { makeReportsService } from '../services/makeReportsService';

export const useReports = () => {
  const { user } = useAuthContext() || {};
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReportData = useCallback(async (reportType, dateFilter) => {
    if (!user?.uid) {
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let leads = [];

      // Obtener leads según el tipo de informe
      switch (reportType) {
        case 'completado':
          leads = await getLeadsByStatus(user.uid, 'Completado');
          break;
        case 'onboarding':
          leads = await getLeadsByStatus(user.uid, 'Onboarding');
          break;
        case 'perdido':
          leads = await getLeadsByStatus(user.uid, 'Perdido');
          break;
        default:
          leads = [];
      }

      // Aplicar filtro de fechas si está presente
      if (dateFilter.startDate || dateFilter.endDate) {
        leads = leads.filter(lead => {
          const leadDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt);
          const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : new Date('1970-01-01');
          const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : new Date();

          return leadDate >= startDate && leadDate <= endDate;
        });
      }

      // Procesar datos según el tipo de informe
      const processedLeads = processLeadsForReport(leads, reportType);

      setReportData(processedLeads);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const exportToMake = useCallback(async (reportType, data, dateFilter) => {
    if (data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    try {
      await makeReportsService.sendReportToMake({
        reportType,
        data: formatDataForExport(data, reportType),
        dateFilter,
        timestamp: new Date().toISOString(),
        totalRecords: data.length,
        userId: user?.uid
      });
    } catch (err) {
      console.error('Error exporting to Make:', err);
      throw new Error('Error al enviar datos a Google Sheets');
    }
  }, [user?.uid]);

  return {
    reportData,
    loading,
    error,
    fetchReportData,
    exportToMake
  };
};

// Función para procesar leads según el tipo de informe
const processLeadsForReport = (leads, reportType) => {
  switch (reportType) {
    case 'completado':
      return leads.filter(lead => {
        return lead.estado === 'Completado' &&
          lead.infoCotizacion &&
          lead.infoProceso;
      });

    case 'onboarding':
      return leads.filter(lead => {
        return lead.estado === 'Onboarding';
      });

    case 'perdido':
      return leads.filter(lead => {
        return lead.estado === 'Perdido';
      });

    default:
      return leads;
  }
};

// Función para formatear datos para exportación
const formatDataForExport = (data, reportType) => {
  return data.map(lead => {
    switch (reportType) {
      case 'completado':
        return {
          nombre: lead.nombre || '',
          dni: lead.dni || '',
          id: lead.numeroTramite || '',
          precarga: lead.infoProceso?.precarga || '',
          forecast: lead.infoCotizacion?.valorForecast || 0,
          plan: lead.infoCotizacion?.plan || '',
          integrantes: lead.infoCotizacion?.cantidadIntegrantes || 0,
          mesProduccion: lead.infoProceso?.mesProduccion || '',
          fechaCreacion: formatDate(lead.createdAt),
          email: lead.mail || '',
          celular: lead.celular || ''
        };

      case 'onboarding':
        return {
          nombre: lead.nombre || '',
          dni: lead.dni || '',
          forecast: lead.infoCotizacion?.valorForecast || 0,
          plan: lead.infoCotizacion?.plan || '',
          idOnboarding: lead.infoProceso?.idOnboarding || '',
          mesProduccion: lead.infoProceso?.mesProduccion || '',
          numeroPrecarga: lead.infoProceso?.numeroPrecarga || '',
          fechaCreacion: formatDate(lead.createdAt),
          email: lead.mail || '',
          celular: lead.celular || '',
          etapa: lead.etapa || ''
        };

      case 'perdido':
        return {
          nombre: lead.nombre || '',
          dni: lead.dni || '',
          email: lead.mail || '',
          celular: lead.celular || '',
          razonPerdida: lead.razonPerdida || '',
          ultimaEtapa: lead.etapa || '',
          localidad: lead.zona?.localidad || '',
          provincia: lead.zona?.provincia || '',
          fechaCreacion: formatDate(lead.createdAt),
          numeroTramite: lead.numeroTramite || '',
          origenDato: lead.origenDato || '',
          obraSocial: lead.infoAdicional?.obraSocial || '',
          cuil: lead.infoAdicional?.cuil || '',
          edades: lead.infoAdicional?.edades || '',
          cantidadIntegrantes: lead.infoAdicional?.cantidadIntegrantes || 0,
          observaciones: lead.infoAdicional?.observaciones || '',
          plan: lead.infoCotizacion?.plan || '',
          valorPlan: lead.infoCotizacion?.valorPlan || 0,
          valorForecast: lead.infoCotizacion?.valorForecast || 0,
          valorFinalSocio: lead.infoCotizacion?.valorFinalSocio || 0,
          descuentoComercial: lead.infoCotizacion?.descuentoComercial || 0,
          descuentosAplicados: Array.isArray(lead.infoCotizacion?.descuentosAplicados) ?
            lead.infoCotizacion.descuentosAplicados.join(', ') : '',
          iva: lead.infoCotizacion?.iva || 0,
          tiempoEnEtapas: calculateTimeInStages(lead.etapaHistorial),
          fechaUltimaActualizacion: formatDate(lead.lastUpdatedAt)
        };

      default:
        return lead;
    }
  });
};

// Función para formatear fechas
const formatDate = (date) => {
  if (!date) return '';

  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-AR');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Función para calcular tiempo en etapas
const calculateTimeInStages = (etapaHistorial) => {
  if (!Array.isArray(etapaHistorial)) return '';

  return etapaHistorial.map(etapa => {
    const entrada = etapa.fechaEntrada ? formatDate(etapa.fechaEntrada) : '';
    const salida = etapa.fechaSalida ? formatDate(etapa.fechaSalida) : 'Actual';
    return `${etapa.etapa}: ${entrada} - ${salida}`;
  }).join(' | ');
};