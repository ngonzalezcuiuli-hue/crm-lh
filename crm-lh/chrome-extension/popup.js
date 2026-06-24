// Popup Script para la extensión de Chrome

const statusEl = document.getElementById('status');
const pendingMessagesEl = document.getElementById('pendingMessages');
const pendingCountEl = document.getElementById('pendingCount');
const openCrmBtn = document.getElementById('openCrm');
const checkNowBtn = document.getElementById('checkNow');
const toggleBtn = document.getElementById('toggleNotifications');
const checkText = document.getElementById('checkText');

// Cargar estado al abrir popup
document.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  loadPendingMessages();
});

/**
 * Carga el estado de autenticación
 */
function loadStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response.isAuthenticated) {
      statusEl.className = 'status authenticated';
      statusEl.innerHTML = `
        <span class="status-badge active">✓ Conectado</span>
        <span>Usuario: ${response.userId}</span>
      `;
      openCrmBtn.disabled = false;
      checkNowBtn.disabled = false;
    } else {
      statusEl.className = 'status not-authenticated';
      statusEl.innerHTML = `
        <span class="status-badge inactive">Desconectado</span>
        <span>Abre el CRM para conectar</span>
      `;
      openCrmBtn.disabled = false;
      checkNowBtn.disabled = true;
    }

    // Cargar estado del toggle
    toggleBtn.classList.toggle('active', response.enabled !== false);
  });
}

/**
 * Carga los mensajes pendientes
 */
function loadPendingMessages() {
  chrome.storage.local.get(['pendingLeads'], (data) => {
    const count = data.pendingLeads?.length || 0;
    if (count > 0) {
      pendingCountEl.textContent = count;
      pendingMessagesEl.classList.add('show');
    } else {
      pendingMessagesEl.classList.remove('show');
    }
  });
}

/**
 * Abrir CRM
 */
openCrmBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173/' });
});

/**
 * Verificar mensajes ahora
 */
checkNowBtn.addEventListener('click', () => {
  const spinner = checkNowBtn.querySelector('.spinner');
  spinner.style.display = 'inline-block';
  checkText.textContent = 'Verificando...';
  checkNowBtn.disabled = true;

  chrome.runtime.sendMessage({ action: 'checkNow' }, () => {
    setTimeout(() => {
      loadStatus();
      loadPendingMessages();
      spinner.style.display = 'none';
      checkText.textContent = 'Verificar ahora';
      checkNowBtn.disabled = false;
    }, 1000);
  });
});

/**
 * Toggle de notificaciones
 */
toggleBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'toggleNotifications' }, (response) => {
    toggleBtn.classList.toggle('active', response.enabled);
    loadStatus();
  });
});

// Refrescar estado cada 10 segundos que el popup esté abierto
setInterval(() => {
  loadStatus();
  loadPendingMessages();
}, 10000);
