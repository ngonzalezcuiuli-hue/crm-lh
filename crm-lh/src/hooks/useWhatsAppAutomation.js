import { useState, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  generateWhatsAppUrl,
  getDefaultMessageByStage,
  recordBulkWhatsAppSent,
  openBulkWhatsAppUrls
} from '../services/whatsappAutomationService';

export default function useWhatsAppAutomation(userId) {
  const [loading, setLoading] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState([]);

  /**
   * Obtiene el número de WhatsApp del usuario desde su perfil
   * Lee de users/{uid}.phoneNumber (campo unificado con ProfileModal)
   */
  const getUserWhatsAppNumber = useCallback(async () => {
    if (!userId) return null;
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      // Soporta tanto el campo nuevo (phoneNumber) como el legacy (profile.whatsappNumber)
      return userSnap.data()?.phoneNumber || userSnap.data()?.profile?.whatsappNumber || null;
    } catch (error) {
      console.error('Error obteniendo número WhatsApp:', error);
      return null;
    }
  }, [userId]);

  /**
   * Obtiene el dispositivo configurado (web o mobile)
   */
  const getUserWhatsAppDevice = useCallback(async () => {
    if (!userId) return 'web';
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      return userSnap.data()?.profile?.whatsappDevice || 'web';
    } catch (error) {
      console.error('Error obteniendo dispositivo WhatsApp:', error);
      return 'web';
    }
  }, [userId]);

  /**
   * Guarda el número de WhatsApp en el perfil del usuario
   * Usa el campo unificado phoneNumber
   */
  const saveUserWhatsAppNumber = useCallback(async (phoneNumber, device = 'web') => {
    if (!userId) return false;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        phoneNumber: phoneNumber,
        'profile.whatsappDevice': device
      });
      return true;
    } catch (error) {
      console.error('Error guardando número WhatsApp:', error);
      return false;
    }
  }, [userId]);

  /**
   * Envía WhatsApp a múltiples leads en una etapa
   * Detecta automáticamente si estás en celular o computadora
   */
  const sendBulkWhatsApp = useCallback(async (leads, stage, customMessage = null, userName = 'tu asesor') => {
    if (!leads || leads.length === 0) {
      console.error('No hay leads para enviar');
      return false;
    }

    // Filtrar leads sin número de celular
    const leadsConCelular = leads.filter(l => l.celular);
    if (leadsConCelular.length === 0) {
      alert('Ningún lead tiene número de celular cargado');
      return false;
    }

    setLoading(true);
    try {
      // Detectar dispositivo automáticamente
      const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
      const currentDevice = isMobile ? 'mobile' : 'web';

      // Generar URL personalizada por lead (con el nombre de cada uno)
      const urls = leadsConCelular.map(lead => {
        const message = customMessage
          ? customMessage.replace(/{nombre}/gi, lead.nombre || '')
          : getDefaultMessageByStage(lead, stage, userName);
        return generateWhatsAppUrl(lead.celular, message, currentDevice);
      });

      // Abrir URLs en pestañas del navegador
      openBulkWhatsAppUrls(urls);

      // Registrar los envíos en Firestore
      await recordBulkWhatsAppSent(userId, leadsConCelular.map(l => l.id), stage);

      return true;
    } catch (error) {
      console.error('Error enviando WhatsApp en lote:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Programa un envío de WhatsApp para una hora futura
   */
  const scheduleWhatsAppBulk = useCallback(async (leads, stage, dateTime, customMessage = null) => {
    if (!leads || leads.length === 0) {
      console.error('No hay leads para programar');
      return false;
    }

    try {
      // Por cada lead, guardar la programación
      const promises = leads.map(lead => {
        const leadRef = doc(db, 'users', userId, 'leads', lead.id);
        const message = customMessage || getDefaultMessageByStage(lead, stage, 'tu asesor');

        return updateDoc(leadRef, {
          whatsappProximo: {
            etapa: stage,
            programadoPara: new Date(dateTime),
            personalizado: message
          },
          lastUpdatedAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error programando WhatsApp:', error);
      return false;
    }
  }, [userId]);

  /**
   * Obtiene los mensajes programados para envío
   */
  const getScheduledMessages = useCallback(async () => {
    if (!userId) return [];
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      // En una implementación real, buscaríamos leads con whatsappProximo
      // Por ahora retornamos un array vacío
      return [];
    } catch (error) {
      console.error('Error obteniendo mensajes programados:', error);
      return [];
    }
  }, [userId]);

  return {
    loading,
    scheduledMessages,
    getUserWhatsAppNumber,
    getUserWhatsAppDevice,
    saveUserWhatsAppNumber,
    sendBulkWhatsApp,
    scheduleWhatsAppBulk,
    getScheduledMessages
  };
}
