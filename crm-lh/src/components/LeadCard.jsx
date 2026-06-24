import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { updateLead, markLeadLost, setRecordatorio, clearRecordatorio } from '../services/leadsService';
import useAuth from '../hooks/useAuth.jsx';   // 👈 igual que en useLostLeads
import WhatsAppModal from './WhatsAppModal';
import RecordatorioModal from './RecordatorioModal';
import { Calendar } from 'lucide-react';

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
  const [isRecordatorioOpen, setIsRecordatorioOpen] = useState(false);

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

  // Verificar si los WhatsApp fueron enviados
  const whatsappEnviados = lead.whatsappEnviados || {};
  const primarySent = whatsappEnviados.primary?.enviado === true;
  const secondarySent = whatsappEnviados.secondary?.enviado === true;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('es-AR');
    } catch (e) {
      return 'Enviado';
    }
  };

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

  const handleSaveRecordatorio = async (data) => {
    if (!userId) {
      alert('Error: No se pudo obtener el usuario');
      return;
    }

    try {
      if (data === null) {
        await clearRecordatorio({ userId, leadId: lead.id });
      } else {
        await setRecordatorio({
          userId,
          leadId: lead.id,
          fechaProximoContacto: data.fechaProximoContacto,
          nota: data.nota
        });
      }
      setIsRecordatorioOpen(false);
    } catch (error) {
      console.error('Error guardando recordatorio:', error);
      alert('Error al guardar el recordatorio');
    }
  };

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
          }}
          className={`p-4 mb-3 rounded-xl select-none bg-gradient-to-br ${
            stageTimeInfo.cardBgClass.includes('red-700')
              ? 'from-red-900 via-red-800 to-red-900'
              : stageTimeInfo.cardBgClass.includes('yellow-600')
              ? 'from-yellow-900 via-yellow-800 to-yellow-900'
              : 'from-green-900 via-green-800 to-green-900'
          } ${
            snapshot.isDragging
              ? 'shadow-2xl shadow-emerald-500/40 border-2 border-emerald-400/70 ring-2 ring-emerald-400/30'
              : 'shadow-lg border border-slate-700/50 hover:shadow-xl hover:border-slate-500/60 transition-shadow duration-200'
          }`}
        >
          {/* HEADER (Siempre visible) */}
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex-1">
              <div className="font-bold text-white text-lg tracking-wide">{lead.nombre}</div>

              {/* Badges de WhatsApp */}
              {(primarySent || secondarySent || lead.whatsappProximo) && (
                <div className="flex items-center gap-2 text-xs mt-2 flex-wrap">
                  {primarySent && (
                    <span className="px-2 py-1 rounded-full bg-green-600/40 text-green-200 border border-green-500/30 font-medium">
                      ✓ Primer Contacto
                    </span>
                  )}
                  {secondarySent && (
                    <span className="px-2 py-1 rounded-full bg-green-600/40 text-green-200 border border-green-500/30 font-medium">
                      ✓ Segundo Contacto
                    </span>
                  )}
                  {lead.whatsappProximo?.programadoPara && (
                    <span className="px-2 py-1 rounded-full bg-blue-600/40 text-blue-200 border border-blue-500/30 font-medium">
                      ⏱️ Programado
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-300 mt-2">
                <span
                  className={`px-2.5 py-1 rounded-full font-semibold text-xs uppercase tracking-wider ${
                    stageTimeInfo.cardBgClass.includes('red-700')
                      ? 'bg-red-600/40 text-red-200 border border-red-500/30'
                      : stageTimeInfo.cardBgClass.includes('yellow-600')
                      ? 'bg-yellow-600/40 text-yellow-100 border border-yellow-500/30'
                      : 'bg-green-600/40 text-green-200 border border-green-500/30'
                  }`}
                >
                  {stageTimeInfo.text}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-medium">{lead.numeroTramite || 'Sin Trámite'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-2">
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
            <div className="mt-4 pt-4 border-t border-white/10 text-slate-200">
              {/* RECORDATORIO SECTION */}
              {lead.recordatorio?.enabled && (
                <div className="mb-4 bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-orange-900/40 backdrop-blur-sm rounded-lg p-3 border border-amber-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Próximo Contacto
                      </p>
                      <p className="text-sm font-bold text-amber-200">
                        {new Date(lead.recordatorio.fechaProximoContacto.toDate?.() || lead.recordatorio.fechaProximoContacto).toLocaleDateString('es-AR')}
                      </p>
                      {lead.recordatorio.nota && (
                        <p className="text-xs text-slate-300 mt-2">
                          <span className="text-slate-400">Nota:</span> {lead.recordatorio.nota}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRecordatorioOpen(true);
                      }}
                      className="px-2 py-1 text-xs font-medium text-amber-200 hover:text-amber-100 transition"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              )}

              {['Seguimiento', 'Cierre'].includes(lead.etapa) ? (
                <div className="flex justify-between items-start text-sm mb-4 bg-slate-800/40 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Detalles Cotización</p>
                    <p>
                      <span className="text-slate-400">Plan:</span> <span className="text-white font-medium">{infoCotizacion.plan || 'N/A'}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Valor Final:</span> <span className="text-emerald-300 font-medium">{formatCurrency(infoCotizacion.valorFinalSocio)}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Obs:</span> <span className="text-slate-300">{infoCotizacion.observaciones || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Forecast</p>
                    <p className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                      {formatCurrency(infoCotizacion.valorForecast)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm space-y-2 mb-4 bg-slate-800/40 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Información de Contacto</p>
                  <p>
                    <span className="text-slate-400">Email:</span> <span className="text-slate-200">{lead.mail || 'N/A'}</span>
                  </p>
                  <p>
                    <span className="text-slate-400">Celular:</span> <span className="text-slate-200">{lead.celular || 'N/A'}</span>
                  </p>
                  <p>
                    <span className="text-slate-400">DNI:</span> <span className="text-slate-200">{lead.dni || 'N/A'}</span>
                  </p>
                  <p>
                    <span className="text-slate-400">Plan:</span> <span className="text-slate-200">{infoCotizacion.plan || 'N/A'}</span>
                  </p>
                </div>
              )}

              {/* --- ZONA DEL MENÚ "PERDIDO" --- */}
              {isLostMenuOpen ? (
                <div
                  className="bg-slate-800/60 backdrop-blur-sm p-3 rounded-lg border border-slate-700/50 shadow-lg animate-fade-in"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Motivo de pérdida:</p>
                  <select
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    className="w-full text-xs text-slate-900 p-2.5 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-red-500/50"
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
                      className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 text-xs rounded-lg font-medium border border-slate-600/50 transition"
                      disabled={isSavingLost}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveLost}
                      className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700 text-white text-xs rounded-lg font-bold transition border border-red-500/50"
                      disabled={isSavingLost}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {isSavingLost ? 'Guardando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {/* Botón Recordatorio */}
                  {['Seguimiento', 'Cierre'].includes(lead.etapa) && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRecordatorioOpen(true);
                      }}
                      className="text-xs font-semibold text-white bg-amber-600/80 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition border border-amber-500/50 w-full"
                    >
                      📅 {lead.recordatorio?.enabled ? 'Editar Recordatorio' : 'Agendar Contacto'}
                    </button>
                  )}

                  {/* Primera fila: Acciones principales */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {lead.etapa === 'Seguimiento' && (
                      <button
                        onClick={handleInterestClick}
                        className="px-2 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700/50 transition"
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
                      className="text-xs font-semibold text-white bg-red-600/80 hover:bg-red-700 px-3 py-1.5 rounded-lg transition border border-red-500/50"
                    >
                      Perdido
                    </button>

                    {lead.celular && (
                      <>
                        <div className="relative group">
                          <button
                            onClick={(e) => openWhatsApp(e, 'primary')}
                            className={`flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition border ${
                              primarySent
                                ? 'bg-emerald-700/60 hover:bg-emerald-600 text-emerald-50 border-emerald-500/50'
                                : 'bg-green-600/80 hover:bg-green-700 text-white border-green-500/50'
                            }`}
                            title={primarySent ? `Último envío: ${formatTimestamp(whatsappEnviados.primary?.timestamp)}` : ''}
                          >
                            <WhatsAppIcon />
                            {primarySent ? '🔄 Reenviar' : 'WhatsApp'}
                          </button>
                          {primarySent && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700/50">
                              Último envío: {formatTimestamp(whatsappEnviados.primary?.timestamp)}
                            </div>
                          )}
                        </div>
                        {['Primer Contacto', 'Segundo Contacto'].includes(lead.etapa) && (
                          <div className="relative group">
                            <button
                              onClick={(e) => openWhatsApp(e, 'secondary')}
                              className={`flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition border ${
                                secondarySent
                                  ? 'bg-emerald-700/60 hover:bg-emerald-600 text-emerald-50 border-emerald-500/50'
                                  : 'bg-green-600/80 hover:bg-green-700 text-white border-green-500/50'
                              }`}
                              title={secondarySent ? `Último envío: ${formatTimestamp(whatsappEnviados.secondary?.timestamp)}` : ''}
                            >
                              <WhatsAppIcon />
                              {secondarySent ? '🔄 Reenviar Msg 2' : 'Mensaje 2'}
                            </button>
                            {secondarySent && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700/50">
                                Último envío: {formatTimestamp(whatsappEnviados.secondary?.timestamp)}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {lead.etapa === 'Cierre' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartOnboarding(lead);
                        }}
                        className="text-xs font-semibold text-white bg-blue-600/80 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition border border-blue-500/50"
                      >
                        Iniciar Alta
                      </button>
                    )}
                  </div>

                  {/* Segunda fila: Google Contacts y Editar */}
                  <div className="flex items-center gap-2 justify-end">
                    {['Cotización', 'Seguimiento', 'Cierre'].includes(lead.etapa) && (
                      <button
                        onClick={handleAddToGoogleContacts}
                        disabled={contactStatus !== 'idle'}
                        className={`p-2 rounded-lg border border-slate-700/50 transition ${contactStatus === 'added'
                          ? 'bg-slate-700/50 text-slate-400'
                          : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300'
                          }`}
                        title="Agregar a Google Contactos"
                      >
                        <GoogleContactsIcon />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(lead);
                      }}
                      className="text-sm font-semibold text-white bg-slate-700/60 hover:bg-slate-600/60 px-3 py-1.5 rounded-lg transition border border-slate-700/50"
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

          {/* Modal de Recordatorio */}
          <RecordatorioModal
            open={isRecordatorioOpen}
            onClose={() => setIsRecordatorioOpen(false)}
            onSave={handleSaveRecordatorio}
            initialData={lead}
          />
        </div>
      )}
    </Draggable>
  );
}
