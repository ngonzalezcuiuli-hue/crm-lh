import React, { useState } from 'react';
import useAuth from '../hooks/useAuth.jsx';
import useDashboardMetrics from '../hooks/useDashboardMetrics.js';
import Topbar from './Topbar.jsx';
import Spinner from './Spinner.jsx';
import CommercialObjective from './CommercialObjective.jsx';
import ForecastProjection from './ForecastProjection.jsx';
import ObjectiveManager from './ObjectiveManager.jsx';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowUp, ArrowDown, Minus, Users, TrendingUp, DollarSign, ChevronLeft, ChevronRight, ArrowDownRight, Settings } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];


const KpiCard = ({ title, value, previousValue, icon, prefix = '', suffix = '', historico = [], extraInfo = [] }) => {
  const change = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : (value > 0 ? 100 : 0);
  const isPositive = change > 0;
  const isNegative = change < 0;

  const ChangeIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  const changeColor = isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400';

  const formattedValue = suffix === '%'
    ? `${parseFloat(value).toFixed(1)}${suffix}`
    : `${prefix}${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value)}`;

  const maxValue = historico.length > 0 ? Math.max(...historico.map(h => h.value)) : 1;
  const filteredHistorico = historico.filter(h => h.value > 0);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl shadow-2xl flex-1 text-white border border-slate-700/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-medium text-slate-300 uppercase tracking-wider">{title}</p>
        <div className="bg-sky-500/20 text-sky-300 p-2 rounded-xl backdrop-blur-sm border border-sky-500/30">
          {icon}
        </div>
      </div>

      {/* Valor principal */}
      <div className="mb-3">
        <p className="text-4xl sm:text-5xl font-bold tracking-tight">{formattedValue}</p>
        <div className="flex items-center text-xs mt-2">
          <div className={`flex items-center ${changeColor} font-semibold`}>
            <ChangeIcon size={14} className="mr-1" />
            <span>{change.toFixed(1)}%</span>
          </div>
          <p className="text-slate-400 ml-2">vs mes anterior</p>
        </div>
      </div>

      {/* Info adicional (capitas, ventas, etc.) */}
      {extraInfo.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
          {extraInfo.map((item, index) => (
            <div key={index} className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg">
              <span className="text-xs text-slate-300 font-medium">{item.label}</span>
              <span className="text-sm font-bold text-white">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico estilo "Hourly outlook" */}
      {filteredHistorico.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Últimos 3 meses</p>
            <span className="text-xs text-slate-500">Tendencia</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-end justify-between gap-3 h-28">
              {filteredHistorico.map((mes, index) => {
                const heightPercent = maxValue > 0 ? (mes.value / maxValue) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                    <p className="text-sm font-bold text-white mb-2">{mes.value}</p>
                    <div
                      className="w-full bg-gradient-to-t from-sky-600 via-sky-400 to-cyan-300 rounded-lg shadow-lg shadow-sky-500/30 transition-all hover:shadow-sky-400/50"
                      style={{ height: `${heightPercent}%`, minHeight: '12px' }}
                    />
                    <p className="text-xs text-slate-400 mt-2 font-medium uppercase">{mes.mes}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showObjectiveManager, setShowObjectiveManager] = useState(false);

  const { metrics, loading } = useDashboardMetrics(user?.uid, currentDate);
  const {
    objetivoMensual, objetivoMensualAnterior, totalCompletado, nuevosLeadsMes, tasaConversion,
    valorPromedioVenta, totalCompletadoAnterior, nuevosLeadsMesAnterior, nuevosLeadsHistorico,
    ventasPorPlan, leadsPorOrigen, forecastPorEtapa,
    totalCapitas, valorCapitaPromedio, cantidadVentas
  } = metrics;

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (nextMonth <= new Date()) {
      setCurrentDate(nextMonth);
    }
  };

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  const progresoObjetivo = objetivoMensual > 0 ? (totalCompletado / objetivoMensual) * 100 : 0;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <Spinner />
          </div>
        ) : (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {/* Selector de Mes */}
            <div className="flex justify-center items-center mb-6 bg-slate-900/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50 max-w-md mx-auto">
              <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-700/50 transition">
                <ChevronLeft className="h-6 w-6 text-slate-300" />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-white mx-4 w-48 text-center capitalize tracking-wide">{`${monthName} ${year}`}</h2>
              <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-700/50 transition disabled:opacity-30" disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}>
                <ChevronRight className="h-6 w-6 text-slate-300" />
              </button>
              <button
                onClick={() => setShowObjectiveManager(true)}
                className="p-2 rounded-full hover:bg-blue-500/20 ml-2 transition"
                title="Gestionar objetivos mensuales"
              >
                <Settings className="h-6 w-6 text-blue-400" />
              </button>
            </div>

            {/* NUEVO: Objetivo Comercial con Escala Comisional - PRIMERA SECCIÓN */}
            <div className="mb-6">
              <CommercialObjective
                totalCompletado={totalCompletado}
                objetivoMensual={objetivoMensual}
                objetivoMensualAnterior={objetivoMensualAnterior}
                monthName={monthName}
                year={year}
              />
            </div>

            {/* Dashboard de Rendimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KpiCard title="Ventas del Mes" value={totalCompletado} previousValue={totalCompletadoAnterior} icon={<DollarSign />} prefix="$" />
              <KpiCard title="Nuevos Leads" value={nuevosLeadsMes} previousValue={nuevosLeadsMesAnterior} icon={<Users />} historico={nuevosLeadsHistorico} />
              <KpiCard title="Tasa de Conversión" value={tasaConversion} previousValue={0} icon={<TrendingUp />} suffix="%" />
              <KpiCard
                title="Ticket Promedio"
                value={valorPromedioVenta}
                previousValue={0}
                icon={<ArrowDownRight />}
                prefix="$"
                extraInfo={[
                  { label: '🎫 Cantidad de ventas', value: cantidadVentas || 0 },
                  { label: '👥 Total de capitas', value: totalCapitas || 0 },
                  { label: '💵 Valor promedio/capita', value: `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valorCapitaPromedio || 0)}` },
                ]}
              />
            </div>

            {/* NUEVO: Forecast Proyectado */}
            <div className="mt-6">
              <ForecastProjection
                totalCompletado={totalCompletado}
                forecastPorEtapa={forecastPorEtapa}
                objetivoMensual={objetivoMensual}
                tasaConversion={tasaConversion}
              />
            </div>

            {/* Gráficos */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Leads por Origen - Tabla con Cantidad, Porcentaje y Tasa de Cierre */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl shadow-2xl border border-slate-700/50 text-white">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">Leads por Origen</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Origen</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Leads</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">%</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Cierre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadsPorOrigen.length > 0 ? (
                        leadsPorOrigen.map((origen, index) => (
                          <tr key={origen.name} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-lg"
                                  style={{ backgroundColor: COLORS[index % COLORS.length], boxShadow: `0 0 8px ${COLORS[index % COLORS.length]}80` }}
                                />
                                <span className="font-semibold text-white">{origen.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2 font-bold text-white">
                              {origen.value}
                            </td>
                            <td className="text-center py-3 px-2 text-slate-300">
                              {origen.porcentaje.toFixed(1)}%
                            </td>
                            <td className="text-center py-3 px-2">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                origen.tasaCierre >= 20 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                origen.tasaCierre >= 10 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                origen.tasaCierre > 0 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                              }`}>
                                {origen.tasaCierre.toFixed(1)}%
                              </span>
                              <p className="text-xs text-slate-500 mt-1">{origen.completados} cerrado{origen.completados !== 1 ? 's' : ''}</p>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-slate-500">
                            No hay datos disponibles
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {leadsPorOrigen.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-slate-700 bg-slate-800/40">
                          <td className="py-3 px-2 font-bold text-white uppercase text-xs tracking-wider">Total</td>
                          <td className="text-center py-3 px-2 font-bold text-white">
                            {leadsPorOrigen.reduce((sum, o) => sum + o.value, 0)}
                          </td>
                          <td className="text-center py-3 px-2 font-bold text-white">100%</td>
                          <td className="text-center py-3 px-2 font-bold text-emerald-400">
                            {(() => {
                              const totalLeads = leadsPorOrigen.reduce((sum, o) => sum + o.value, 0);
                              const totalCerrados = leadsPorOrigen.reduce((sum, o) => sum + o.completados, 0);
                              return totalLeads > 0 ? ((totalCerrados / totalLeads) * 100).toFixed(1) : '0.0';
                            })()}%
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl shadow-2xl border border-slate-700/50 text-white">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">Ventas por Plan</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ventasPorPlan}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {ventasPorPlan.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#1e293b" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value)}`}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#cbd5e1' }}
                      formatter={(value) => <span style={{ color: '#cbd5e1' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Modal ObjectiveManager */}
        {showObjectiveManager && (
          <ObjectiveManager onClose={() => setShowObjectiveManager(false)} />
        )}
      </div>
    </div>
  );
}