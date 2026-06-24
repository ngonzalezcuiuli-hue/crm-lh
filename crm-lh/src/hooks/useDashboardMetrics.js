// src/hooks/useDashboardMetrics.js
import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp, getDocs } from 'firebase/firestore';

const getSaleValue = (lead) => {
  const valor = lead.infoCotizacion?.valorForecast;
  return typeof valor === 'number' ? valor : 0;
};

const capitalize = (s) => {
    if (typeof s !== 'string' || !s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function useDashboardMetrics(userId, selectedDate) {
  const [metrics, setMetrics] = useState({
    objetivoMensual: 0,
    objetivoMensualAnterior: 0,
    totalCompletado: 0,
    nuevosLeadsMes: 0,
    tasaConversion: 0,
    valorPromedioVenta: 0,
    totalCompletadoAnterior: 0,
    nuevosLeadsMesAnterior: 0,
    nuevosLeadsHistorico: [], // Array con últimos 3 meses
    ventasPorPlan: [],
    leadsPorOrigen: [],
    forecastPorEtapa: [],
    onboardingForecast: 0,
    totalCapitas: 0, // Suma total de integrantes/capitas vendidas
    valorCapitaPromedio: 0, // Valor promedio por capita (total / capitas)
    cantidadVentas: 0, // Cantidad de ventas/tickets cerrados
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !selectedDate) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // --- RANGOS DE FECHAS ---
    // Helper para formatear YYYY-MM en hora local (evita el bug de timezone con toISOString)
    const formatMonthStr = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const startOfMonth = Timestamp.fromDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    const endOfMonth = Timestamp.fromDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59));
    const currentMonthStr = formatMonthStr(selectedDate);

    const prevMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    const startOfPrevMonth = Timestamp.fromDate(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1));
    const endOfPrevMonth = Timestamp.fromDate(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0, 23, 59, 59));
    const prevMonthStr = formatMonthStr(prevMonthDate);
    
    const leadsCollectionRef = collection(db, `users/${userId}/leads`);
    const metaDocRef = doc(db, `users/${userId}/metas`, currentMonthStr);
    const metaDocRefPrev = doc(db, `users/${userId}/metas`, prevMonthStr);

    // --- Listener en tiempo real para el objetivo del mes actual ---
    const unsubObjective = onSnapshot(metaDocRef, (snapshot) => {
      const objetivo = snapshot.exists() && typeof snapshot.data().objetivo === 'number' ? snapshot.data().objetivo : 0;
      setMetrics(prev => ({ ...prev, objetivoMensual: objetivo }));
    }, (error) => {
      console.error("Error cargando objetivo actual:", error);
    });

    // --- Listener para leads del mes actual ---
    // CORREGIDO: Se cambió 'fechaDeCreacion' a 'createdAt' para que coincida con la base de datos.
    const qAllLeadsMonth = query(leadsCollectionRef, where('createdAt', '>=', startOfMonth), where('createdAt', '<=', endOfMonth));
    const unsubAllLeads = onSnapshot(qAllLeadsMonth, (snapshot) => {
        const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalNewLeads = leads.length;

        // Calcular total y completados por origen
        const sources = {};
        leads.forEach(lead => {
            const origen = lead.origenDato || 'Desconocido';
            if (!sources[origen]) {
                sources[origen] = { total: 0, completados: 0 };
            }
            sources[origen].total += 1;
            if (lead.estado === 'Completado') {
                sources[origen].completados += 1;
            }
        });

        const leadsPorOrigen = Object.keys(sources)
            .map(name => {
                const total = sources[name].total;
                const completados = sources[name].completados;
                const tasaCierre = total > 0 ? (completados / total) * 100 : 0;
                const porcentaje = totalNewLeads > 0 ? (total / totalNewLeads) * 100 : 0;
                return {
                    name,
                    value: total,
                    completados,
                    tasaCierre,
                    porcentaje
                };
            })
            .sort((a, b) => b.value - a.value);

        setMetrics(prev => ({
            ...prev,
            nuevosLeadsMes: totalNewLeads,
            leadsPorOrigen
        }));
    });

    // --- Listener para leads COMPLETADOS en el mes de producción actual ---
    const qCompleted = query(leadsCollectionRef, where('estado', '==', 'Completado'), where('infoProceso.mesProduccion', '==', currentMonthStr));
    const unsubCompleted = onSnapshot(qCompleted, (snapshot) => {
      let total = 0;
      let totalCapitas = 0;
      const planSales = {};
      const numVentas = snapshot.size;

      snapshot.docs.forEach(doc => {
        const lead = { id: doc.id, ...doc.data() };
        const saleValue = getSaleValue(lead);
        total += saleValue;

        // Sumar capitas (integrantes) - puede ser número o string
        const integrantes = lead.infoCotizacion?.cantidadIntegrantes;
        totalCapitas += integrantes ? Number(integrantes) : 0;

        const planName = lead.infoCotizacion?.plan || 'Sin Plan';
        if (!planSales[planName]) planSales[planName] = { value: 0 };
        planSales[planName].value += saleValue;
      });

      const ventasPorPlan = Object.keys(planSales).map(name => ({ name, value: planSales[name].value }));
      const valorPromedio = numVentas > 0 ? total / numVentas : 0;
      const valorCapitaPromedio = totalCapitas > 0 ? total / totalCapitas : 0;

      setMetrics(prev => ({
          ...prev,
          totalCompletado: total,
          ventasPorPlan,
          valorPromedioVenta: valorPromedio,
          totalCapitas,
          valorCapitaPromedio,
          cantidadVentas: numVentas,
          tasaConversion: prev.nuevosLeadsMes > 0 ? (numVentas / prev.nuevosLeadsMes) * 100 : 0,
      }));
    });

    // --- Listener para leads en FUNNEL (Forecast) ---
    const qFunnel = query(leadsCollectionRef, where('estado', 'in', ['Funnel', 'Onboarding', 'Proceso']));
    const unsubFunnel = onSnapshot(qFunnel, (snapshot) => {
      const forecast = { 'Cotización': {value: 0, count: 0}, 'Seguimiento': {value: 0, count: 0}, 'Cierre': {value: 0, count: 0}, 'Proceso': {value: 0, count: 0}, 'Onboarding': {value: 0, count: 0} };
      
      snapshot.docs.forEach(doc => {
        const lead = { id: doc.id, ...doc.data() };
        const saleValue = getSaleValue(lead);
        const estado = capitalize(lead.estado);
        const etapa = capitalize(lead.etapa);
        const stage = (estado === 'Funnel') ? etapa : estado;

        if (forecast.hasOwnProperty(stage)) {
            forecast[stage].value += saleValue;
            forecast[stage].count += 1;
        }
      });

      const orderedStages = ['Cotización', 'Seguimiento', 'Cierre', 'Proceso', 'Onboarding'];
      const forecastPorEtapa = orderedStages
        .map(name => ({ name, value: forecast[name].value, count: forecast[name].count }))
        .filter(item => item.value > 0 || item.count > 0);
        
      const onboardingForecast = forecast['Onboarding']?.value || 0;

      setMetrics(prev => ({
          ...prev,
          forecastPorEtapa,
          onboardingForecast,
      }));
    });

    // --- Función asíncrona para cargar datos de meses anteriores ---
    const loadInitialAndPastData = async () => {
      try {
        const metaDocSnapPrev = await getDoc(metaDocRefPrev);
        const objetivoPrev = metaDocSnapPrev.exists() && typeof metaDocSnapPrev.data().objetivo === 'number' ? metaDocSnapPrev.data().objetivo : 0;

        // Cargar leads del mes anterior
        const qPrevLeads = query(leadsCollectionRef, where('createdAt', '>=', startOfPrevMonth), where('createdAt', '<=', endOfPrevMonth));
        const prevLeadsSnap = await getDocs(qPrevLeads);
        const nuevosLeadsMesAnterior = prevLeadsSnap.size;

        // Calcular leads para hace 2 meses (usando construcción explícita en hora local)
        const twoMonthsAgoDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 2, 1);
        const startOfTwoMonthsAgo = Timestamp.fromDate(new Date(twoMonthsAgoDate.getFullYear(), twoMonthsAgoDate.getMonth(), 1));
        const endOfTwoMonthsAgo = Timestamp.fromDate(new Date(twoMonthsAgoDate.getFullYear(), twoMonthsAgoDate.getMonth() + 1, 0, 23, 59, 59));
        const twoMonthsAgoStr = formatMonthStr(twoMonthsAgoDate);

        const qTwoMonthsAgoLeads = query(leadsCollectionRef, where('createdAt', '>=', startOfTwoMonthsAgo), where('createdAt', '<=', endOfTwoMonthsAgo));
        const twoMonthsAgoLeadsSnap = await getDocs(qTwoMonthsAgoLeads);
        const nuevosLeadsDosAtrás = twoMonthsAgoLeadsSnap.size;

        // Calcular leads para hace 3 meses
        const threeMonthsAgoDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 3, 1);
        const startOfThreeMonthsAgo = Timestamp.fromDate(new Date(threeMonthsAgoDate.getFullYear(), threeMonthsAgoDate.getMonth(), 1));
        const endOfThreeMonthsAgo = Timestamp.fromDate(new Date(threeMonthsAgoDate.getFullYear(), threeMonthsAgoDate.getMonth() + 1, 0, 23, 59, 59));
        const threeMonthsAgoStr = formatMonthStr(threeMonthsAgoDate);

        const qThreeMonthsAgoLeads = query(leadsCollectionRef, where('createdAt', '>=', startOfThreeMonthsAgo), where('createdAt', '<=', endOfThreeMonthsAgo));
        const threeMonthsAgoLeadsSnap = await getDocs(qThreeMonthsAgoLeads);
        const nuevosLeadsTresAtrás = threeMonthsAgoLeadsSnap.size;

        // Crear array histórico con nombres de meses (solo los 3 meses anteriores)
        // IMPORTANTE: usar mediodía hora local para evitar el bug de timezone
        const getMonthName = (dateStr) => {
          const [year, month] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, 15); // día 15 al mediodía evita problemas de zona horaria
          return date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
        };

        const nuevosLeadsHistorico = [
          { mes: getMonthName(prevMonthStr), value: nuevosLeadsMesAnterior },
          { mes: getMonthName(twoMonthsAgoStr), value: nuevosLeadsDosAtrás },
          { mes: getMonthName(threeMonthsAgoStr), value: nuevosLeadsTresAtrás }
        ];

        const qPrevCompleted = query(leadsCollectionRef, where('estado', '==', 'Completado'), where('infoProceso.mesProduccion', '==', prevMonthStr));
        const prevCompletedSnap = await getDocs(qPrevCompleted);
        let totalCompletadoAnterior = 0;
        prevCompletedSnap.forEach(doc => {
            totalCompletadoAnterior += getSaleValue(doc.data());
        });

        setMetrics(prev => ({
            ...prev,
            objetivoMensualAnterior: objetivoPrev,
            nuevosLeadsMesAnterior,
            nuevosLeadsHistorico,
            totalCompletadoAnterior
        }));

      } catch (error) {
        console.error("Error al cargar datos iniciales o del mes pasado:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialAndPastData();

    // Cleanup
    return () => {
      unsubObjective();
      unsubAllLeads();
      unsubCompleted();
      unsubFunnel();
    };
    
  }, [userId, selectedDate]);

  return { metrics, loading };
}

