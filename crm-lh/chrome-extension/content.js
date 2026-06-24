/**
 * Content Script - Se ejecuta dentro de la página del CRM
 * Accede a localStorage directamente y comunica el token al background script
 */

console.log('✅ Content script cargado para WhatsApp CRM');

// Función para leer el token de Firebase y enviar a la extensión
function checkAndSendAuth() {
  try {
    // Buscar dinámicamente la clave firebase:authUser
    const firebaseKeys = Object.keys(localStorage)
      .filter(key => key.includes('firebase:authUser'));

    if (firebaseKeys.length === 0) {
      return false;
    }

    const authKey = firebaseKeys[0];
    const authData = JSON.parse(localStorage.getItem(authKey));

    if (authData && authData.stsTokenManager && authData.stsTokenManager.accessToken) {
      const token = authData.stsTokenManager.accessToken;
      const userId = authData.localId;

      if (token && userId) {
        console.log('📱 Token de Firebase detectado, enviando a extensión...');

        // Enviar al background script
        chrome.runtime.sendMessage(
          {
            action: 'setAuth',
            token: token,
            userId: userId
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log('ℹ️ Error enviando token:', chrome.runtime.lastError.message);
              return;
            }
            if (response && response.success) {
              console.log('✅ Autenticación completada');
              console.log('✅ Conectado con extensión Chrome');
            }
          }
        );

        return true;
      }
    }
  } catch (error) {
    console.error('❌ Error leyendo autenticación:', error);
  }

  return false;
}

// Verificar cada 2 segundos
let checkCount = 0;
const interval = setInterval(() => {
  if (checkAndSendAuth()) {
    clearInterval(interval);
    console.log('✅ Token enviado a extensión');
  }
  checkCount++;
  if (checkCount > 30) {
    clearInterval(interval);
    console.log('⏱️ Timeout esperando autenticación');
  }
}, 2000);

// Verificar inmediatamente
checkAndSendAuth();

// Escuchar cambios en localStorage
window.addEventListener('storage', (event) => {
  if (event.key && event.key.includes('firebase:authUser')) {
    console.log('🔄 Auth cambió en localStorage, resincronizando...');
    clearInterval(interval);
    checkAndSendAuth();
  }
});
