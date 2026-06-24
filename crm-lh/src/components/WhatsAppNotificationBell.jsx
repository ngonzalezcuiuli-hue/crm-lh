import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import useAuth from '../hooks/useAuth';
import useWhatsAppAutomation from '../hooks/useWhatsAppAutomation';
import WhatsAppScheduledModal from './WhatsAppScheduledModal';

export default function WhatsAppNotificationBell() {
  const { user } = useAuth() || {};
  const { sendBulkWhatsApp } = useWhatsAppAutomation(user?.uid);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingLeads, setPendingLeads] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Verificar cada 30 segundos si hay mensajes listos para enviar
  useEffect(() => {
    if (!user?.uid) return;

    const checkScheduledMessages = async () => {
      try {
        const leadsRef = collection(db, 'users', user.uid, 'leads');
        const q = query(leadsRef, where('whatsappProximo.readyToSend', '==', true));
        const snapshot = await getDocs(q);

        const leads = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPendingCount(leads.length);
        setPendingLeads(leads);
      } catch (error) {
        console.error('Error verificando mensajes programados:', error);
      }
    };

    checkScheduledMessages();
    const interval = setInterval(checkScheduledMessages, 30000); // Cada 30 segundos

    return () => clearInterval(interval);
  }, [user?.uid]);

  if (pendingCount === 0) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative p-2 text-white hover:bg-slate-700/50 rounded-lg transition-colors"
        title={`${pendingCount} mensajes de WhatsApp listos para enviar`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge con contador */}
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
          {pendingCount}
        </span>
      </button>

      {/* Modal para mostrar y enviar mensajes programados */}
      <WhatsAppScheduledModal
        open={showModal}
        onClose={() => setShowModal(false)}
        pendingLeads={pendingLeads}
        onSent={() => {
          setPendingCount(0);
          setPendingLeads([]);
          setShowModal(false);
        }}
      />
    </>
  );
}
