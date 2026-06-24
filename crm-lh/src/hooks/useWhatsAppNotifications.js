import { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './useAuth';
import { notificationService } from '../services/notificationService';

/**
 * Hook que monitorea leads con WhatsApp listos para enviar
 * y muestra notificaciones cuando hay cambios
 */
export function useWhatsAppNotifications() {
  const { user } = useAuth();
  const [readyLeads, setReadyLeads] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const lastNotificationCountRef = useRef(0);
  const unsubscribeRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // Inicializar permisos de notificación
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initNotifications = async () => {
      try {
        const hasPermission = notificationService.permission === 'granted';
        if (!hasPermission) {
          console.log('📬 Solicitando permiso para notificaciones...');
          await notificationService.requestPermission();
        }
      } catch (err) {
        console.log('ℹ️ No se pudo solicitar notificaciones:', err);
      }
    };

    initNotifications();
  }, []);

  // Monitorear leads en tiempo real
  useEffect(() => {
    if (!user?.uid || !db) {
      return;
    }

    let mounted = true;

    const setupListener = async () => {
      try {
        const leadsRef = collection(db, 'users', user.uid, 'leads');
        const q = query(leadsRef, where('whatsappProximo.readyToSend', '==', true));

        console.log('🔍 Iniciando monitoreo de leads...');
        setIsListening(true);
        setError(null);

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!mounted) return;

            const leads = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            const count = leads.length;
            setReadyLeads(leads);
            console.log(`📊 Leads listos: ${count}`);

            if (count > 0 && count !== lastNotificationCountRef.current) {
              notificationService.notifyWhatsAppReady(count, leads);
              lastNotificationCountRef.current = count;
            }

            if (count === 0) {
              lastNotificationCountRef.current = 0;
            }
          },
          (err) => {
            if (!mounted) return;
            console.error('❌ Error en listener:', err);
            setError(err.message);
          }
        );

        unsubscribeRef.current = unsubscribe;
      } catch (err) {
        if (!mounted) return;
        console.error('❌ Error setupListener:', err);
        setError(err.message);
        setIsListening(false);
      }
    };

    setupListener();

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        setIsListening(false);
        console.log('🛑 Listener desactivado');
      }
    };
  }, [user?.uid]);

  return {
    readyLeads,
    count: readyLeads.length,
    isListening,
    permissionGranted: notificationService.permission === 'granted',
    error
  };
}
