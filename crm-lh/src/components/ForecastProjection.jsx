import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Check, Plus } from 'lucide-react';

const ForecastProjection = ({
  totalCompletado,
  forecastPorEtapa,
  objetivoMensual,
  tasaConversion
}) => {
  // Estado de las etapas seleccionadas (por defecto solo Onboarding)
  const [etapasSeleccionadas, setEtapasSeleccionadas] = useState({
    'Onboarding': true,
    'Proceso': false,
    'Cierre': false,
    'Seguimiento': false,
    'Cotización': false,
  });

  const etapasOrdenadas = ['Onboarding', 'Proceso', 'Cierre', 'Seguimiento', 'Cotización'];

  // Colores adaptados a tema oscuro
  const coloresEtapas = {
    'Cotización': { bg: 'bg-blue-500', text: 'text-blue-300', border: 'border-blue-400', light: 'bg-blue-500/20', gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/40' },
    'Seguimiento': { bg: 'bg-amber-500', text: 'text-amber-300', border: 'border-amber-400', light: 'bg-amber-500/20', gradient: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/40' },
    'Cierre': { bg: 'bg-emerald-500', text: 'text-emerald-300', border: 'border-emerald-400', light: 'bg-emerald-500/20', gradient: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/40' },
    'Proceso': { bg: 'bg-purple-500', text: 'text-purple-300', border: 'border-purple-400', light: 'bg-purple-500/20', gradient: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/40' },
    'Onboarding': { bg: 'bg-pink-500', text: 'text-pink-300', border: 'border-pink-400', light: 'bg-pink-500/20', gradient: 'from-pink-500 to-pink-600', glow: 'shadow-pink-500/40' }
  };

  // Probabilidad de cierre por etapa
  const probabilidadEtapa = {
    'Onboarding': 95,
    'Proceso': 80,
    'Cierre': 60,
    'Seguimiento': 35,
    'Cotización': 15
  };

  const toggleEtapa = (etapaName) => {
    setEtapasSeleccionadas(prev => ({
      ...prev,
      [etapaName]: !prev[etapaName]
    }));
  };

  const forecastSeleccionado = forecastPorEtapa
    .filter(etapa => etapasSeleccionadas[etapa.name])
    .reduce((sum, etapa) => sum + etapa.value, 0);

  const cantidadLeadsSeleccionados = forecastPorEtapa
    .filter(etapa => etapasSeleccionadas[etapa.name])
    .reduce((sum, etapa) => sum + etapa.count, 0);

  const forecastProyectado = totalCompletado + forecastSeleccionado;
  const progresoProyectado = objetivoMensual > 0 ? (forecastProyectado / objetivoMensual) * 100 : 0;
  const progresoActual = objetivoMensual > 0 ? (totalCompletado / objetivoMensual) * 100 : 0;
  const porcentajeForecast = objetivoMensual > 0 ? (forecastSeleccionado / objetivoMensual) * 100 : 0;

  const forecastConversionRealista = forecastPorEtapa
    .filter(etapa => etapasSeleccionadas[etapa.name])
    .reduce((sum, etapa) => {
      const probabilidad = (probabilidadEtapa[etapa.name] || 50) / 100;
      return sum + (etapa.value * probabilidad);
    }, 0);

  const proyeccionRealista = totalCompletado + forecastConversionRealista;
  const progresoRealista = objetivoMensual > 0 ? (proyeccionRealista / objetivoMensual) * 100 : 0;

  const etapasConDatos = etapasOrdenadas.filter(etapaName => {
    const etapa = forecastPorEtapa.find(e => e.name === etapaName);
    return etapa && (etapa.value > 0 || etapa.count > 0);
  });

  const getEtapaData = (etapaName) => {
    return forecastPorEtapa.find(e => e.name === etapaName) || { value: 0, count: 0 };
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl p-6 text-white border border-slate-700/50">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Forecast Proyectado</p>
          <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-purple-400" />
            Vendido + etapas seleccionadas
          </h3>
        </div>
        <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-300 bg-clip-text text-transparent">
          {progresoProyectado.toFixed(1)}%
        </span>
      </div>

      {/* Selector de Etapas */}
      <div className="mb-6 p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
          <Plus size={14} />
          Incluir en proyección
        </p>
        <div className="flex flex-wrap gap-2">
          {etapasOrdenadas
            .filter(etapaName => {
              const etapa = getEtapaData(etapaName);
              return etapa.value > 0 || etapa.count > 0;
            })
            .map(etapaName => {
              const etapa = getEtapaData(etapaName);
              const isSelected = etapasSeleccionadas[etapaName];
              const colors = coloresEtapas[etapaName];

              return (
                <button
                  key={etapaName}
                  onClick={() => toggleEtapa(etapaName)}
                  className={`px-4 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2 ${
                    isSelected
                      ? `${colors.border} ${colors.light} ${colors.text} font-semibold shadow-lg ${colors.glow}`
                      : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                  }`}
                >
                  {isSelected && (
                    <Check size={16} className={colors.text} />
                  )}
                  <span className="text-sm">{etapaName}</span>
                  <span className="text-xs opacity-75">
                    ({etapa.count})
                  </span>
                </button>
              );
            })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          💡 Activa o desactiva etapas para ver cómo cambia tu proyección
        </p>
      </div>

      {/* Cards Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Ya Vendido */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-green-800/20 backdrop-blur-sm p-5 rounded-xl border border-emerald-500/30">
          <p className="text-xs text-emerald-300 uppercase tracking-wider font-semibold mb-2">✅ Ya Vendido</p>
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-300 to-green-200 bg-clip-text text-transparent">
            ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(totalCompletado)}
          </p>
          <p className="text-xs text-emerald-300 mt-2">{progresoActual.toFixed(1)}% del objetivo</p>
        </div>

        {/* En Forecast Seleccionado */}
        <div className="bg-gradient-to-br from-blue-900/40 to-sky-800/20 backdrop-blur-sm p-5 rounded-xl border border-blue-500/30">
          <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold mb-2">🔄 Forecast Seleccionado</p>
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
            ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(forecastSeleccionado)}
          </p>
          <p className="text-xs text-blue-300 mt-2">
            {cantidadLeadsSeleccionados} leads · +{porcentajeForecast.toFixed(1)}% potencial
          </p>
        </div>

        {/* Proyección Total */}
        <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-800/20 backdrop-blur-sm p-5 rounded-xl border border-purple-500/30">
          <p className="text-xs text-purple-300 uppercase tracking-wider font-semibold mb-2">🎯 Proyección Total</p>
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-300 to-fuchsia-200 bg-clip-text text-transparent">
            ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(forecastProyectado)}
          </p>
          <p className="text-xs text-purple-300 mt-2">Vendido + Forecast</p>
        </div>
      </div>

      {/* Desglose por Etapa Seleccionada */}
      {etapasConDatos.filter(e => etapasSeleccionadas[e]).length > 0 && (
        <div className="mb-6 pb-6 border-t border-slate-700/50 pt-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">Desglose de Etapas Seleccionadas</p>
          <div className="space-y-3">
            {etapasOrdenadas
              .filter(etapaName => etapasSeleccionadas[etapaName])
              .map(etapaName => {
                const etapa = getEtapaData(etapaName);
                if (etapa.value === 0 && etapa.count === 0) return null;

                const porcentajeEtapa = forecastSeleccionado > 0 ? (etapa.value / forecastSeleccionado) * 100 : 0;
                const porcentajeObjetivo = objetivoMensual > 0 ? (etapa.value / objetivoMensual) * 100 : 0;
                const colors = coloresEtapas[etapaName];

                return (
                  <div key={etapaName} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-800/30 rounded-lg p-3">
                    <div className="w-full sm:w-32">
                      <p className="text-sm font-semibold text-white">{etapaName}</p>
                      <p className="text-xs text-slate-400">
                        {etapa.count} {etapa.count === 1 ? 'lead' : 'leads'} · {probabilidadEtapa[etapaName]}% prob.
                      </p>
                    </div>

                    <div className="flex-1">
                      <div className="bg-slate-700/50 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${colors.gradient} shadow-lg ${colors.glow}`}
                          style={{ width: `${Math.min(porcentajeEtapa, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right w-full sm:w-48">
                      <p className="text-sm font-bold text-white">
                        ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(etapa.value)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {porcentajeEtapa.toFixed(1)}% forecast / {porcentajeObjetivo.toFixed(1)}% obj.
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Análisis de Conversión */}
      <div className="bg-gradient-to-br from-amber-900/30 to-orange-800/20 backdrop-blur-sm p-5 rounded-xl border border-amber-500/30">
        <p className="text-xs text-amber-300 uppercase tracking-wider font-semibold mb-4 flex items-center gap-2">
          <AlertCircle size={14} />
          Proyección Realista (con probabilidad de cierre por etapa)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs text-amber-300 uppercase tracking-wide font-semibold mb-1">Forecast Bruto</p>
            <p className="text-lg sm:text-xl font-bold text-white">
              ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(forecastSeleccionado)}
            </p>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs text-amber-300 uppercase tracking-wide font-semibold mb-1">Aplicando Probabilidad</p>
            <p className="text-lg sm:text-xl font-bold text-white">
              ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(forecastConversionRealista)}
            </p>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs text-amber-300 uppercase tracking-wide font-semibold mb-1">Proyección Realista</p>
            <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-300 to-orange-200 bg-clip-text text-transparent">
              {progresoRealista.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-300 uppercase tracking-wide font-semibold">Proyección vs Objetivo</span>
            <span className="text-sm font-bold text-white">
              ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(proyeccionRealista)}
            </span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 shadow-lg ${
                progresoRealista < 60 ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/40' :
                progresoRealista <= 80 ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/40' :
                progresoRealista < 100 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-yellow-500/40' :
                progresoRealista < 115 ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/40' :
                'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/40'
              }`}
              style={{ width: `${Math.min(progresoRealista, 115)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 text-right">
            {progresoRealista >= 100
              ? '✅ Objetivo alcanzado'
              : '⚠️ Faltarían $' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.max(0, objetivoMensual - proyeccionRealista))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForecastProjection;
