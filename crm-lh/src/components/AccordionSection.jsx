// src/components/AccordionSection.jsx
import React, { useState } from 'react';

export default function AccordionSection({ title, children, startOpen = false }) {
  const [isOpen, setIsOpen] = useState(startOpen);

  return (
    // Contenedor principal estilo "tarjeta" de iOS
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left font-medium text-gray-800 hover:bg-gray-50/50"
      >
        <span>{title}</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-300 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      {/* El contenido se desliza hacia abajo al abrirse */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200/80">
          {children}
        </div>
      )}
    </div>
  );
}