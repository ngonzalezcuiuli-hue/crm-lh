import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import { AuthProvider } from './hooks/useAuth.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  // ¡ELIMINADO! Esto solucionará el error con react-beautiful-dnd.
  <AuthProvider>
    <App />
  </AuthProvider>
);