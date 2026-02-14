import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
// Import utilities from Firebase Storage to fetch PDFs dynamically
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

// --- MAPA DE PLANES Y SUS FOLLETOS ---
// En vez de almacenar URLs completas con tokens, guardamos únicamente el nombre del
// archivo PDF para cada plan. De este modo, al reemplazar un folleto en Firebase Storage
// con el mismo nombre, la aplicación no necesita ser actualizada. La URL de descarga
// se obtendrá dinámicamente en tiempo de ejecución mediante getDownloadURL().
const planFiles = {
  S1: 'S1.pdf',
  S2: 'S2.pdf',
  SMG02: 'SMG02.pdf',
  SMG20: 'SMG20.pdf',
  SMG30: 'SMG30.pdf',
  SMG40: 'SMG40.pdf',
  SMG50: 'SMG50.pdf',
  SMG60: 'SMG60.pdf',
  SMG70: 'SMG70.pdf',
};

const ageGroupMap = { "Hasta 35 años": "Hasta 35 años", "36 a 40 años": "36 a 40 años", "41 a 45 años": "41 a 45 años", "46 a 50 años": "46 a 50 años", "51 a 55 años": "51 a 55 años", "56 a 60 años": "56 a 60 años", "Desde 61 años": "Desde 61 años", "1er Hijo": "1er Hijo", "Hijo Adicional": "Hijo Adicional" };
const opcionesDescuento = ["0%", "15%", "25%", "50%"];

export default function Cotizador({ onQuoteResult, initialMembers, leadName }) {
    
    const downloadName = typeof leadName === 'string' ? leadName : leadName?.nombre || 'cotizacion';
    const displayName = typeof leadName === 'string' ? leadName : leadName?.nombre || 'Cliente';

    const [listaDePrecios, setListaDePrecios] = useState(null);
    const [cargandoPrecios, setCargandoPrecios] = useState(true);
    const [errorPrecios, setErrorPrecios] = useState(null);

    const [zona, setZona] = useState("AMBA");
    const [tipoPlan, setTipoPlan] = useState("Directo");
    const [planSeleccionado, setPlanSeleccionado] = useState("");
    const [miembros, setMiembros] = useState(initialMembers || [{ id: Date.now(), ageGroup: "Hasta 35 años", discount: "0%" }]);
    const [sueldoBruto, setSueldoBruto] = useState('');
    const [sueldoBruto2, setSueldoBruto2] = useState('');
    const [showSueldoBruto2, setShowSueldoBruto2] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // --- Estilos unificados para inputs y selects ---
    const formElementClasses = "block w-full p-2.5 mt-1 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-primary focus:border-primary";

    useEffect(() => {
        const fetchPrices = async () => {
            setCargandoPrecios(true);
            setErrorPrecios(null);
            try {
                const docRef = doc(db, "precios", "listaDePrecios");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setListaDePrecios(JSON.parse(docSnap.data().data));
                } else {
                    setErrorPrecios("No se encontró el documento de precios.");
                }
            } catch (e) {
                setErrorPrecios("Error al cargar la lista de precios.");
                console.error("Error al cargar precios:", e);
            } finally {
                setCargandoPrecios(false);
            }
        };
        fetchPrices();
    }, []);

    const zonasDisponibles = listaDePrecios ? Object.keys(listaDePrecios) : [];
    const tiposDePlanDisponibles = listaDePrecios && listaDePrecios[zona] ? Object.keys(listaDePrecios[zona]) : [];
    const planesDisponibles = listaDePrecios && listaDePrecios[zona] && listaDePrecios[zona][tipoPlan] ? Object.keys(listaDePrecios[zona][tipoPlan]) : [];

    useEffect(() => {
        if (tiposDePlanDisponibles.length > 0 && !tiposDePlanDisponibles.includes(tipoPlan)) {
            setTipoPlan(tiposDePlanDisponibles[0]);
        }
    }, [zona, tiposDePlanDisponibles, tipoPlan]);

    useEffect(() => {
        if (planesDisponibles.length > 0 && !planesDisponibles.includes(planSeleccionado)) {
            setPlanSeleccionado(planesDisponibles[0]);
        }
    }, [tipoPlan, planesDisponibles, planSeleccionado]);

    const handleAddMember = () => {
        const newMember = { id: Date.now(), ageGroup: "Hasta 35 años", discount: "0%" };
        setMiembros(prevMiembros => [...prevMiembros, newMember]);
    };
    
    const handleRemoveMember = (idToRemove) => {
        setMiembros(prevMiembros => prevMiembros.filter(m => m.id !== idToRemove));
    };

    const handleMemberChange = (id, field, value) => {
        setMiembros(prevMiembros => 
            prevMiembros.map(m => m.id === id ? { ...m, [field]: value } : m)
        );
    };

    const handleSueldoBrutoChange = (e, field) => {
        const { value } = e.target;
        const sanitizedValue = value.replace(/[^0-9]/g, '');
        if (field === 1) {
            setSueldoBruto(sanitizedValue);
        } else {
            setSueldoBruto2(sanitizedValue);
        }
    };

    const calcularCotizacion = () => {
        if (!listaDePrecios) { alert("La lista de precios no está cargada."); return; }
        const planPrices = listaDePrecios[zona]?.[tipoPlan]?.[planSeleccionado];
        if (!planPrices) { alert("No se encontraron precios para la selección."); return; }

        let totalPlan = 0, totalDescuentoComercial = 0, firstChildAdded = false;
        const descuentosAplicados = new Set();
        
        miembros.forEach(miembro => {
            let ageKey = miembro.ageGroup;
            if (ageKey === "1er Hijo") {
                ageKey = !firstChildAdded ? "1er Hijo" : "Hijo Adicional";
                if(ageKey === "1er Hijo") firstChildAdded = true;
            }
            const basePrice = planPrices[ageKey] || 0;
            totalPlan += basePrice;
            if (parseFloat(miembro.discount) > 0) {
                totalDescuentoComercial += basePrice * (parseFloat(miembro.discount) / 100);
                descuentosAplicados.add(miembro.discount);
            }
        });

        const subtotal = totalPlan - totalDescuentoComercial;
        let descuentoAportes = 0;
        let iva = 0;

        const sueldoNumerico1 = parseFloat(sueldoBruto) || 0;
        const sueldoNumerico2 = parseFloat(sueldoBruto2) || 0;

        if (tipoPlan === 'Derivacion directa' && (sueldoNumerico1 > 0 || sueldoNumerico2 > 0)) {
            const aportes1 = sueldoNumerico1 * 0.0765;
            const aportes2 = sueldoNumerico2 * 0.0765;
            descuentoAportes = aportes1 + aportes2;
        } else if (tipoPlan === 'Directo') {
            iva = subtotal * 0.105;
        }

        const valorFinalSocio = subtotal - descuentoAportes + iva;
        const valorForecast = subtotal;

        const resultadoData = { 
            plan: planSeleccionado, 
            valorPlan: totalPlan, 
            descuentoComercial: totalDescuentoComercial, 
            descuentoAportes, 
            iva,
            valorFinalSocio, 
            valorForecast, 
            cantidadIntegrantes: miembros.length, 
            miembros: miembros,
            descuentosAplicados: Array.from(descuentosAplicados)
        };
        
        setResultado(resultadoData);
        onQuoteResult(resultadoData);
    };
    
    const generarPDFCombinado = async () => {
        const node = document.getElementById('seccion-resultado-captura');
        if (!node || !resultado) return;

        setIsGeneratingPdf(true);
        node.scrollIntoView({ behavior: 'auto', block: 'start' });

        setTimeout(async () => {
            try {
                const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                const quoteImageBytes = await fetch(canvas.toDataURL('image/png')).then(res => res.arrayBuffer());

                const pdfDoc = await PDFDocument.create();
                const quoteImage = await pdfDoc.embedPng(quoteImageBytes);

                const STANDARD_WIDTH = 595;
                
                const imageScaleFactor = STANDARD_WIDTH / quoteImage.width;
                const scaledImageHeight = quoteImage.height * imageScaleFactor;

                const quotePage = pdfDoc.addPage([STANDARD_WIDTH, scaledImageHeight]);
                quotePage.drawImage(quoteImage, { x: 0, y: 0, width: STANDARD_WIDTH, height: scaledImageHeight });

                // Obtener el folleto correspondiente al plan seleccionado. Se resuelve la URL
                // de forma dinámica con Firebase Storage para evitar problemas de tokens caducos.
                // Normalizamos el código de plan eliminando espacios y obteniendo su nombre de archivo
                const planKey = (resultado.plan || '').replace(/\s+/g, '');
                const fileName = planFiles[planKey];
                if (fileName) {
                    try {
                        // Aseguramos que Storage use la misma app que Firestore
                        const storage = getStorage(db.app);
                        const fileRef = ref(storage, fileName);
                        const brochureUrl = await getDownloadURL(fileRef);
                        const existingPdfBytes = await fetch(brochureUrl).then(res => res.arrayBuffer());
                        const brochurePdf = await PDFDocument.load(existingPdfBytes);
                        
                        const brochurePages = brochurePdf.getPages();
                        for (const originalPage of brochurePages) {
                            const { width, height } = originalPage.getSize();
                            const scale = STANDARD_WIDTH / width;
                            const scaledHeight = height * scale;

                            const newPage = pdfDoc.addPage([STANDARD_WIDTH, scaledHeight]);
                            const embeddedPage = await pdfDoc.embedPage(originalPage);
                            newPage.drawPage(embeddedPage, { x: 0, y: 0, width: STANDARD_WIDTH, height: scaledHeight });
                        }
                    } catch (brochureError) {
                        console.error('Error al obtener o procesar el folleto:', brochureError);
                    }
                }

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `cotizacion-${downloadName.replace(/\s+/g, '_')}-${resultado.plan}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

            } catch (error) {
                console.error("Error al generar el PDF:", error);
                alert("Hubo un error al generar el PDF. Si el problema persiste, puede ser un error de CORS.");
            } finally {
                setIsGeneratingPdf(false);
            }
        }, 250);
    };

    const formatCurrency = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
    
    return (
        <div className="p-4 bg-white rounded-lg border space-y-6">
            {cargandoPrecios && <p className="text-center text-gray-500">Cargando...</p>}
            {errorPrecios && <p className="text-center text-red-500">{errorPrecios}</p>}
            {!cargandoPrecios && !errorPrecios && listaDePrecios && (
                <>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Zona</label>
                            <select value={zona} onChange={(e) => setZona(e.target.value)} className={formElementClasses}>
                                {zonasDisponibles.map(z => <option key={z} value={z}>{z}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Tipo de Socio</label>
                            <select value={tipoPlan} onChange={(e) => setTipoPlan(e.target.value)} className={formElementClasses}>
                                {tiposDePlanDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Plan</label>
                            <select value={planSeleccionado} onChange={(e) => setPlanSeleccionado(e.target.value)} className={formElementClasses} disabled={planesDisponibles.length === 0}>
                                {planesDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        {tipoPlan === 'Derivacion directa' && (
                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Sueldo Bruto</label>
                                    <input 
                                        type="text" 
                                        pattern="[0-9]*"
                                        value={sueldoBruto} 
                                        onChange={(e) => handleSueldoBrutoChange(e, 1)} 
                                        className={formElementClasses} 
                                        placeholder="Ingrese solo números"
                                    />
                                </div>
                                {showSueldoBruto2 ? (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Sueldo Bruto 2</label>
                                        <div className="flex items-center">
                                            <input 
                                                type="text" 
                                                pattern="[0-9]*"
                                                value={sueldoBruto2} 
                                                onChange={(e) => handleSueldoBrutoChange(e, 2)} 
                                                className={formElementClasses} 
                                                placeholder="Ingrese solo números"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => { setShowSueldoBruto2(false); setSueldoBruto2(''); }} 
                                                className="ml-2 text-red-500 hover:bg-red-100 rounded-full p-1 focus:outline-none"
                                                aria-label="Eliminar segundo sueldo"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 R 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={() => setShowSueldoBruto2(true)}
                                        className="w-full bg-blue-100 text-blue-800 text-sm font-semibold p-2 rounded mt-1 h-fit hover:bg-blue-200"
                                    >
                                        + Agregar otro sueldo
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold">Integrantes</h3>
                        {miembros.map((miembro, index) => (
                            <div key={miembro.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-white p-3 rounded-md border">
                                <div className="sm:col-span-2">
                                    <label className="text-sm">Miembro {index + 1}</label>
                                    <select className={formElementClasses} value={miembro.ageGroup} onChange={(e) => handleMemberChange(miembro.id, "ageGroup", e.target.value)}>
                                        {Object.keys(ageGroupMap).map((key) => <option key={key} value={key}>{ageGroupMap[key]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm">Descuento</label>
                                    <select className={formElementClasses} value={miembro.discount} onChange={(e) => handleMemberChange(miembro.id, "discount", e.target.value)}>
                                        {opcionesDescuento.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                {miembros.length > 1 && (
                                    <div className="sm:col-span-3">
                                        <button type="button" onClick={() => handleRemoveMember(miembro.id)} className="w-full text-sm bg-red-500 text-white rounded py-1">Eliminar</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={handleAddMember} className="w-full bg-gray-200 text-gray-700 rounded py-2 mt-2">Agregar Integrante</button>
                    </div>
                    
                    {resultado && (
                        <div>
                            <div id="seccion-resultado-captura" className="p-6 bg-white border border-gray-200 rounded-lg">
                                <div className="text-center mb-4 pb-2 border-b-2 border-dotted">
                                    <h2 className="text-2xl font-bold text-gray-800">{displayName}</h2>
                                </div>
                                <div className="space-y-3 border-t border-b py-4 my-4">
                                    {/* CAMBIOS A CONTINUACIÓN */}
                                    <div className="flex justify-between items-center bg-gray-100 p-2 rounded-md"><span className="font-semibold text-gray-800 uppercase text-sm">Plan:</span><span className="text-lg font-bold text-gray-800">{resultado.plan}</span></div>
                                    <div className="flex justify-between items-center p-2"><span className="text-gray-800">Grupo Familiar:</span><span className="font-semibold text-gray-800">{resultado.cantidadIntegrantes} Integrante(s)</span></div>
                                    <div className="flex justify-between items-center p-2"><span className="text-gray-800">Zona:</span><span className="font-semibold text-gray-800">{zona}</span></div>
                                    <div className="flex justify-between items-center p-2"><span className="text-gray-800">Valor de Lista:</span><span className="font-semibold text-gray-800">{formatCurrency(resultado.valorPlan)}</span></div>
                                    <div className="flex justify-between items-center p-2"><span className="text-gray-800">Descuento Comercial:</span><span className="font-semibold text-red-600">- {formatCurrency(resultado.descuentoComercial)}</span></div>
                                    <div className="flex justify-between items-center p-2"><span className="text-gray-800">Aportes a Descontar:</span><span className="font-semibold text-red-600">- {formatCurrency(resultado.descuentoAportes)}</span></div>
                                    {resultado.iva > 0 && <div className="flex justify-between items-center p-2"><span className="text-gray-800">IVA (10.5%):</span><span className="font-semibold text-gray-800">+ {formatCurrency(resultado.iva)}</span></div>}
                                </div>
                                <div className="flex justify-between items-center mt-4 bg-gray-800 text-white p-3 rounded-md">
                                    <span className="text-lg font-bold">TOTAL</span>
                                    <span className="text-2xl font-bold">{formatCurrency(resultado.valorFinalSocio)}</span>
                                </div>
                                <div className="mt-6 text-[10px] text-gray-500 space-y-1">
                                    <p>Los Datos exhibidos en el siguiente reporte son una aproximación de los valores finales, puede variar por ajuste de precios o dependiendo de la fidelidad de los datos brindados al Cotizador.</p>
                                    <p>*Los precios mencionados corresponden a la fecha de: {new Date().toLocaleDateString('es-AR')}</p>
                                </div>
                                {resultado.descuentosAplicados.length > 0 && (
                                    <div className="mt-4 pt-2 border-t text-[10px] text-gray-600">
                                        <h5 className="font-semibold mb-1">Condiciones de Descuentos Aplicados:</h5>
                                        {resultado.descuentosAplicados.includes("15%") && <p>* Descuento del 15% aplicable por 12 meses sobre el valor de lista del integrante.</p>}
                                        {resultado.descuentosAplicados.includes("25%") && <p>* Descuento del 25% aplicable por 12 meses sobre el valor de lista del integrante.</p>}
                                        {resultado.descuentosAplicados.includes("50%") && <p>* Descuento del 50% aplicable por 12 meses sobre el valor de lista del integrante.</p>}
                                    </div>
                                )}
                            </div>
                            <button 
                                id="download-button"
                                type="button" 
                                onClick={generarPDFCombinado} 
                                className="w-full mt-4 bg-green-600 text-white font-bold rounded py-3 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                disabled={isGeneratingPdf}
                            >
                                {isGeneratingPdf ? 'Generando...' : 'Descargar Cotización (PDF)'}
                            </button>
                        </div>
                    )}

                    <button type="button" onClick={calcularCotizacion} className="w-full bg-blue-600 text-white font-bold rounded py-3">
                        Calcular y Aplicar Cotización
                    </button>
                </>
            )}
        </div>
    );
}

