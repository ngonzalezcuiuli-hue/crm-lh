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
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800">
          Funnel de Ventas
        </h1>
        {userName && (
          <div className="text-sm text-gray-500">
            Usuario: <span className="font-medium">{userName}</span>
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