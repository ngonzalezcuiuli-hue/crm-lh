import React, { useState, useEffect } from 'react';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.891-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.398 1.919 6.166l-1.138 4.162 4.273-1.12z" />
    </svg>
);

/**
 * Genera el mensaje predefinido según la etapa y variante del lead.
 */
function getDefaultMessage(lead, userName, variant = 'primary') {
    const currentUserName = userName || 'tu asesor';
    const nombreProspecto = lead.nombre || '';

    if (lead.etapa === 'Primer Contacto') {
        if (variant === 'primary') {
            return `Hola ${nombreProspecto}, buen dia \u{1F44B}\n\nSoy ${currentUserName} de Swiss Medical \u{1F3E5}\n\nGracias por tu consulta en nuestra web. Me encantaria ayudarte a encontrar el plan ideal para vos y responder cualquier duda que tengas.\n\nQueres que sigamos conversando por aca \u{1F4F1} o preferis que te llame \u{1F4DE}? \u{1F60A}`;
        } else {
            return `Hola ${nombreProspecto}, como estas?\n\nQueria contarte que este mes tenemos *DESCUENTOS* en nuestros planes.\n\nSi te interesa saber mas, avisame y con gusto te envio toda la info \u{1F60A}.`;
        }
    } else if (lead.etapa === 'Segundo Contacto') {
        if (variant === 'primary') {
            return `Hola ${nombreProspecto} \u{1F44B}, como estas?\n\nSoy ${currentUserName} de Swiss Medical otra vez \u{1F603}\n\nVi que tu consulta quedo pendiente y queria saber si seguis buscando un plan de cobertura medica?`;
        } else {
            return `Hola ${nombreProspecto}, como estas? \u{1F44B}\n\nComo no hemos podido avanzar, estoy por cerrar tu tramite y queria saber si el motivo es que el precio no se ajusta a lo que buscas o simplemente preferis otra cobertura.\n\nCon una palabra (*PRECIO* u *OTRA*) me alcanza para entender tu caso y mejorar mi asesoria.`;
        }
    }

    // Etapas sin mensaje predefinido
    return `Hola ${nombreProspecto}, como estas? Te contacto desde Swiss Medical. \u{1F60A}`;
}

export default function WhatsAppModal({ open, onClose, lead, userName, variant = 'primary' }) {
    const [message, setMessage] = useState('');

    // Generar mensaje predefinido cuando se abre el modal
    useEffect(() => {
        if (open && lead) {
            setMessage(getDefaultMessage(lead, userName, variant));
        }
    }, [open, lead, userName, variant]);

    if (!open || !lead) return null;

    const phoneNumber = (lead.celular || '').replace(/\D/g, '');

    const handleSend = () => {
        const whatsappUrl = message.trim()
            ? `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message.trim())}`
            : `https://api.whatsapp.com/send?phone=${phoneNumber}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        onClose();
    };

    const variantLabel = variant === 'primary' ? 'Mensaje Principal' : 'Mensaje Alternativo';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md mx-4 bg-slate-800 rounded-2xl shadow-2xl border border-slate-600/50 overflow-hidden animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-green-600 to-emerald-600">
                    <WhatsAppIcon />
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">Enviar WhatsApp</h3>
                        <p className="text-green-100 text-xs">{variantLabel}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors text-xl font-bold leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Lead info */}
                <div className="px-5 py-3 bg-slate-700/50 border-b border-slate-600/30">
                    <p className="text-sm text-slate-300">
                        <span className="text-slate-400">Para:</span>{' '}
                        <span className="font-semibold text-white">{lead.nombre}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        📱 {lead.celular || 'Sin número'}
                        {lead.etapa && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-600 text-slate-300 text-[10px] font-medium">
                                {lead.etapa}
                            </span>
                        )}
                    </p>
                </div>

                {/* Message textarea */}
                <div className="px-5 py-4 space-y-2">
                    <label className="text-sm font-semibold text-slate-300">
                        Mensaje
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe tu mensaje aquí..."
                        className="w-full min-h-[160px] p-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                    />
                    <p className="text-[10px] text-slate-500">
                        Podés editar el mensaje antes de enviarlo. Se abrirá en WhatsApp Web/App.
                    </p>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-800/80 border-t border-slate-700/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!phoneNumber}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl shadow-lg shadow-green-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <WhatsAppIcon />
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}
