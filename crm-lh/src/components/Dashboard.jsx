import React, { useState } from 'react';
import useAuth from '../hooks/useAuth.jsx';
import useDashboardMetrics from '../hooks/useDashboardMetrics.js';
import Topbar from './Topbar.jsx';
import Spinner from './Spinner.jsx';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUp, ArrowDown, Minus, Target, Users, TrendingUp, DollarSign, ChevronLeft, ChevronRight, ChevronsRight, ArrowDownRight } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const FUNNEL_COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#AF1999'];


// SIN CAMBIOS EN ESTE COMPONENTE
const KpiCard = ({ title, value, previousValue, icon, prefix = '', suffix = '' }) => {
  const change = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : (value > 0 ? 100 : 0);
  const isPositive = change > 0;
  const isNegative = change < 0;

  const ChangeIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  const changeColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-500';

  const formattedValue = suffix === '%'
    ? `${parseFloat(value).toFixed(1)}${suffix}`
    : `${prefix}${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value)}`;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-lg flex-1">
      <div className="flex justify-between items-start">
        <p className="text-sm sm:text-base font-medium text-slate-500">{title}</p>
        <div className="bg-sky-100 text-sky-600 p-2 rounded-lg">
          {icon}
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-2">{formattedValue}</p>
      <div className="flex items-center text-sm mt-2">
        <div className={`flex items-center ${changeColor}`}>
          <ChangeIcon size={16} className="mr-1" />
          <span>{change.toFixed(1)}%</span>
        </div>
        <p className="text-slate-500 ml-2">vs mes anterior</p>
      </div>
    </div>
  );
};

// NUEVO COMPONENTE PARA CADA ETAPA DEL FUNNEL
const FunnelStageCard = ({ etapa, color }) => (
  <div className="bg-white rounded-lg shadow-md p-4 flex-shrink-0 w-48 border-l-4" style={{ borderColor: color }}>
    <p className="font-semibold text-slate-700 truncate">{etapa.name}</p>
    <p className="text-2xl font-bold text-slate-900 mt-2">
      ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(etapa.value)}
    </p>
    <p className="text-sm text-slate-500 mt-1">{etapa.count} leads</p>
  </div>
);


export default function Dashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { metrics, loading } = useDashboardMetrics(user?.uid, currentDate);
  const {
    objetivoMensual, totalCompletado, nuevosLeadsMes, tasaConversion,
    valorPromedioVenta, totalCompletadoAnterior, nuevosLeadsMesAnterior,
    ventasPorPlan, leadsPorOrigen, forecastPorEtapa
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
    <div className="flex h-screen bg-slate-100">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <Spinner />
          </div>
        ) : (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {/* Selector de Mes */}
            <div className="flex justify-center items-center mb-6">
              <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-200">
                <ChevronLeft className="h-6 w-6 text-slate-600" />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mx-4 w-48 text-center capitalize">{`${monthName} ${year}`}</h2>
              <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-200" disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}>
                <ChevronRight className="h-6 w-6 text-slate-600" />
              </button>
            </div>

            {/* Dashboard de Rendimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KpiCard title="Ventas del Mes" value={totalCompletado} previousValue={totalCompletadoAnterior} icon={<DollarSign />} prefix="$" />
              <KpiCard title="Nuevos Leads" value={nuevosLeadsMes} previousValue={nuevosLeadsMesAnterior} icon={<Users />} />
              <KpiCard title="Tasa de Conversión" value={tasaConversion} previousValue={0} icon={<TrendingUp />} suffix="%" />
              <KpiCard title="Ticket Promedio" value={valorPromedioVenta} previousValue={0} icon={<ArrowDownRight />} prefix="$" />
            </div>

            {/* Sección Objetivo Mensual */}
            <div className="mt-6 bg-white p-4 sm:p-6 rounded-xl shadow-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold text-slate-700">Objetivo Mensual</h3>
                <Target className="text-slate-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-2">
                ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(totalCompletado)} / <span className="text-slate-500">${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(objetivoMensual)}</span>
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progresoObjetivo}%` }}></div>
              </div>
            </div>

            {/* Funnel de Conversión - NUEVA VERSIÓN */}
            <div className="mt-6 bg-white p-4 sm:p-6 rounded-xl shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-6">Funnel de Conversión</h3>
              <div className="flex items-center justify-start overflow-x-auto pb-4 -mx-2">
                {forecastPorEtapa.map((etapa, index) => (
                  <React.Fragment key={etapa.name}>
                    <div className="px-2">
                      <FunnelStageCard
                        etapa={etapa}
                        color={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                      />
                    </div>
                    {index < forecastPorEtapa.length - 1 && (
                      <div className="flex-shrink-0 flex flex-col items-center mx-2 w-20 text-center">
                        <p className="text-sm font-bold text-green-500 mb-1">{etapa.conversionRate}%</p>
                        <ChevronsRight className="text-slate-400 w-8 h-8" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Gráficos */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4">Leads por Origen</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadsPorOrigen}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {leadsPorOrigen.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} leads`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4">Ventas por Plan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={ventasPorPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                      {ventasPorPlan.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}