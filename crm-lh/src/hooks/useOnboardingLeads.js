// src/hooks/useOnboardingLeads.js
import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function useOnboardingLeads(userId) {
  const [onboardingLeads, setOnboardingLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    // La consulta ahora busca leads con estado "Onboarding"
    const leadsRef = collection(db, `users/${userId}/leads`);
    const q = query(leadsRef, where("estado", "==", "Onboarding"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOnboardingLeads(leads);
      setLoading(false);
    }, (error) => {
        console.error("Error al escuchar los leads en onboarding:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { onboardingLeads, loading };
}