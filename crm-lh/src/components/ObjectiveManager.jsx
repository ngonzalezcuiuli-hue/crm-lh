import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { DollarSign, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from './Spinner.jsx';
import useAuth from '../hooks/useAuth';

const ObjectiveManager = ({ onClose }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [historicalData, setHistoricalData] = useState([]);

  const currentMonthStr = currentDate.toISOString().slice(0, 7);
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  // Cargar objetivo del mes actual
  useEffect(() => {
    loadObjective();
    loadHistoricalData();
  }, [currentDate, user?.uid]);

  const loadObjective = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const metaDocRef = doc(db, `users/${user.uid}/metas`, currentMonthStr);
      const metaDocSnap = await getDoc(metaDocRef);
      if (metaDocSnap.exists()) {
        setObjective(metaDocSnap.data().objetivo.toString());
      } else {
        setObjective('');
      }
      setMessage('');
    } catch (error) {
      setMessage(`Error al cargar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    if (!user?.uid) return;

    try {
      const metasRef = collection(db, `users/${user.uid}/metas`);
      const snapshot = await getDocs(metasRef);
      const data = snapshot.docs
        .map(doc => ({
          id: doc.id,
          objetivo: doc.data().objetivo,
        }))
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 12);
      setHistoricalData(data);
    } catch (error) {
      console.error('Error cargando histórico:', error);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      setMessage('⚠️ Usuario no autenticado');
      return;
    }

    const trimmed = objective.trim();
    const numericValue = parseFloat(trimmed);

    if (!trimmed || isNaN(numericValue) || numericValue <= 0) {
      setMessage('⚠️ Ingresa un valor numérico válido mayor a 0');
      return;
    }

    setSaving(true);
    try {
      const metaDocRef = doc(db, `users/${user.uid}/metas`, currentMonthStr);
      await setDoc(metaDocRef, {
        objetivo: numericValue,
        updatedAt: new Date(),
      });
      setMessage('✅ Objetivo guardado exitosamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const calculateMonthlyIncrease = (prevObjective) => {
    const currentObj = parseFloat(objective) || 0;
    const prevObj = parseFloat(prevObjective) || 0;
    if (prevObj === 0) return 0;
    return (((currentObj - prevObj) / prevObj) * 100).toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign size={28} />
              Gestionar Objetivos Mensuales
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-800 rounded-lg transition"
              title="Cerrar"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Selector de Mes */}
          <div className="bg-slate-50 p-6 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-full hover:bg-slate-200 transition"
              >
                <ChevronLeft className="h-6 w-6 text-slate-600" />
              </button>
              <h3 className="text-2xl font-bold text-slate-800 capitalize w-48 text-center">
                {monthName}
              </h3>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-full hover:bg-slate-200 transition"
              >
                <ChevronRight className="h-6 w-6 text-slate-600" />
              </button>
            </div>

            {/* Input de Objetivo */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Objetivo Comercial
              </label>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-3 text-xl text-slate-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Ingresa el objetivo"
                      className="w-full pl-8 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition text-lg text-slate-900"
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {saving ? <Spinner /> : <Check size={20} />}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}

              {/* Mensaje de estado */}
              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.includes('✅') ? 'bg-green-50 text-green-700' :
                  message.includes('⚠️') ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* Histórico de Objetivos */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-slate-800">Histórico de Últimos 12 Meses</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {historicalData.length > 0 ? (
                historicalData.map((item, index) => {
                  const nextItem = historicalData[index + 1];
                  const increase = nextItem ? calculateMonthlyIncrease(nextItem.objetivo) : 0;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border-2 transition ${
                        item.id === currentMonthStr
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-600 capitalize mb-1">
                        {new Date(item.id + '-01').toLocaleString('es-ES', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(
                          item.objetivo
                        )}
                      </p>
                      {nextItem && increase !== 0 && (
                        <p className={`text-xs mt-2 font-semibold ${
                          increase > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {increase > 0 ? '📈' : '📉'} {increase}% vs anterior
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-500 col-span-full text-center py-8">
                  No hay datos históricos
                </p>
              )}
            </div>
          </div>

          {/* Info Útil */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> Los objetivos se cargan en tiempo real en el Dashboard.
              Si estableces un objetivo, aparecerá inmediatamente en la métrica "Objetivo Comercial".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectiveManager;
