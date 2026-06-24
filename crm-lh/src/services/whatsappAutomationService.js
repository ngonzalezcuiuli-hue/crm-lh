import { recordWhatsAppSent } from './leadsService';

/**
 * Genera URL para abrir WhatsApp Web/App con un mensaje predefinido
 * @param {string} phoneNumber - Teléfono del destinatario (sin caracteres especiales)
 * @param {string} message - Mensaje a enviar
 * @param {string} device - 'web', 'mobile', o 'auto' (detecta automáticamente)
 * @returns {string} URL de WhatsApp
 */
export function generateWhatsAppUrl(phoneNumber, message, device = 'auto') {
  if (!phoneNumber) return null;

  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message.trim());

  // Detectar automáticamente si device es 'auto' o no está especificado
  let targetDevice = device;
  if (device === 'auto' || !device) {
    const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
    targetDevice = isMobile ? 'mobile' : 'web';
  }

  if (targetDevice === 'mobile') {
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
  }

  // Web (default)
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
}

/**
 * Obtiene el mensaje predefinido por etapa del lead
 * @param {Object} lead - Datos del lead
 * @param {string} stage - Etapa actual (Primer Contacto, Segundo Contacto, Seguimiento)
 * @param {string} userName - Nombre del asesor
 * @returns {string} Mensaje formateado
 */
export function getDefaultMessageByStage(lead, stage, userName) {
  const currentUserName = userName || 'tu asesor';
  const nombreProspecto = lead.nombre || '';

  if (stage === 'Primer Contacto') {
    return `Hola ${nombreProspecto}, buen dia 👋\n\nSoy ${currentUserName} de Swiss Medical 🏥\n\nGracias por tu consulta en nuestra web. Me encantaria ayudarte a encontrar el plan ideal para vos y responder cualquier duda que tengas.\n\nQueres que sigamos conversando por aca 📱 o preferis que te llame 📞? 😊`;
  }

  if (stage === 'Segundo Contacto') {
    return `Hola ${nombreProspecto} 👋, como estas?\n\nSoy ${currentUserName} de Swiss Medical otra vez 😃\n\nVi que tu consulta quedo pendiente y queria saber si seguis buscando un plan de cobertura medica?`;
  }

  if (stage === 'Seguimiento') {
    return `Hola ${nombreProspecto}, como estas? 👋\n\nComo no hemos podido avanzar, estoy por cerrar tu tramite y queria saber si el motivo es que el precio no se ajusta a lo que buscas o simplemente preferis otra cobertura.\n\nCon una palabra (*PRECIO* u *OTRA*) me alcanza para entender tu caso y mejorar mi asesoria.`;
  }

  return `Hola ${nombreProspecto}, como estas? Te contacto desde Swiss Medical. 😊`;
}

/**
 * Registra que un lote de WhatsApp fue enviado
 * @param {string} userId - ID del usuario
 * @param {Array} leadIds - IDs de los leads
 * @param {string} stage - Etapa del envío
 * @returns {Promise}
 */
export async function recordBulkWhatsAppSent(userId, leadIds, stage) {
  const promises = leadIds.map(leadId =>
    recordWhatsAppSent({ userId, leadId, variant: stage })
  );
  return Promise.all(promises);
}

/**
 * Abre múltiples URLs de WhatsApp en pestañas del navegador
 * @param {Array} urls - Array de URLs de WhatsApp
 */
export function openBulkWhatsAppUrls(urls) {
  urls.forEach(url => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  });
}
