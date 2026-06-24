/**
 * Bridge para conectar el CRM con la extensión de Chrome
 * Envía el authToken automáticamente cuando el usuario inicia sesión
 */

export function initializeExtensionBridge() {
  // Verificar si hay extensión de Chrome disponible
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.log('ℹ️ Extensión Chrome no detectada');
    return;
  }

  // Esperar a que Firebase cargue la autenticación
  const checkAuth = () => {
    try {
      // Buscar dinámicamente la clave firebase:authUser
      const firebaseKeys = Object.keys(localStorage)
        .filter(key => key.includes('firebase:authUser'));

      if (firebaseKeys.length === 0) {
        console.log('ℹ️ Esperando autenticación...');
        return;
      }

      const authKey = firebaseKeys[0];
      const authData = localStorage.getItem(authKey);

      if (!authData) {
        return;
      }

      const auth = JSON.parse(authData);
      const token = auth?.stsTokenManager?.accessToken;
      const uid = auth?.localId;

      if (token && uid) {
        sendTokenToExtension(token, uid);
      }
    } catch (error) {
      console.error('❌ Error leyendo autenticación:', error);
    }
  };

  // Escuchar cambios en localStorage
  window.addEventListener('storage', (event) => {
    if (event.key && event.key.includes('firebase:authUser')) {
      console.log('🔄 Auth cambió, sincronizando con extensión...');
      checkAuth();
    }
  });

  // Verificar cada 2 segundos si hay token
  const interval = setInterval(() => {
    checkAuth();
  }, 2000);

  // Limpiar después de 60 segundos
  setTimeout(() => {
    clearInterval(interval);
    console.log('✅ Bridge de extensión inicializado');
  }, 60000);

  checkAuth();
}

/**
 * Envía el token y userId a la extensión de Chrome
 */
export function sendTokenToExtension(token, userId) {
  if (!token || !userId) {
    console.warn('⚠️ Token o userId inválidos');
    return;
  }

  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.log('ℹ️ Extensión Chrome no disponible');
    return;
  }

  try {
    chrome.runtime.sendMessage(
      {
        action: 'setAuth',
        token: token,
        userId: userId
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log('ℹ️ Content script mediará la autenticación');
          return;
        }
        if (response && response.success) {
          console.log('✅ Conectado con extensión Chrome');
          console.log('📱 Usuario:', userId);
        }
      }
    );
  } catch (error) {
    console.log('ℹ️ Extensión no disponible:', error.message);
  }
}

/**
 * Hook para React - llamar esto después de autenticarse
 */
export function connectToExtension(user, token) {
  if (user && token) {
    console.log('🔐 Usuario autenticado, conectando con extensión...');
    sendTokenToExtension(token, user.uid);
  }
}
