import React, { useMemo, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import LeadCard from "./LeadCard";

const ChevronIcon = ({ isExpanded }) => (<svg className={`w-5 h-5 transform transition-transform duration-200 text-gray-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>);
const ColorIndicator = ({ color, count }) => (<div className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-full ${color}`}></span><span className="text-xs font-semibold text-gray-600">{count}</span></div>);

const getStageTimeInfo = (lead) => {
  if (!lead.etapaHistorial?.length) return { colorClass: 'bg-gray-200' };
  const currentStageHistory = lead.etapaHistorial[lead.etapaHistorial.length - 1];
  if (!currentStageHistory.fechaEntrada) return { colorClass: 'bg-gray-200' };
  const hoursInStage = Math.abs(new Date() - currentStageHistory.fechaEntrada.toDate()) / 36e5;
  let colorClass = 'bg-green-100';
  switch (lead.etapa) {
    case 'Primer Contacto': if (hoursInStage > 12) colorClass = 'bg-red-100'; else if (hoursInStage > 6) colorClass = 'bg-yellow-100'; break;
    case 'Segundo Contacto': if (hoursInStage > 48) colorClass = 'bg-red-100'; else if (hoursInStage > 24) colorClass = 'bg-yellow-100'; break;
    case 'Seguimiento': case 'Cierre': if (hoursInStage > 72) colorClass = 'bg-red-100'; else if (hoursInStage > 48) colorClass = 'bg-yellow-100'; break;
  }
  return { colorClass };
};

// Helper to obtain the Date the lead entered the current stage.
// Returns a JavaScript Date instance or null if not available.
const getStageEntryDate = (lead) => {
  if (!lead?.etapaHistorial || lead.etapaHistorial.length === 0) return null;
  const currentStageHistory = lead.etapaHistorial[lead.etapaHistorial.length - 1];
  if (!currentStageHistory?.fechaEntrada) return null;
  // fechaEntrada is a Firebase Timestamp; convert to JS Date
  try {
    return currentStageHistory.fechaEntrada.toDate();
  } catch (err) {
    // fallback if toDate is not a function
    return new Date(currentStageHistory.fechaEntrada);
  }
};

// MODIFICADO: Agregado currentUser como prop
export default function Column({ columnId, title, leads, onEdit, onMarkLost, onStartOnboarding, isOpen, onToggle, userName, currentUser }) {
  // Local state to control sort direction. true => ascending (más antiguo primero).
  const [sortAscending, setSortAscending] = useState(true);
  const colorCounts = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0 };
    leads.forEach(lead => {
      const { colorClass } = getStageTimeInfo(lead);
      if (colorClass.includes('green')) counts.green++;
      else if (colorClass.includes('yellow')) counts.yellow++;
      else if (colorClass.includes('red')) counts.red++;
    });
    return counts;
  }, [leads]);

  // Compute sorted leads based on stage entry time and current sort order.
  const sortedLeads = useMemo(() => {
    const leadsWithDate = (leads || []).map((lead) => ({
      lead,
      entryDate: getStageEntryDate(lead),
    }));
    // sort by entryDate, placing undefined dates at the end
    leadsWithDate.sort((a, b) => {
      const aDate = a.entryDate ? a.entryDate.getTime() : (sortAscending ? Infinity : -Infinity);
      const bDate = b.entryDate ? b.entryDate.getTime() : (sortAscending ? Infinity : -Infinity);
      return sortAscending ? aDate - bDate : bDate - aDate;
    });
    return leadsWithDate.map((obj) => obj.lead);
  }, [leads, sortAscending]);

  // Toggle the sort order and prevent collapsing the column when clicking the sort control.
  const handleSortToggle = (e) => {
    e.stopPropagation();
    setSortAscending((prev) => !prev);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border">
      {/* Header button toggles the collapse state. Sort button is nested inside to prevent triggering collapse. */}
      <button onClick={() => onToggle(columnId)} className="w-full flex justify-between items-center p-4 text-left">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg text-gray-800">{title}</h2>
          <span className="text-sm font-semibold bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">{leads.length}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Color indicators showing lead statuses within the stage */}
          <div className="flex items-center gap-3">
            <ColorIndicator color="bg-green-400" count={colorCounts.green} />
            <ColorIndicator color="bg-yellow-400" count={colorCounts.yellow} />
            <ColorIndicator color="bg-red-400" count={colorCounts.red} />
          </div>
          {/* Sort order toggle button: clicking flips between ascending/descending */}
          <button
            onClick={handleSortToggle}
            className="p-1 rounded hover:bg-gray-100 text-gray-600 focus:outline-none"
            title={sortAscending ? 'Ordenar por más reciente' : 'Ordenar por más antiguo'}
          >
            {/* Simple up/down arrows to indicate sort direction */}
            {sortAscending ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 10h12l-6-6-6 6z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 10l6 6 6-6H3z" /></svg>
            )}
          </button>
          {/* Chevron to indicate collapse state */}
          <ChevronIcon isExpanded={isOpen} />
        </div>
      </button>
      {isOpen && (
        <Droppable droppableId={columnId}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="px-4 pb-4 min-h-[100px]">
              {sortedLeads.map((lead, idx) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  index={idx}
                  onEdit={onEdit}
                  onMarkLost={onMarkLost}
                  onStartOnboarding={onStartOnboarding}
                  userName={userName}
                  currentUser={currentUser}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}