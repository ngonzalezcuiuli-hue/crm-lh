import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthContext } from '../hooks/useAuth.jsx';

export default function ProfileModal({ open, onClose, isFirstTime = false }) {
  const { user } = useAuthContext();
  const [nombre, setNombre] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!open || !user) return;
    setSaved(false);
    setPhoneError('');
    setNombre(user.displayName || '');
    setFetching(true);
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) setPhone(snap.data().phoneNumber || '');
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [open, user]);

  const validatePhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (value && (digits.length < 8 || digits.length > 15)) {
      return 'Ingresá un número válido (ej: 1165841464 o +5491165841464)';
    }
    return '';
  };

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    setPhoneError(validatePhone(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    if (!nombre.trim()) return;

    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: nombre.trim() });
      await setDoc(doc(db, 'users', user.uid), { phoneNumber: phone.trim() }, { merge: true });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        if (isFirstTime) window.location.reload();
        else onClose();
      }, 1200);
    } catch (error) {
      console.error('Error al guardar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-full max-w-sm p-8 space-y-5 bg-white rounded-lg shadow-xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isFirstTime ? 'Bienvenido/a' : 'Mi Perfil'}
          </h2>
          {isFirstTime && (
            <p className="text-sm text-gray-500 mt-1">
              Completá tu perfil para personalizar tu experiencia.
            </p>
          )}
        </div>

        {fetching ? (
          <div className="text-center py-4 text-gray-400 text-sm">Cargando...</div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre y apellido
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tu nombre y apellido"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tu número de WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  phoneError ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="ej: 1165841464"
              />
              {phoneError && (
                <p className="mt-1 text-xs text-red-500">{phoneError}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Se usa para identificarte como asesor en los mensajes de WhatsApp.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              {!isFirstTime && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium text-sm"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !!phoneError}
                className="flex-1 px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                {loading ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
