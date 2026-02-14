// src/hooks/useCompletedLeads.js
import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

export default function useCompletedLeads(userId) {
  const [completedLeads, setCompletedLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    const leadsRef = collection(db, `users/${userId}/leads`);
    const q = query(
      leadsRef, 
      where("estado", "==", "Completado"),
      orderBy("lastUpdatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCompletedLeads(leads);
      setLoading(false);
    }, (error) => {
        console.error("Error al escuchar los leads completados:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { completedLeads, loading };
}