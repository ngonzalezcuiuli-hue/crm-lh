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
    totalCompletado: 0,
    nuevosLeadsMes: 0,
    tasaConversion: 0,
    valorPromedioVenta: 0,
    totalCompletadoAnterior: 0,
    nuevosLeadsMesAnterior: 0,
    ventasPorPlan: [],
    leadsPorOrigen: [],
    forecastPorEtapa: [], 
    onboardingForecast: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !selectedDate) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // --- RANGOS DE FECHAS ---
    const startOfMonth = Timestamp.fromDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    const endOfMonth = Timestamp.fromDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59));
    const currentMonthStr = selectedDate.toISOString().slice(0, 7);

    const prevMonthDate = new Date(selectedDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const startOfPrevMonth = Timestamp.fromDate(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1));
    const endOfPrevMonth = Timestamp.fromDate(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0, 23, 59, 59));
    const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);
    
    const leadsCollectionRef = collection(db, `users/${userId}/leads`);

    // --- Listener para leads del mes actual ---
    // CORREGIDO: Se cambió 'fechaDeCreacion' a 'createdAt' para que coincida con la base de datos.
    const qAllLeadsMonth = query(leadsCollectionRef, where('createdAt', '>=', startOfMonth), where('createdAt', '<=', endOfMonth));
    const unsubAllLeads = onSnapshot(qAllLeadsMonth, (snapshot) => {
        const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalNewLeads = leads.length;

        const sources = {};
        leads.forEach(lead => {
            const origen = lead.origenDato || 'Desconocido';
            sources[origen] = (sources[origen] || 0) + 1;
        });
        const leadsPorOrigen = Object.keys(sources).map(name => ({ name, value: sources[name] }));

        setMetrics(prev => ({ ...prev, nuevosLeadsMes: totalNewLeads, leadsPorOrigen }));
    });

    // --- Listener para leads COMPLETADOS en el mes de producción actual ---
    const qCompleted = query(leadsCollectionRef, where('estado', '==', 'Completado'), where('infoProceso.mesProduccion', '==', currentMonthStr));
    const unsubCompleted = onSnapshot(qCompleted, (snapshot) => {
      let total = 0;
      const planSales = {};
      const numVentas = snapshot.size;

      snapshot.docs.forEach(doc => {
        const lead = { id: doc.id, ...doc.data() };
        const saleValue = getSaleValue(lead);
        total += saleValue;
        
        const planName = lead.infoCotizacion?.plan || 'Sin Plan';
        if (!planSales[planName]) planSales[planName] = { value: 0 };
        planSales[planName].value += saleValue;
      });
      
      const ventasPorPlan = Object.keys(planSales).map(name => ({ name, value: planSales[name].value }));
      const valorPromedio = numVentas > 0 ? total / numVentas : 0;

      setMetrics(prev => ({ 
          ...prev, 
          totalCompletado: total, 
          ventasPorPlan,
          valorPromedioVenta: valorPromedio,
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

    // --- Función asíncrona para cargar datos ---
    const loadInitialAndPastData = async () => {
      try {
        const metaDocRef = doc(db, 'metas', currentMonthStr);
        const metaDocSnap = await getDoc(metaDocRef);
        const objetivo = metaDocSnap.exists() && typeof metaDocSnap.data().objetivo === 'number' ? metaDocSnap.data().objetivo : 0;
        
        // CORREGIDO: Se cambió 'fechaDeCreacion' a 'createdAt' aquí también.
        const qPrevLeads = query(leadsCollectionRef, where('createdAt', '>=', startOfPrevMonth), where('createdAt', '<=', endOfPrevMonth));
        const prevLeadsSnap = await getDocs(qPrevLeads);
        const nuevosLeadsMesAnterior = prevLeadsSnap.size;

        const qPrevCompleted = query(leadsCollectionRef, where('estado', '==', 'Completado'), where('infoProceso.mesProduccion', '==', prevMonthStr));
        const prevCompletedSnap = await getDocs(qPrevCompleted);
        let totalCompletadoAnterior = 0;
        prevCompletedSnap.forEach(doc => {
            totalCompletadoAnterior += getSaleValue(doc.data());
        });
        
        setMetrics(prev => ({
            ...prev,
            objetivoMensual: objetivo,
            nuevosLeadsMesAnterior,
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
      unsubAllLeads();
      unsubCompleted();
      unsubFunnel();
    };
    
  }, [userId, selectedDate]);

  return { metrics, loading };
}

