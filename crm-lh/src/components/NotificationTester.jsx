import React, { useState, useEffect } from 'react';

/**
 * Componente de prueba para las notificaciones
 * Prueba directa sin dependencias externas
 */
export function NotificationTester() {
  const [status, setStatus] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setStatus(Notification.permission);
      console.log('📬 Notificaciones disponibles. Permiso:', Notification.permission);
    } else {
      console.log('❌ Notificaciones no soportadas');
    }
  }, []);

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setStatus(permission);
      console.log('📬 Permiso solicitado:', permission);
    }
  };

  const handleTestNotification = () => {
    console.log('⏰ Iniciando test de notificación. Permiso:', status);

    if (!('Notification' in window)) {
      alert('Las notificaciones no son soportadas en este navegador');
      return;
    }

    if (status !== 'granted') {
      alert('Necesitas habilitar las notificaciones primero');
      return;
    }

    try {
      console.log('📬 Creando notificación...');

      const notification = new Notification('⏰ Mensajes de WhatsApp Listos', {
        body: 'Tienes 3 mensajes programados listos para enviar\nMaría Eugenia Russo, Yasmín García, Agustín López',
        icon: '/lighthouse-icon.png',
        badge: '/lighthouse-badge.png',
        tag: 'test-whatsapp',
        requireInteraction: true
      });

      console.log('✅ Notificación creada correctamente');

      notification.onclick = () => {
        console.log('📲 Usuario hizo clic en notificación');
        window.focus();
        notification.close();
      };

      notification.onclose = () => {
        console.log('🔔 Notificación cerrada');
      };

      notification.onerror = (error) => {
        console.error('❌ Error en notificación:', error);
      };

    } catch (error) {
      console.error('❌ Error creando notificación:', error);
      alert('Error: ' + error.message);
    }
  };

  const getStatusColor = () => {
    if (status === 'granted') return 'text-green-500';
    if (status === 'denied') return 'text-red-500';
    return 'text-yellow-500';
  };

  const getStatusText = () => {
    if (status === 'granted') return '✅ Habilitadas';
    if (status === 'denied') return '❌ Rechazadas';
    return '⚠️ Sin permiso';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="text-white font-semibold mb-2">🔔 Prueba de Notificaciones</h3>

      <div className="mb-3">
        <p className="text-sm text-slate-300">
          Estado: <span className={`font-semibold ${getStatusColor()}`}>{getStatusText()}</span>
        </p>
      </div>

      {status !== 'granted' && (
        <button
          onClick={handleRequestPermission}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded px-3 mb-2 transition"
        >
          📬 Habilitar Notificaciones
        </button>
      )}

      <button
        onClick={handleTestNotification}
        disabled={status !== 'granted'}
        className={`w-full text-sm py-2 rounded px-3 transition font-medium ${
          status === 'granted'
            ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        ⏰ Probar Notificación
      </button>

      <p className="text-xs text-slate-400 mt-3">
        Haz clic en "Probar Notificación" para ver una notificación del navegador.
      </p>
    </div>
  );
}
