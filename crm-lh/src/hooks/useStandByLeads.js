import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

export default function useStandByLeads(userId) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, `users/${userId}/leads`),
      (snapshot) => {
        try {
          const allLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Filtrar leads con recordatorio activo y en el futuro
          const standByLeads = allLeads.filter(lead => {
            if (!lead.recordatorio?.enabled) return false;

            try {
              const fechaProximo = lead.recordatorio.fechaProximoContacto.toDate
                ? lead.recordatorio.fechaProximoContacto.toDate()
                : new Date(lead.recordatorio.fechaProximoContacto);

              const now = new Date();
              now.setHours(0, 0, 0, 0);

              return fechaProximo >= now;
            } catch (e) {
              return false;
            }
          });

          // Ordenar por fecha de próximo contacto (más próxima primero)
          standByLeads.sort((a, b) => {
            try {
              const fechaA = a.recordatorio.fechaProximoContacto.toDate
                ? a.recordatorio.fechaProximoContacto.toDate()
                : new Date(a.recordatorio.fechaProximoContacto);

              const fechaB = b.recordatorio.fechaProximoContacto.toDate
                ? b.recordatorio.fechaProximoContacto.toDate()
                : new Date(b.recordatorio.fechaProximoContacto);

              return fechaA - fechaB;
            } catch (e) {
              return 0;
            }
          });

          setLeads(standByLeads);
        } catch (error) {
          console.error('Error procesando leads Stand By:', error);
          setLeads([]);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error en listener Stand By:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { leads, loading };
}
