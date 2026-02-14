import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { updateLead, markLeadLost } from '../services/leadsService';
import useAuth from '../hooks/useAuth.jsx';   // 👈 igual que en useLostLeads
import WhatsAppModal from './WhatsAppModal';

// --- ÍCONOS ---
const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.891-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.398 1.919 6.166l-1.138 4.162 4.273-1.12z" />
  </svg>
);

const ChevronIcon = ({ isExpanded }) => (
  <svg
    className={`w-5 h-5 transform transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
  </svg>
);

const GoogleContactsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,12A4,4,0,1,0,8,8,4,4,0,0,0,12,12Zm0,2c-2.67,0-8,1.34-8,4v2H20V18C20,15.34,14.67,14,12,14Z" />
  </svg>
);

// --- LÓGICA DE ESTILOS ---
const getStageTimeInfo = (lead) => {
  if (!lead.etapaHistorial?.length)
    return { text: 'N/A', cardBgClass: 'bg-slate-700', badgeColorClass: 'bg-slate-500 text-slate-100' };

  const currentStageHistory = lead.etapaHistorial[lead.etapaHistorial.length - 1];
  if (!currentStageHistory.fechaEntrada)
    return { text: 'N/A', cardBgClass: 'bg-slate-700', badgeColorClass: 'bg-slate-500 text-slate-100' };

  const hoursInStage = Math.abs(new Date() - currentStageHistory.fechaEntrada.toDate()) / 36e5;

  let cardBgClass = 'bg-green-700',
    badgeColorClass = 'bg-green-500 text-white';

  switch (lead.etapa) {
    case 'Primer Contacto':
      if (hoursInStage > 12) {
        cardBgClass = 'bg-red-700';
        badgeColorClass = 'bg-red-500 text-white';
      } else if (hoursInStage > 6) {
        cardBgClass = 'bg-yellow-600';
        badgeColorClass = 'bg-yellow-400 text-yellow-900';
      }
      break;
    case 'Segundo Contacto':
      if (hoursInStage > 48) {
        cardBgClass = 'bg-red-700';
        badgeColorClass = 'bg-red-500 text-white';
      } else if (hoursInStage > 24) {
        cardBgClass = 'bg-yellow-600';
        badgeColorClass = 'bg-yellow-400 text-yellow-900';
      }
      break;
    case 'Seguimiento':
    case 'Cierre':
      if (hoursInStage > 72) {
        cardBgClass = 'bg-red-700';
        badgeColorClass = 'bg-red-500 text-white';
      } else if (hoursInStage > 48) {
        cardBgClass = 'bg-yellow-600';
        badgeColorClass = 'bg-yellow-400 text-yellow-900';
      }
      break;
    default:
      cardBgClass = 'bg-slate-800';
      badgeColorClass = 'bg-slate-600 text-slate-100';
      break;
  }
  const days = Math.floor(hoursInStage / 24),
    hours = Math.floor(hoursInStage % 24);
  const text = days > 0 ? `${days}d ${hours}h` : `${Math.floor(hoursInStage)}h`;
  return { text, cardBgClass, badgeColorClass };
};

export default function LeadCard({
  lead,
  index,
  onEdit,
  onMarkLost,
  onStartOnboarding,
  userName,
  currentUser: currentUserProp, // opcional: puede venir del padre
}) {
  // 👉 Igual que en useLostLeads: obtenemos { user } del hook
  const { user } = useAuth() || {};
  const currentUser = currentUserProp || user;
  const userId = currentUser?.uid;

  const [isExpanded, setIsExpanded] = useState(false);
  const [contactStatus, setContactStatus] = useState('idle');
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppVariant, setWhatsAppVariant] = useState('primary');

  // --- MENÚ "PERDIDO" ---
  const [isLostMenuOpen, setIsLostMenuOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [isSavingLost, setIsSavingLost] = useState(false);

  const lostReasonsList = [
    'Cotizado sin respuesta',
    'Dato error',
    'Embarazo',
    'Imposible contactar',
    'Por edad',
    'Por precio',
    'Preexistencia',
  ];

  const initialInterestLevel =
    lead.interestLevel ?? lead.nivelInteres ?? lead.infoProceso?.interestLevel ?? 0;
  const [interestLevel, setInterestLevel] = useState(initialInterestLevel);

  const flameSizeClasses = ['text-xl', 'text-2xl', 'text-3xl'];
  const flameSizeClassesCollapsed = ['text-base', 'text-lg', 'text-xl'];
  const flameColorClasses = ['text-gray-500', 'text-yellow-500', 'text-orange-500'];

  const stageTimeInfo = getStageTimeInfo(lead);
  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
  const infoCotizacion = lead.infoCotizacion || {};

  const toggleLostMenu = (e) => {
    e.stopPropagation();
    if (!isLostMenuOpen) setLostReason('');
    setIsLostMenuOpen(!isLostMenuOpen);
  };

  const handleSaveLost = async (e) => {
    e.stopPropagation();

    if (!lostReason) {
      alert('Por favor, selecciona un motivo.');
      return;
    }

    if (!userId) {
      console.error('No se pudo obtener userId en LeadCard. currentUser=', currentUser);
      alert('No se pudo obtener el usuario. Verificá que estés logueado.');
      return;
    }

    setIsSavingLost(true);
    try {
      await markLeadLost({
        userId,
        leadId: lead.id,
        reason: lostReason,
      });

      if (onMarkLost) onMarkLost(lead);

      setIsLostMenuOpen(false);
    } catch (error) {
      console.error('Error marcando como perdido:', error);
      alert('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSavingLost(false);
    }
  };

  const openWhatsApp = (e, variant = 'primary') => {
    e.stopPropagation();
    if (!lead.celular) return;
    setWhatsAppVariant(variant);
    setIsWhatsAppOpen(true);
  };

  const handleInterestClick = async (e) => {
    e.stopPropagation();
    const newLevel = (interestLevel + 1) % 3;
    setInterestLevel(newLevel);
    try {
      lead.interestLevel = newLevel;
      if (lead.infoProceso) lead.infoProceso.interestLevel = newLevel;
    } catch (e) { }

    if (!userId) return;

    try {
      await updateLead(userId, lead.id, {
        interestLevel: newLevel,
        nivelInteres: newLevel,
      });
    } catch (error) {
      console.error('Error al actualizar interés:', error);
    }
  };

  const handleAddToGoogleContacts = async (e) => {
    e.stopPropagation();
    setContactStatus('adding');
    const webhookUrl = 'https://hook.us2.make.com/cob9nb9n513q30nlw1ghl44i0dj4am7u';
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: lead.nombre,
          numeroTramite: lead.numeroTramite,
          mail: lead.mail,
          celular: lead.celular,
          etapa: lead.etapa,
          userId,
          userEmail: currentUser?.email,
          userName: userName,
          timestamp: new Date().toISOString(),
          leadId: lead.id,
        }),
      });
      if (response.ok) setContactStatus('added');
      else setContactStatus('idle');
    } catch (error) {
      setContactStatus('idle');
    }
  };

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 mb-3 rounded-lg shadow-md select-none ${stageTimeInfo.cardBgClass}`}
        >
          {/* HEADER (Siempre visible) */}
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div>
              <div className="font-bold text-white">{lead.nombre}</div>
              <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold text-xs ${stageTimeInfo.badgeColorClass}`}
                >
                  {stageTimeInfo.text}
                </span>
                <span>•</span>
                <span>{lead.numeroTramite || 'Sin Trámite'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lead.etapa === 'Seguimiento' && interestLevel > 0 && (
                <span
                  className={`${flameColorClasses[interestLevel]} ${flameSizeClassesCollapsed[interestLevel]}`}
                  role="img"
                  aria-label="Interés"
                >
                  🔥
                </span>
              )}
              <ChevronIcon isExpanded={isExpanded} />
            </div>
          </div>

          {/* CONTENIDO EXPANDIDO */}
          {isExpanded && (
            <div className="mt-4 pt-3 border-t border-white/20 text-gray-200">
              {['Seguimiento', 'Cierre'].includes(lead.etapa) ? (
                <div className="flex justify-between items-start text-sm mb-4">
                  <div className="space-y-1">
                    <p>
                      <strong>Plan:</strong> {infoCotizacion.plan || 'N/A'}
                    </p>
                    <p>
                      <strong>Valor Final:</strong> {formatCurrency(infoCotizacion.valorFinalSocio)}
                    </p>
                    <p>
                      <strong>Obs:</strong> {infoCotizacion.observaciones || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 font-semibold">Forecast</p>
                    <p className="font-bold text-lg text-green-400">
                      {formatCurrency(infoCotizacion.valorForecast)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm space-y-1 mb-4">
                  <p>
                    <strong>Email:</strong> {lead.mail || 'N/A'}
                  </p>
                  <p>
                    <strong>Celular:</strong> {lead.celular || 'N/A'}
                  </p>
                  <p>
                    <strong>DNI:</strong> {lead.dni || 'N/A'}
                  </p>
                  <p>
                    <strong>Plan:</strong> {infoCotizacion.plan || 'N/A'}
                  </p>
                </div>
              )}

              {/* --- ZONA DEL MENÚ "PERDIDO" --- */}
              {isLostMenuOpen ? (
                <div
                  className="bg-slate-800 p-3 rounded-md border border-slate-600 shadow-lg animation-fade-in"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-bold text-white mb-2">Motivo de pérdida:</p>
                  <select
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    className="w-full text-xs text-gray-900 p-2 rounded mb-2 focus:outline-none"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <option value="">-- Seleccionar --</option>
                    {lostReasonsList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={toggleLostMenu}
                      className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded"
                      disabled={isSavingLost}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveLost}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-bold"
                      disabled={isSavingLost}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {isSavingLost ? 'Guardando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {lead.etapa === 'Seguimiento' && (
                      <button
                        onClick={handleInterestClick}
                        className="px-1 py-1"
                        title="Nivel de interés"
                      >
                        <span
                          className={`${flameColorClasses[interestLevel]} ${flameSizeClasses[interestLevel]}`}
                        >
                          🔥
                        </span>
                      </button>
                    )}

                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={toggleLostMenu}
                      className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-md shadow-sm"
                    >
                      Perdido
                    </button>

                    {lead.celular && (
                      <>
                        <button
                          onClick={(e) => openWhatsApp(e, 'primary')}
                          className="flex items-center text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded-md shadow-sm"
                        >
                          <WhatsAppIcon />
                          WhatsApp
                        </button>
                        {['Primer Contacto', 'Segundo Contacto'].includes(lead.etapa) && (
                          <button
                            onClick={(e) => openWhatsApp(e, 'secondary')}
                            className="flex items-center text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded-md shadow-sm"
                          >
                            <WhatsAppIcon />
                            Mensaje 2
                          </button>
                        )}
                      </>
                    )}
                    {lead.etapa === 'Cierre' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartOnboarding(lead);
                        }}
                        className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md shadow-sm"
                      >
                        Iniciar Alta
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {['Cotización', 'Seguimiento', 'Cierre'].includes(lead.etapa) && (
                      <button
                        onClick={handleAddToGoogleContacts}
                        disabled={contactStatus !== 'idle'}
                        className={`p-2 rounded-md shadow-sm ${contactStatus === 'added'
                          ? 'bg-gray-500'
                          : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                      >
                        <GoogleContactsIcon />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(lead);
                      }}
                      className="text-sm font-semibold text-white bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded-md shadow-sm"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal de WhatsApp */}
          <WhatsAppModal
            open={isWhatsAppOpen}
            onClose={() => setIsWhatsAppOpen(false)}
            lead={lead}
            userName={userName}
            variant={whatsAppVariant}
          />
        </div>
      )}
    </Draggable>
  );
}
