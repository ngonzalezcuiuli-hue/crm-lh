// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { auth } from "../services/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile // 1. Importamos la función 'updateProfile'
} from "firebase/auth";

export default function LoginPage() {
  // 2. Añadimos un estado para el nombre y otro para controlar el modo (login/register)
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false); // Para mostrar/ocultar el campo de nombre
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Modificamos la función de registro
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!nombre) { // Validamos que el nombre no esté vacío
      setError("Por favor, ingresa tu nombre para registrarte.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Creamos el usuario
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // ¡LA CLAVE! Actualizamos el perfil del usuario recién creado con su nombre
      await updateProfile(userCredential.user, {
        displayName: nombre
      });

    } catch (err) {
      setError("No se pudo registrar. La contraseña debe tener al menos 6 caracteres.");
    } finally {
      setLoading(false);
    }
  };
  
  // Función para manejar el envío del formulario dependiendo del modo
  const handleSubmit = (e) => {
    if (isRegistering) {
      handleRegister(e);
    } else {
      handleLogin(e);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">
          {isRegistering ? "Crear una Cuenta" : "Iniciar Sesión en tu CRM"}
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* 4. El campo de nombre solo aparece si estamos en modo registro */}
          {isRegistering && (
            <div>
              <label htmlFor="nombre" className="text-sm font-medium text-gray-700">Nombre</label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {error && <p className="text-sm text-center text-red-600">{error}</p>}
          
          {/* 5. Botones dinámicos */}
          <div className="flex flex-col space-y-4">
             <button type="submit" disabled={loading} className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? "Cargando..." : (isRegistering ? "Registrarse" : "Iniciar Sesión")}
            </button>
            
            <button 
              type="button" 
              onClick={() => setIsRegistering(!isRegistering)} 
              className="w-full text-sm text-center text-blue-600 hover:underline"
            >
              {isRegistering ? "¿Ya tienes una cuenta? Inicia Sesión" : "¿No tienes una cuenta? Regístrate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
