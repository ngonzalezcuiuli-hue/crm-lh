import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc
} from "firebase/firestore";

/**
 * NUEVA FUNCIÓN: Obtiene leads filtrando por un estado específico.
 * @param {string} userId - ID del usuario.
 * @param {string} status - El estado por el cual filtrar ('Completado', 'Onboarding', etc.).
 * @returns {Promise<Array>} - Una promesa que resuelve a un array de leads.
 */
export async function getLeadsByStatus(userId, status) {
  if (!userId || !status) return [];
  const leadsColRef = collection(db, `users/${userId}/leads`);
  const q = query(leadsColRef, where("estado", "==", status));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error al obtener los leads con estado ${status}:`, error);
    return [];
  }
}

// Tu función original, ahora reutiliza la nueva función.
export async function getLeads(userId) {
  return getLeadsByStatus(userId, "Funnel");
}

export async function createLead(userId, leadData) {
  const ref = doc(collection(db, `users/${userId}/leads`));
  
  const newLeadPayload = {
    ...leadData,
    estado: "Funnel",
    createdAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
    cotizacionMiembros: [
        { id: Date.now(), ageGroup: "Hasta 35 años", discount: "0%" }
    ],
    etapaHistorial: [
      {
        etapa: leadData.etapa,
        fechaEntrada: new Date(),
        fechaSalida: null
      }
    ],
    infoProceso: {
        idOnboarding: "",
        precarga: "Pendiente",
        mesProduccion: "",
        numeroPrecarga: ""
    },
    // Nivel de interés del prospecto en seguimiento (0 = apagado, 1 = medio, 2 = alto)
    interestLevel: 0,
    nivelInteres: 0
  };

  await setDoc(ref, newLeadPayload);
}

export async function updateLead(userId, leadId, data) {
    const ref = doc(db, `users/${userId}/leads/${leadId}`);
    await updateDoc(ref, { ...data, lastUpdatedAt: serverTimestamp() });
}

export async function startOnboarding({ userId, leadId }) {
    const ref = doc(db, `users/${userId}/leads/${leadId}`);
    await updateDoc(ref, { 
        estado: "Onboarding",
        lastUpdatedAt: serverTimestamp() 
    });
}

export async function moveLeadToStage({ userId, leadId, newEtapa }) {
    const leadRef = doc(db, `users/${userId}/leads/${leadId}`);
    try {
        const leadSnap = await getDoc(leadRef);
        if (!leadSnap.exists()) throw new Error("El lead no existe.");
        const leadData = leadSnap.data();
        const oldHistorial = leadData.etapaHistorial || [];
        
        const ultimoIndice = oldHistorial.length - 1;
        if (ultimoIndice >= 0) {
            oldHistorial[ultimoIndice].fechaSalida = new Date();
        }
        
        const nuevoHistorial = [
            ...oldHistorial,
            {
                etapa: newEtapa,
                fechaEntrada: new Date(),
                fechaSalida: null
            }
        ];

        await updateDoc(leadRef, {
            etapa: newEtapa,
            etapaHistorial: nuevoHistorial,
            lastUpdatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error al mover el lead:", error);
    }
}

export async function markLeadLost({ userId, leadId, reason }) {
    const ref = doc(db, `users/${userId}/leads/${leadId}`);
    await updateDoc(ref, { 
        estado: "Perdido", 
        razonPerdida: reason, 
        lastUpdatedAt: serverTimestamp() 
    });
}

export async function markAsCompleted({ userId, leadId, leadData }) {
    const ref = doc(db, `users/${userId}/leads/${leadId}`);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const updatedProcesoInfo = {
        ...leadData.infoProceso,
        mesProduccion: leadData.infoProceso.mesProduccion || currentMonth
    };

    await updateDoc(ref, { 
        estado: "Completado", 
        infoProceso: updatedProcesoInfo,
        lastUpdatedAt: serverTimestamp() 
    });
}

export async function deleteLead(userId, leadId) {
    const ref = doc(db, `users/${userId}/leads/${leadId}`);
    await deleteDoc(ref);
}
