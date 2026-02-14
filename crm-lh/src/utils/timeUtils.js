/**
 * src/utils/timeUtils.js
 * * Este archivo contiene funciones de utilidad relacionadas con el manejo de fechas y tiempos.
 */

/**
 * Calcula las clases de CSS para el color de fondo y texto de la tarjeta de onboarding
 * basándose en el tiempo que ha pasado desde que el lead entró en esta etapa.
 * * @param {firebase.firestore.Timestamp} timestamp - El timestamp de Firestore que indica cuándo se actualizó el lead por última vez (asumimos que es cuando entró en Onboarding).
 * @returns {object} Un objeto con las clases de Tailwind CSS para el fondo (`cardBgClass`) y el texto (`textClass`).
 */
export const getOnboardingTimeInfo = (timestamp) => {
  // Si no hay timestamp o no es válido, devuelve un color por defecto.
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return { cardBgClass: 'bg-white', textClass: 'text-gray-800' };
  }

  const now = new Date();
  const entryDate = timestamp.toDate();
  // Calcula la diferencia en horas. 36e5 es el número de milisegundos en una hora.
  const hoursElapsed = Math.abs(now - entryDate) / 36e5;

  // Lógica de colores según las reglas definidas:
  // - Verde: primeras 48 horas
  // - Amarillo: de 48 a 96 horas
  // - Rojo: más de 96 horas
  if (hoursElapsed <= 48) {
    // Un verde claro, similar al del funnel.
    return { cardBgClass: 'bg-[#D0FAE5]', textClass: 'text-green-800' }; 
  } else if (hoursElapsed <= 96) {
    // Un amarillo claro, similar al del funnel.
    return { cardBgClass: 'bg-[#FEF9C2]', textClass: 'text-yellow-800' }; 
  } else {
    // Rojo Ferrari, que necesita texto blanco para el contraste.
    return { cardBgClass: 'bg-[#FF2800]', textClass: 'text-white' }; 
  }
};
