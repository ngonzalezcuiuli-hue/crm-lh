// src/hooks/useAuth.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { connectToExtension, initializeExtensionBridge } from "../utils/extensionBridge";

// Valor por defecto seguro (no rompe si alguien usa el hook fuera del provider)
const defaultValue = { user: null, loading: true, db: null };

// Context
export const AuthContext = createContext(defaultValue);

// Provider (NO usa useAuth adentro → evita ciclos)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inicializar bridge al montar (solo una vez)
  useEffect(() => {
    initializeExtensionBridge();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setLoading(false);

      // Conectar con extensión de Chrome si hay usuario
      if (u) {
        try {
          const token = await u.getIdToken();
          connectToExtension(u, token);
        } catch (error) {
          console.log('ℹ️ No se pudo conectar con extensión:', error.message);
        }
      }
    });
    return () => unsub();
  }, []);

  const value = { user, loading, db };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook de consumo
export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultValue;
}

// Alias por compatibilidad
export const useAuthContext = useAuth;

// Default export para imports tipo: import useAuth from "/src/hooks/useAuth"
export default useAuth;
