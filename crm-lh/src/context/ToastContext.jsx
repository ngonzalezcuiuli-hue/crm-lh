import React, { createContext, useState, useCallback, useContext } from 'react';

// Creamos el contexto que compartirá la función de notificación
const ToastContext = createContext();

// Componente proveedor que envolverá toda nuestra aplicación
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Función para añadir una nueva notificación a la lista
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now(); // ID único para cada toast
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    
    // Hacemos que la notificación se elimine sola después de 5 segundos
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Este es el contenedor donde aparecerán las notificaciones */}
      <div className="fixed top-5 right-5 z-[100] space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Hook personalizado para acceder fácilmente a la función `showToast`
export const useToast = () => useContext(ToastContext);

// Componente que define el estilo visual de cada notificación
const Toast = ({ message, type }) => {
  const baseClasses = "max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden p-4 text-white";
  // Definimos colores para cada tipo de notificación
  const typeClasses = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type] || typeClasses.info}`}>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};
