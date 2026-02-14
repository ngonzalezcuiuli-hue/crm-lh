import React, { useState } from 'react';

// Este es el modal que se mostrará si el usuario no tiene un nombre de perfil.
export default function ProfileNameModal({ open, onSave }) {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nombre.trim()) {
      setLoading(true);
      onSave(nombre.trim());
      // No cerramos el modal aquí, esperamos a que el guardado sea exitoso en el componente padre.
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-center">Bienvenido/a</h2>
        <p className="text-sm text-center text-gray-600">
          Para personalizar tu experiencia, por favor, ingresa tu nombre.
        </p>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="profile-nombre" className="text-sm font-medium text-gray-700">Nombre</label>
            <input
              id="profile-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="Tu nombre y apellido"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Guardando..." : "Guardar Nombre"}
          </button>
        </form>
      </div>
    </div>
  );
}
