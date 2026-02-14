/**
 * src/utils/funnelTimeUtils.js
 * Lógica para determinar el estado de alerta de un lead en el funnel de ventas.
 */

export const getFunnelTimeInfo = (lead) => {
  if (!lead.etapaHistorial?.length) {
    return { colorState: 'default', stage: lead.etapa };
  }

  const currentStageHistory = lead.etapaHistorial[lead.etapaHistorial.length - 1];
  if (!currentStageHistory.fechaEntrada) {
    return { colorState: 'default', stage: lead.etapa };
  }

  const hoursInStage = Math.abs(new Date() - currentStageHistory.fechaEntrada.toDate()) / 36e5;
  let colorState = 'green';

  // Reglas de tiempo para cada etapa del funnel
  switch (lead.etapa) {
    case 'Primer Contacto':
      if (hoursInStage > 12) colorState = 'red';
      else if (hoursInStage > 6) colorState = 'yellow';
      break;
    case 'Segundo Contacto':
      if (hoursInStage > 48) colorState = 'red';
      else if (hoursInStage > 24) colorState = 'yellow';
      break;
    case 'Seguimiento':
    case 'Cierre':
      if (hoursInStage > 72) colorState = 'red';
      else if (hoursInStage > 48) colorState = 'yellow';
      break;
    default:
      colorState = 'default';
      break;
  }

  return { colorState, stage: lead.etapa };
};
