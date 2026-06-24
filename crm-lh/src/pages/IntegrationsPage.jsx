import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../hooks/useAuth.jsx';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Spinner from '../components/Spinner';
import WhatsAppNumberModal from '../components/WhatsAppNumberModal';

export default function IntegrationsPage() {
  const { user } = useAuthContext();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists() && docSnap.data().makeWebhookUrl) {
          setWebhookUrl(docSnap.data().makeWebhookUrl);
        }
        setLoading(false);
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { makeWebhookUrl: webhookUrl }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error al guardar la URL del webhook:", error);
      alert("No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Sección WhatsApp */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">WhatsApp</h1>
          <p className="text-gray-600 mb-6">Configura tu número de WhatsApp para enviar mensajes automáticos.</p>
          <button
            onClick={() => setShowWhatsAppModal(true)}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            📱 Configurar Número WhatsApp
          </button>
          <p className="text-xs text-gray-500 mt-3">
            Guarda tu número para usar la automatización de mensajes en el CRM.
          </p>
        </div>

        {/* Sección Make.com */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-lg font-semibold text-gray-700">Google Contacts via Make.com</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">Pega la URL de tu webhook de Make.com para guardar leads directamente en tus contactos de Google.</p>
          <form onSubmit={handleSave}>
            <div>
              <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700">URL del Webhook</label>
              <input id="webhook-url" type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="https://hook.us2.make.com/..." required />
            </div>
            <div className="mt-4 flex items-center">
              <button type="submit" disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400">
                {saving ? 'Guardando...' : 'Guardar Conexión'}
              </button>
              {saved && <span className="ml-4 text-sm font-semibold text-green-600">¡Guardado con éxito!</span>}
            </div>
          </form>
        </div>
      </div>

      {/* Modal WhatsApp */}
      <WhatsAppNumberModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
      />
    </div>
  );
}
