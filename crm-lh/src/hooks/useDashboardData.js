// src/hooks/useDashboardData.js
import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';

/**
 * Gets the pre-calculated forecast value directly from the lead object.
 * This is the single source of truth for all monetary calculations in the dashboard.
 * @param {object} lead - The lead object from Firestore.
 * @returns {number} The value from the 'valorForecast' field, or 0 if it doesn't exist.
 */
const getSaleValue = (lead) => {
  const valor = lead.infoCotizacion?.valorForecast;
  if (typeof valor !== 'number') {
    console.warn(`[Debug] Lead con ID: ${lead.id} tiene un valorForecast no numérico o inexistente.`, lead.infoCotizacion);
    return 0;
  }
  return valor;
};

/**
 * Capitalizes the first letter of a string.
 * @param {string} s The input string.
 * @returns {string} The capitalized string.
 */
const capitalize = (s) => {
    if (typeof s !== 'string' || !s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function useDashboardData(userId) {
  const [data, setData] = useState({
    objetivoMensual: 0,
    totalCompletado: 0,
    totalIntegrantes: 0,
    ventasPorPlan: [],
    forecastData: [],
    nuevosLeadsMes: 0,
    leadsPorOrigen: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    console.log("[Dashboard] Hook iniciado para el usuario:", userId);
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7);
    const startOfMonth = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    const getObjetivo = async () => {
      const docRef = doc(db, 'metas', currentMonthStr);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data().objetivo : 0;
    };

    const leadsCollectionRef = collection(db, `users/${userId}/leads`);

    // --- FORECAST DATA LISTENER ---
    const qFunnel = query(leadsCollectionRef, where('estado', 'in', ['Funnel', 'Onboarding', 'Proceso']));
    const unsubFunnel = onSnapshot(qFunnel, (snapshot) => {
      console.log(`[Forecast] Se encontraron ${snapshot.size} leads en el funnel.`);
      const forecast = { 'Cotización': 0, 'Seguimiento': 0, 'Cierre': 0, 'Proceso': 0, 'Onboarding': 0 };
      snapshot.docs.forEach(doc => {
        const lead = { id: doc.id, ...doc.data() };
        const saleValue = getSaleValue(lead);
        console.log(`[Forecast] Procesando Lead ID: ${lead.id}, Etapa: ${lead.etapa}, Valor: ${saleValue}`);
        const stage = capitalize(lead.etapa);
        const state = capitalize(lead.estado);
        if (forecast.hasOwnProperty(stage)) forecast[stage] += saleValue;
        else if (forecast.hasOwnProperty(state)) forecast[state] += saleValue;
      });
      const forecastData = Object.keys(forecast).map(name => ({ name, forecast: forecast[name] })).filter(item => item.forecast > 0);
      console.log("[Forecast] Datos finales:", forecastData);
      setData(prev => ({ ...prev, forecastData }));
    });

    // --- COMPLETED LEADS LISTENER ---
    const qCompleted = query(leadsCollectionRef, where('estado', '==', 'Completado'), where('infoProceso.mesProduccion', '==', currentMonthStr));
    const unsubCompleted = onSnapshot(qCompleted, (snapshot) => {
      console.log(`[Completados] Se encontraron ${snapshot.size} leads completados este mes.`);
      let total = 0, integrantes = 0;
      const planSales = {};
      snapshot.docs.forEach(doc => {
        const lead = { id: doc.id, ...doc.data() };
        const saleValue = getSaleValue(lead);
        console.log(`[Completados] Procesando Lead ID: ${lead.id}, Valor: ${saleValue}`);
        total += saleValue;
        integrantes += lead.infoAdicional?.cantidadIntegrantes || 0;
        const planName = lead.infoCotizacion?.plan || 'Sin Plan';
        planSales[planName] = (planSales[planName] || 0) + saleValue;
      });
      const ventasPorPlan = Object.keys(planSales).map(name => ({ name, value: planSales[name] }));
      console.log(`[Completados] Total del mes: ${total}`);
      setData(prev => ({ ...prev, totalCompletado: total, totalIntegrantes: integrantes, ventasPorPlan }));
    });

    // --- NEW LEADS LISTENER ---
    const qNewLeads = query(leadsCollectionRef, where('fechaDeCreacion', '>=', startOfMonth), where('fechaDeCreacion', '<=', endOfMonth));
    const unsubNewLeads = onSnapshot(qNewLeads, (snapshot) => {
        const totalNewLeads = snapshot.size;
        const sources = {};
        snapshot.docs.forEach(doc => {
            const origen = doc.data().infoLead?.origen || 'Desconocido';
            sources[origen] = (sources[origen] || 0) + 1;
        });
        const leadsPorOrigen = Object.keys(sources).map(name => ({ name, value: sources[name] }));
        setData(prev => ({ ...prev, nuevosLeadsMes: totalNewLeads, leadsPorOrigen }));
    });

    const loadAllData = async () => {
      setLoading(true);
      try {
        const objetivo = await getObjetivo();
        setData(prev => ({ ...prev, objetivoMensual: objetivo }));
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();

    return () => {
      unsubFunnel();
      unsubCompleted();
      unsubNewLeads();
    };
  }, [userId]);

  return { data, loading };
}
