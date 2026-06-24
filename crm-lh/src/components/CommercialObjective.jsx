import React from 'react';
import { Target, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

const CommercialObjective = ({
  totalCompletado,
  objetivoMensual,
  objetivoMensualAnterior,
  monthName,
  year
}) => {
  const progresoObjetivo = objetivoMensual > 0 ? (totalCompletado / objetivoMensual) * 100 : 0;
  const progresoObjetivoAnterior = objetivoMensualAnterior > 0 ? (totalCompletado / objetivoMensualAnterior) * 100 : 0;

  const getCommissionTier = (percentage) => {
    if (percentage < 60) return { tier: 1, commission: 35, label: '<60%', color: '#ef4444' };
    if (percentage <= 80) return { tier: 2, commission: 40, label: '60-80%', color: '#f97316' };
    if (percentage < 100) return { tier: 3, commission: 45, label: '80-100%', color: '#eab308' };
    if (percentage < 115) return { tier: 4, commission: 50, label: '100-115%', color: '#22c55e' };
    return { tier: 5, commission: 60, label: '≥115%', color: '#059669' };
  };

  const commissionInfo = getCommissionTier(progresoObjetivo);

  // Thresholds y comisiones del SIGUIENTE tramo al alcanzar cada threshold
  const nextTierThresholds = [60, 80, 100, 115];
  const nextTierCommissions = [40, 45, 50, 60];
  const nextTierIndex = nextTierThresholds.findIndex(t => t > progresoObjetivo);
  const nextTierValue = nextTierIndex !== -1 ? nextTierThresholds[nextTierIndex] : 115;
  const nextCommission = nextTierIndex !== -1
    ? nextTierCommissions[nextTierIndex]
    : 60;

  const montoFaltante = (objetivoMensual * nextTierValue / 100) - totalCompletado;
  const cambioVsAnterior = progresoObjetivo - progresoObjetivoAnterior;
  const isPositiveChange = cambioVsAnterior > 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl p-6 text-white border border-slate-700/50">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Objetivo Comercial</p>
          <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-blue-400" />
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            {progresoObjetivo.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 uppercase tracking-wide">de cumplimiento</p>
        </div>
      </div>

      {/* Valores principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Vendido</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-400">
            ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(totalCompletado)}
          </p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Objetivo</p>
          <p className="text-lg sm:text-xl font-bold text-white">
            ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(objetivoMensual)}
          </p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Faltante</p>
          <p className="text-lg sm:text-xl font-bold text-red-400">
            ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.max(0, objetivoMensual - totalCompletado))}
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mb-6">
        <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden border border-slate-700/50">
          <div
            className="h-4 rounded-full transition-all duration-500 shadow-lg"
            style={{
              width: `${Math.min(progresoObjetivo, 115)}%`,
              backgroundColor: commissionInfo.color,
              boxShadow: `0 0 20px ${commissionInfo.color}80`
            }}
          />
        </div>
      </div>

      {/* Escala Comisional */}
      <div className="mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Escala Comisional por Tramo</p>

        <div className="flex gap-1 h-14 rounded-xl overflow-hidden mb-6 shadow-lg">
          {[
            { label: '<60%', commission: '35%', bg: 'bg-red-500' },
            { label: '60-80%', commission: '40%', bg: 'bg-orange-500' },
            { label: '80-100%', commission: '45%', bg: 'bg-yellow-500' },
            { label: '100-115%', commission: '50%', bg: 'bg-green-500' },
            { label: '≥115%', commission: '60%', bg: 'bg-emerald-600' }
          ].map((tier, idx) => (
            <div key={idx} className={`flex-1 ${tier.bg} flex items-center justify-center`}>
              <span className="text-white text-xs sm:text-sm font-bold text-center leading-tight">
                {tier.label}<br/>{tier.commission}
              </span>
            </div>
          ))}
        </div>

        {/* Indicador de posición */}
        <div className="relative h-8 bg-slate-800/50 rounded-lg flex items-center px-2 border border-slate-700/50" style={{ minHeight: '40px' }}>
          <div
            className="absolute h-6 rounded-md transition-all duration-300"
            style={{
              left: `calc(${Math.min(progresoObjetivo, 115) / 1.15}% - 12px)`,
              width: '24px',
              backgroundColor: commissionInfo.color,
              borderRadius: '4px',
              opacity: 0.4
            }}
          />
          <div
            className="absolute flex flex-col items-center transition-all duration-300"
            style={{
              left: `calc(${Math.min(progresoObjetivo, 115) / 1.15}%)`,
              transform: 'translateX(-50%)',
              top: '-25px'
            }}
          >
            <div className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
              {progresoObjetivo.toFixed(1)}%
            </div>
            <div className="w-3 h-3 rounded-full ring-2 ring-white/30" style={{ backgroundColor: commissionInfo.color }} />
          </div>
        </div>
      </div>

      {/* Información del Tramo Actual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pt-6 border-t border-slate-700/50">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 backdrop-blur-sm p-5 rounded-xl border border-blue-500/30">
          <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold mb-2">💰 Comisión Actual</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
              {commissionInfo.commission}%
            </p>
            <p className="text-xs text-blue-300">Tramo {commissionInfo.label}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-500/20">
            <p className="text-xs text-blue-300 uppercase tracking-wide font-semibold mb-1">💵 A recibir</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(totalCompletado * (commissionInfo.commission / 100))}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {commissionInfo.commission}% sobre ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(totalCompletado)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-800/20 backdrop-blur-sm p-5 rounded-xl border border-purple-500/30">
          <p className="text-xs text-purple-300 uppercase tracking-wider font-semibold mb-2">📈 Próximo Hito</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-300 to-fuchsia-200 bg-clip-text text-transparent">
              {nextTierValue}%
            </p>
            <p className="text-xs text-purple-300">({nextCommission}% comisión)</p>
          </div>
          <div className="mt-4 pt-4 border-t border-purple-500/20">
            <p className="text-xs text-purple-300 uppercase tracking-wide font-semibold mb-1">📊 Faltarían</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.max(0, montoFaltante))}
            </p>
            <p className="text-xs text-emerald-400 mt-1 font-semibold">
              Comisión proyectada: ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format((objetivoMensual * nextTierValue / 100) * (nextCommission / 100))}
            </p>
          </div>
        </div>
      </div>

      {/* Comparativa vs Mes Anterior */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-700/50">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
          <TrendingUp size={14} />
          Comparativa Mensual
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Mes Anterior</p>
            <p className="text-lg font-bold text-white">{progresoObjetivoAnterior.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Mes Actual</p>
            <p className="text-lg font-bold text-white">{progresoObjetivo.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Diferencia</p>
            <div className="flex items-center gap-1">
              {isPositiveChange ? (
                <ArrowUp size={16} className="text-emerald-400" />
              ) : (
                <ArrowDown size={16} className="text-red-400" />
              )}
              <p className={`text-lg font-bold ${isPositiveChange ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.abs(cambioVsAnterior).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercialObjective;
