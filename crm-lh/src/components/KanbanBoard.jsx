// src/components/KanbanBoard.jsx
import React, { useState, useMemo } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";

// Orden/etapas del funnel comercial (deben matchear con lead.etapa)
const FUNNEL_STAGES = [
  { id: "Primer Contacto", title: "Primer Contacto" },
  { id: "Segundo Contacto", title: "Segundo Contacto" },
  { id: "Cotización", title: "Cotización" },
  { id: "Seguimiento", title: "Seguimiento" },
  { id: "Cierre", title: "Cierre" },
];

export default function KanbanBoard({
  data = {},                 // { etapa: Lead[] } — viene de FunnelPage
  onEdit,
  onMarkLost,
  onStartOnboarding,
  userName,
  makeWebhookUrl,
  onDragEnd,
  currentUser, // <-- La recibe correctamente
}) {
  // estado de colapsado por columna (todas abiertas por defecto)
  const [openMap, setOpenMap] = useState(
    FUNNEL_STAGES.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
  );

  const sections = useMemo(() => {
    return FUNNEL_STAGES.map((s) => ({
      id: s.id,
      title: s.title,
      leads: data[s.id] || [],
    }));
  }, [data]);

  const handleToggle = (columnId) => {
    setOpenMap((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const internalOnDragEnd = (result) => {
    if (typeof onDragEnd === "function") onDragEnd(result);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider">
          Funnel de Ventas
        </h1>
        {userName && (
          <div className="text-sm text-slate-400 bg-slate-800/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700/50">
            Usuario: <span className="font-medium text-slate-200">{userName}</span>
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={internalOnDragEnd}>
        {/* ✅ Apilado vertical: cada etapa ocupa el ancho completo */}
        <div className="flex flex-col gap-6">
          {sections.map((sec) => (
            <div key={sec.id} className="w-full">
              <Column
                columnId={sec.id}
                title={sec.title}
                leads={sec.leads}
                isOpen={openMap[sec.id]}
                onToggle={handleToggle}
                onEdit={onEdit}
                onMarkLost={onMarkLost}
                onStartOnboarding={onStartOnboarding}
                userName={userName}
                // 🛑 ESTA ES LA CORRECCIÓN: Pasar el usuario a Column
                currentUser={currentUser}
              />
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}