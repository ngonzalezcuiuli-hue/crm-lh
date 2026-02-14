import React, { useState } from 'react';
import { Search } from 'lucide-react';

// MODIFICACIÓN: Se intenta una nueva ruta de importación para resolver el problema.
// Se usa una ruta absoluta desde la raíz del proyecto.
import logo from '/src/assets/logo.png';

const Topbar = ({ onNew, searchTerm, onSearchChange }) => {
  const [searchVisible, setSearchVisible] = useState(false);

  return (
    <header className="bg-gray-900 shadow-md z-10">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-28">
          {/* Sección del Logo */}
          <div className="flex items-center">
            <div className="bg-white p-1 rounded-md flex items-center justify-center">
              <img
                className="h-10 w-10 md:h-24 md:w-24"
                src={logo}
                alt="Lighthouse Logo"
              />
            </div>
          </div>

          {/* Sección Central: Búsqueda — visible siempre en desktop, togglable en mobile */}
          <div className={`flex-1 flex justify-center px-2 lg:ml-6 lg:justify-center ${searchVisible ? '' : 'hidden md:flex'}`}>
            <div className="w-full max-w-lg lg:max-w-xs">
              <label htmlFor="search" className="sr-only">
                Buscar
              </label>
              <div className="relative text-gray-400 focus-within:text-white">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  id="search"
                  className="block w-full bg-gray-700 py-2 pl-10 pr-3 border border-transparent rounded-md leading-5 text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-gray-600 focus:border-white focus:placeholder-gray-300 focus:text-white text-sm"
                  placeholder="Buscar..."
                  type="search"
                  name="search"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => { if (!searchTerm) setSearchVisible(false); }}
                  autoFocus={searchVisible}
                />
              </div>
            </div>
          </div>

          {/* Sección Derecha: Acciones */}
          <div className="flex items-center gap-2">
            {/* Search toggle button — mobile only */}
            {!searchVisible && (
              <button
                onClick={() => setSearchVisible(true)}
                className="md:hidden bg-gray-700 hover:bg-gray-600 text-gray-300 p-2 rounded-lg transition"
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onNew}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 md:px-4 rounded-lg transition duration-300 text-sm md:text-base whitespace-nowrap"
            >
              <span className="hidden sm:inline">+ Nuevo Lead</span>
              <span className="sm:hidden">+ Nuevo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
