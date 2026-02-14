import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function useLeads(userId) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    const leadsRef = collection(db, `users/${userId}/leads`);
    const q = query(leadsRef, where("estado", "==", "Funnel"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLeads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLeads(fetchedLeads);
      setLoading(false);
    }, (error) => {
        console.error("Error al escuchar los leads del funnel:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { leads, loading };
}