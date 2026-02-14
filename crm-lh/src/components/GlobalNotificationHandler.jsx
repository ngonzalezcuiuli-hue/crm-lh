import { useEffect } from 'react';
import { useAuthContext } from '../hooks/useAuth.jsx';
import { useToast } from '../context/ToastContext.jsx'; // Usamos la ruta relativa correcta
import { updateLead } from '../services/leadsService';

// Hooks para obtener los leads de diferentes secciones
import useOnboardingLeads from '../hooks/useOnboardingLeads';
import useLeads from '../hooks/useLeads';

// Funciones de utilidad para determinar el estado de los leads
import { getOnboardingTimeInfo } from '../utils/timeUtils';
import { getFunnelTimeInfo } from '../utils/funnelTimeUtils';

// Este componente no renderiza nada, solo maneja la lógica de notificaciones en segundo plano.
function GlobalNotificationHandler() {
  const { user } = useAuthContext() || {};
  const { showToast } = useToast();

  const { onboardingLeads } = useOnboardingLeads(user?.uid);
  const { leads: funnelLeads } = useLeads(user?.uid);

  // Efecto para monitorear los leads en Onboarding
  useEffect(() => {
    if (!user || onboardingLeads.length === 0) return;

    onboardingLeads.forEach(lead => {
      const { colorState } = getOnboardingTimeInfo(lead.lastUpdatedAt);
      const lastNotifiedState = lead.lastNotifiedColorState || 'green';

      if (colorState !== 'default' && colorState !== lastNotifiedState) {
        if (colorState === 'yellow') {
          showToast(`ONBOARDING: "${lead.nombre}" ha pasado a estado de alerta.`, 'warning');
          updateLead(user.uid, lead.id, { lastNotifiedColorState: 'yellow' });
        } else if (colorState === 'red') {
          showToast(`ONBOARDING: ¡"${lead.nombre}" requiere atención inmediata!`, 'error');
          updateLead(user.uid, lead.id, { lastNotifiedColorState: 'red' });
        }
      }
    });
  }, [onboardingLeads, user, showToast]);

  // Efecto para monitorear los leads en el Funnel de Ventas
  useEffect(() => {
    if (!user || funnelLeads.length === 0) return;

    funnelLeads.forEach(lead => {
      if (lead.estado === 'Activo') { // Solo procesamos leads activos en el funnel
        const { colorState, stage } = getFunnelTimeInfo(lead);
        const lastNotifiedState = lead.lastNotifiedFunnelState || 'green';

        if (colorState !== 'default' && colorState !== lastNotifiedState) {
          if (colorState === 'yellow') {
            showToast(`FUNNEL (${stage}): "${lead.nombre}" necesita seguimiento.`, 'warning');
            updateLead(user.uid, lead.id, { lastNotifiedFunnelState: 'yellow' });
          } else if (colorState === 'red') {
            showToast(`FUNNEL (${stage}): ¡"${lead.nombre}" está estancado!`, 'error');
            updateLead(user.uid, lead.id, { lastNotifiedFunnelState: 'red' });
          }
        }
      }
    });
  }, [funnelLeads, user, showToast]);

  return null; // No renderiza nada visible
}

export default GlobalNotificationHandler;
