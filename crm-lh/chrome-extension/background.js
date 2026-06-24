// SwissMedical CRM - WhatsApp Background Service Worker
// Verifica cada minuto si hay mensajes de WhatsApp listos para enviar

const FIRESTORE_API = 'https://firestore.googleapis.com/v1/projects';
const CHECK_INTERVAL = 60; // 60 segundos

let authToken = null;
let userId = null;
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 300000; // 5 minutos entre notificaciones del mismo tipo

// Inicializar alarma para verificar cada minuto
chrome.alarms.create('checkWhatsAppMessages', { periodInMinutes: 1 });

// Escuchar alarmas
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkWhatsAppMessages') {
    checkScheduledMessages();
  }
});

// Listener para cuando la extensión se instala/actualiza
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Extensión instalada: WhatsApp CRM Notificaciones');
  chrome.storage.local.set({ notificationsEnabled: true });
});

// Listener para mensajes desde popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    chrome.storage.local.get(['authToken', 'userId', 'notificationsEnabled'], (data) => {
      sendResponse({
        isAuthenticated: !!data.authToken,
        userId: data.userId,
        enabled: data.notificationsEnabled !== false
      });
    });
    return true;
  }

  if (request.action === 'setAuth') {
    chrome.storage.local.set({
      authToken: request.token,
      userId: request.userId,
      notificationsEnabled: true
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'toggleNotifications') {
    chrome.storage.local.get(['notificationsEnabled'], (data) => {
      const newState = !data.notificationsEnabled;
      chrome.storage.local.set({ notificationsEnabled: newState });
      sendResponse({ enabled: newState });
    });
    return true;
  }

  if (request.action === 'checkNow') {
    checkScheduledMessages();
    sendResponse({ checking: true });
    return true;
  }
});

/**
 * Verifica si hay mensajes de WhatsApp listos para enviar
 */
async function checkScheduledMessages() {
  try {
    const data = await chrome.storage.local.get(['authToken', 'userId', 'notificationsEnabled']);

    if (!data.authToken || !data.userId || !data.notificationsEnabled) {
      return;
    }

    authToken = data.authToken;
    userId = data.userId;

    // Consultar Firestore para obtener leads con whatsappProximo.readyToSend = true
    const query = encodeURIComponent('state.readyToSend=true');

    // Usar realtime database o hacer una consulta más simple
    const response = await fetch(
      `${FIRESTORE_API}/swiss-medical-crm/databases/(default)/documents/users/${userId}/leads?pageSize=100`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Token expirado
        chrome.storage.local.remove(['authToken', 'userId']);
      }
      return;
    }

    const result = await response.json();
    const documents = result.documents || [];

    // Filtrar documentos con whatsappProximo.readyToSend = true
    const readyLeads = documents.filter(doc => {
      const fields = doc.fields || {};
      const whatsappProximo = fields.whatsappProximo?.mapValue?.fields || {};
      return whatsappProximo.readyToSend?.booleanValue === true;
    });

    if (readyLeads.length > 0) {
      showNotification(readyLeads.length);
      chrome.storage.local.set({ pendingLeads: readyLeads });
    }
  } catch (error) {
    console.error('❌ Error verificando mensajes:', error);
  }
}

/**
 * Muestra notificación del sistema operativo
 */
function showNotification(count) {
  // Cooldown para evitar spam de notificaciones
  const now = Date.now();
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    return;
  }
  lastNotificationTime = now;

  const notificationId = `whatsapp-ready-${Date.now()}`;

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '⏰ Mensajes de WhatsApp Listos',
    message: `Tienes ${count} mensaje${count > 1 ? 's' : ''} programado${count > 1 ? 's' : ''} listo${count > 1 ? 's' : ''} para enviar`,
    priority: 2,
    buttons: [
      { title: 'Abrir CRM' },
      { title: 'Descartar' }
    ],
    requireInteraction: true
  });

  // Escuchar clicks en la notificación
  chrome.notifications.onButtonClicked.addListener((notifId, btnIndex) => {
    if (notifId === notificationId) {
      if (btnIndex === 0) {
        // Abrir CRM
        chrome.tabs.create({ url: 'http://localhost:5173/' });
      }
      chrome.notifications.clear(notificationId);
    }
  });

  chrome.notifications.onClicked.addListener((notifId) => {
    if (notifId === notificationId) {
      chrome.tabs.create({ url: 'http://localhost:5173/' });
      chrome.notifications.clear(notificationId);
    }
  });
}
