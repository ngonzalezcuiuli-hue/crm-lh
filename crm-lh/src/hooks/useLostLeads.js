import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import useAuth from './useAuth.jsx';

export const useLostLeads = () => {
  const { user } = useAuth();
  const [lostLeads, setLostLeads] = useState([]);
  const [rawLostLeads, setRawLostLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const leadsRef = collection(db, `users/${user.uid}/leads`);

    // --- CORRECCIÓN ---
    // Quitamos el filtro de fecha para traer TODOS los leads perdidos.
    const q = query(
      leadsRef,
      where('estado', '==', 'Perdido'),
      orderBy('lastUpdatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const formattedLeadsData = [];
      const rawData = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        rawData.push({ id: doc.id, ...data });

        formattedLeadsData.push({
          id: doc.id,
          nombre: data.nombre || 'Sin nombre',
          fechaIngreso: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('es-AR') : 'N/A',
          razonPerdida: data.razonPerdida || 'No especificado',
          celular: data.celular || 'Sin celular',
        });
      });

      setLostLeads(formattedLeadsData);
      setRawLostLeads(rawData);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener los leads perdidos: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { lostLeads, rawLostLeads, loading };
};
