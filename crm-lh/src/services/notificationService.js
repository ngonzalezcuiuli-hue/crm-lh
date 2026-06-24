/**
 * Servicio de notificaciones del navegador
 * Usa HTML5 Notifications API - sin extensión requerida
 */

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.updatePermission();
  }

  /**
   * Solicita permiso al usuario para mostrar notificaciones
   */
  async requestPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.permission = 'granted';
        return true;
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.permission = permission;
        return permission === 'granted';
      }
    }
    return false;
  }

  /**
   * Actualiza el estado del permiso
   */
  updatePermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Muestra una notificación simple
   */
  show(title, options = {}) {
    if (!('Notification' in window)) {
      console.log('ℹ️ Notificaciones no soportadas');
      return null;
    }

    if (this.permission !== 'granted') {
      console.log('ℹ️ Notificaciones deshabilitadas por el usuario');
      return null;
    }

    const defaultOptions = {
      icon: '/lighthouse-icon.png',
      badge: '/lighthouse-badge.png',
      tag: 'crm-notification',
      requireInteraction: true,
      ...options
    };

    const notification = new Notification(title, defaultOptions);

    // Manejar clicks en la notificación
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.onClick) {
        options.onClick();
      }
    };

    // Manejar cierre
    notification.onclose = () => {
      if (options.onClose) {
        options.onClose();
      }
    };

    return notification;
  }

  /**
   * Muestra notificación de mensaje WhatsApp listo
   */
  notifyWhatsAppReady(count, leads = []) {
    const title = '⏰ Mensajes de WhatsApp Listos';
    const message = `Tienes ${count} mensaje${count > 1 ? 's' : ''} programado${count > 1 ? 's' : ''} listo${count > 1 ? 's' : ''} para enviar`;

    let body = message;
    if (leads.length > 0 && leads.length <= 3) {
      const names = leads.map(l => l.name || l.nombre || 'Usuario').join(', ');
      body = `${message}\n${names}`;
    }

    console.log('📬 Notificación:', title, body);

    return this.show(title, {
      body: body,
      tag: 'whatsapp-ready',
      onClick: () => {
        console.log('📲 Usuario hizo clic en notificación');
        window.location.href = '/';
      }
    });
  }

  /**
   * Muestra notificación de error
   */
  notifyError(message) {
    return this.show('❌ Error', {
      body: message,
      tag: 'error-notification'
    });
  }

  /**
   * Muestra notificación de éxito
   */
  notifySuccess(message) {
    return this.show('✅ Éxito', {
      body: message,
      tag: 'success-notification'
    });
  }
}

// Crear instancia singleton
export const notificationService = new NotificationService();

export default notificationService;
