// src/components/Reports.jsx
import React, { useState, useEffect } from 'react';
import { useReports } from '../hooks/useReports';
import { getAppSettings } from '../services/configService';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('completado');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  // Filtro: mes de producción (YYYY-MM)
  const [productionMonth, setProductionMonth] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [objectiveValue, setObjectiveValue] = useState(0);

  // Función utilitaria para formatear números como moneda argentina (Visualización UI)
  const formatCurrency = (num) => {
    const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num || 0);
    return formatted.replace(/[\u00A0\u202F]/g, '');
  };
  
  const { 
    reportData, 
    loading, 
    error, 
    fetchReportData
  } = useReports();

  const reportTypes = [
    {
      id: 'completado',
      name: 'Leads Completados',
      description: 'Trámites completados con información de producción'
    },
    {
      id: 'onboarding',
      name: 'Leads en Onboarding',
      description: 'Trámites en proceso de onboarding'
    },
    {
      id: 'perdido',
      name: 'Leads Perdidos',
      description: 'Todos los datos de leads perdidos'
    }
  ];

  useEffect(() => {
    fetchReportData(selectedReport, dateFilter);
  }, [selectedReport, dateFilter, fetchReportData]);

  // Obtener objetivos comerciales según el mes seleccionado
  useEffect(() => {
    async function fetchObjective() {
      try {
        const settings = await getAppSettings();
        const objetivos = settings?.objetivosComerciales || {};
        if (productionMonth && objetivos[productionMonth]) {
          setObjectiveValue(objetivos[productionMonth]);
        } else {
          setObjectiveValue(0);
        }
      } catch (error) {
        console.error('Error al obtener metas:', error);
        setObjectiveValue(0);
      }
    }
    fetchObjective();
  }, [productionMonth]);

  // Datos filtrados por mes
  const filteredReportData = React.useMemo(() => {
    if (!productionMonth) return reportData;
    return reportData.filter((lead) => {
      const mes = lead.infoProceso?.mesProduccion || '';
      return mes.startsWith(productionMonth);
    });
  }, [reportData, productionMonth]);

  const finalReportData = React.useMemo(() => {
    return filteredReportData;
  }, [filteredReportData]);

  // Métricas para el Resumen en Pantalla (UI)
  const metrics = React.useMemo(() => {
    const totalContratos = finalReportData.length;
    let totalCapitas = 0;
    let totalForecastAmount = 0;
    const originCounts = {};
    finalReportData.forEach((lead) => {
      const integrantes = lead.infoCotizacion?.cantidadIntegrantes;
      totalCapitas += integrantes ? Number(integrantes) : 0;
      const forecastVal = lead.infoCotizacion?.valorForecast;
      totalForecastAmount += forecastVal ? Number(forecastVal) : 0;
      const origin = lead.origenDato || 'Sin origen';
      originCounts[origin] = (originCounts[origin] || 0) + 1;
    });
    const originPercentages = {};
    Object.entries(originCounts).forEach(([origin, count]) => {
      originPercentages[origin] = totalContratos > 0 ? (count / totalContratos) * 100 : 0;
    });
    return { totalContratos, totalCapitas, originPercentages, totalForecastAmount };
  }, [finalReportData]);

  // -----------------------------------------------------------
  // FUNCIÓN DE EXPORTACIÓN CORREGIDA (Columnas separadas)
  // -----------------------------------------------------------
  const handleDownloadExcel = () => {
    setIsExporting(true);
    try {
      // 1. Definir Encabezados
      const headers = [
        'Nombre',
        'DNI',
        'ID',
        'Precarga',
        'Numero Precarga',
        'Forecast',
        'Plan',
        'Integrantes',
        'Mes Produccion'
      ];
      
      const delimiter = ';'; // Separador estándar latino
      
      // 2. Construir filas de datos
      const dataRows = finalReportData.map((lead) => {
        const nombre = lead.nombre || '';
        const dni = lead.dni || '';
        const id = lead.numeroTramite || '';
        const precarga = lead.infoProceso?.precarga || '';
        const numeroPrecarga = lead.infoProceso?.numeroPrecarga || '';
        
        // Formato moneda para Excel
        const forecastVal = lead.infoCotizacion?.valorForecast;
        let forecast = '';
        if (forecastVal) {
          forecast = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(forecastVal);
          forecast = forecast.replace(/[\u00A0\u202F]/g, ''); // Limpiar espacios raros
        }
        
        const plan = lead.infoCotizacion?.plan || '';
        const integrantes = lead.infoCotizacion?.cantidadIntegrantes || '';
        const mesProd = lead.infoProceso?.mesProduccion || '';

        // Sanitizar cada campo: 
        // - Convertir a string
        // - Quitar saltos de línea
        // - Escapar comillas dobles (Excel usa "" para una comilla literal)
        // - Envolver en comillas
        const sanitized = [nombre, dni, id, precarga, numeroPrecarga, forecast, plan, integrantes, mesProd].map((val) => {
          let str = (val ?? '').toString();
          str = str.replace(/[\t\n\r]/g, ' ').trim(); 
          str = str.replace(/"/g, '""'); 
          return `"${str}"`;
        });
        
        return sanitized.join(delimiter);
      });

      // 3. Generar contenido del CSV
      // ¡IMPORTANTE!: "sep=;" en la primera línea le dice a Excel qué separador usar.
      const csvContentString = [
        'sep=;', 
        headers.map((h) => `"${h}"`).join(delimiter),
        ...dataRows
      ].join('\n');
      
      // 4. Crear Blob con BOM (Byte Order Mark) para tildes y ñ en UTF-8
      const blob = new Blob(['\uFEFF' + csvContentString], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const monthSuffix = productionMonth ? `_${productionMonth}` : '';
      link.setAttribute('download', `informe_completados${monthSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      alert('Error al generar el archivo: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Renderizadores de Tabla
  const renderTableHeaders = () => {
    switch (selectedReport) {
      case 'completado':
        return (
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">DNI</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Precarga</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Número Precarga</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Forecast</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Plan</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Integrantes</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Mes Producción</th>
          </tr>
        );
      case 'onboarding':
        return (
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">DNI</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Precarga</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Forecast</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Plan</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Integrantes</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Mes Producción</th>
          </tr>
        );
      case 'perdido':
        return (
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">DNI</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Celular</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Razón Perdida</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Última Etapa</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Localidad</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Provincia</th>
          </tr>
        );
      default:
        return null;
    }
  };

  const renderTableRow = (lead, index) => {
    switch (selectedReport) {
      case 'completado':
        return (
          <tr key={lead.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.nombre}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.dni}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.numeroTramite}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoProceso?.precarga || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoProceso?.numeroPrecarga || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">
              {lead.infoCotizacion?.valorForecast ? 
                formatCurrency(lead.infoCotizacion.valorForecast) : 'N/A'}
            </td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoCotizacion?.plan || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoCotizacion?.cantidadIntegrantes || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoProceso?.mesProduccion || 'N/A'}</td>
          </tr>
        );
      case 'onboarding':
        return (
          <tr key={lead.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.nombre}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.dni}</td>
            <td className="px-4 py-2 text-sm text-gray-900">
              {lead.infoCotizacion?.valorForecast ? 
                formatCurrency(lead.infoCotizacion.valorForecast) : 'N/A'}
            </td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoCotizacion?.plan || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoProceso?.idOnboarding || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoProceso?.mesProduccion || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.infoProceso?.numeroPrecarga || 'N/A'}</td>
          </tr>
        );
      case 'perdido':
        return (
          <tr key={lead.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.nombre}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.dni}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.mail}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.celular}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.razonPerdida || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.etapa}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.zona?.localidad || 'N/A'}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{lead.zona?.provincia || 'N/A'}</td>
          </tr>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Informes</h1>
          <p className="text-gray-600">Genera y descarga informes de tus leads en formato CSV para trabajar en Excel</p>
        </div>

        {/* Filtros */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Selector de tipo de informe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Informe
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
              >
                {reportTypes.map(report => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mes de producción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes de Producción
              </label>
              <input
                type="month"
                value={productionMonth}
                onChange={(e) => setProductionMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botón de descargar Excel */}
            <div className="flex items-end">
              <button
                onClick={handleDownloadExcel}
                disabled={isExporting || loading || finalReportData.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {isExporting ? 'Generando...' : 'Descargar CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Descripción del informe seleccionado */}
        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-blue-700 text-sm">
              {reportTypes.find(r => r.id === selectedReport)?.description}
            </p>
          </div>
        </div>

        {/* Resumen de métricas: SOLO VISUAL (UI) */}
        {selectedReport === 'completado' && (
          <div className="mb-4">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-gray-700 text-sm font-medium">Resumen</p>
              <p className="text-gray-700 text-sm">Total de contratos: {metrics.totalContratos}</p>
              <p className="text-gray-700 text-sm">Total de capitas: {metrics.totalCapitas}</p>
              <div className="mt-2">
                <p className="text-gray-700 text-sm font-medium mb-1">Porcentaje por origen de dato:</p>
                <ul className="list-disc list-inside text-gray-700 text-sm">
                  {Object.entries(metrics.originPercentages).map(([origin, percentage]) => (
                    <li key={origin}>
                      {origin}: {percentage.toFixed(2)}%
                    </li>
                  ))}
                </ul>
              </div>
              {/* Barra de progreso del objetivo comercial */}
              <div className="mt-3">
                <p className="text-gray-700 text-sm font-medium mb-1">Alcance del objetivo:</p>
                {(() => {
                  const porcentaje = objectiveValue > 0 ? (metrics.totalForecastAmount / objectiveValue) * 100 : 0;
                  const porcentajeClamped = porcentaje > 100 ? 100 : porcentaje;
                  return (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-green-500 h-4 rounded-full"
                          style={{ width: `${porcentajeClamped}%` }}
                        ></div>
                      </div>
                      <p className="text-gray-700 text-sm mt-1">
                        {formatCurrency(metrics.totalForecastAmount)} / {formatCurrency(objectiveValue)} ({porcentaje.toFixed(2)}%)
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Tabla de resultados */}
        <div className="bg-white shadow-sm rounded-lg border">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Resultados ({finalReportData.length} registros)
            </h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando datos...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <p>Error al cargar los datos: {error}</p>
            </div>
          ) : finalReportData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No se encontraron datos para los filtros seleccionados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {renderTableHeaders()}
                </thead>
                <tbody>
                  {finalReportData.map((lead, index) => renderTableRow(lead, index))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;