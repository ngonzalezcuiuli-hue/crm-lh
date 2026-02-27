// src/utils/exportLeads.js
// Utilidad centralizada para exportar leads en formato compatible con Nexo CRM
import Papa from 'papaparse';

const normalizeText = (s) => (s ?? '').toString().trim();

const resolveProvinciaLocalidad = (lead) => {
    const provincia = lead?.zona?.provincia || lead?.provincia || '';
    const localidad = lead?.zona?.localidad || lead?.localidad || '';
    return { provincia: normalizeText(provincia), localidad: normalizeText(localidad) };
};

const resolveInfoAdicional = (lead) => {
    const info = lead?.infoAdicional || {};
    const members = lead?.cotizacionMiembros || [];

    let edadesFinal = normalizeText(info.edades);
    if (!edadesFinal && Array.isArray(members) && members.length > 0) {
        edadesFinal = members.map(m => m.ageGroup).filter(Boolean).join(', ');
    }

    return {
        cantidadIntegrantes: normalizeText(info.cantidadIntegrantes ?? lead?.cantidadIntegrantes),
        edades: edadesFinal,
        cuil: normalizeText(info.cuil ?? lead?.cuil),
        cuitEmpleador: normalizeText(info.cuitEmpleador ?? lead?.cuitEmpleador),
        obraSocial: normalizeText(info.obraSocial ?? lead?.obraSocial),
        observaciones: normalizeText(info.observaciones ?? lead?.observaciones),
    };
};

const resolveInfoCotizacion = (lead) => {
    const cot = lead?.infoCotizacion || {};
    return {
        plan: normalizeText(cot.plan),
        valorPlan: cot.valorPlan ?? '',
        descuentoAportes: cot.descuentoAportes ?? '',
        descuentoComercial: cot.descuentoComercial ?? '',
        iva: cot.iva ?? '',
        valorFinalSocio: cot.valorFinalSocio ?? '',
        valorForecast: cot.valorForecast ?? '',
        observacionesCotizacion: normalizeText(cot.observaciones),
    };
};

const formatPhoneForWhatsAppAR = (input) => {
    if (!input) return '';
    let d = String(input).replace(/\D/g, '');
    if (d.startsWith('54')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    let m;
    if ((m = d.match(/^(\d{4})15(\d+)$/))) d = m[1] + m[2];
    else if ((m = d.match(/^(\d{3})15(\d+)$/))) d = m[1] + m[2];
    else if ((m = d.match(/^(\d{2})15(\d+)$/))) d = m[1] + m[2];
    return "'" + '549' + d;
};

const resolveUltimaEtapa = (lead) => {
    const historial = lead?.etapaHistorial;
    if (Array.isArray(historial) && historial.length > 0) {
        const idx = historial.length >= 2 ? historial.length - 2 : 0;
        return normalizeText(historial[idx]?.etapa);
    }
    return normalizeText(lead?.etapa);
};

/**
 * Construye las filas de exportación con TODAS las columnas compatibles con Nexo CRM.
 * @param {Array} leadsArray - Array de leads (raw data de Firebase)
 * @returns {Array} - Array de objetos planos listos para PapaParse
 */
export const buildNexoExportRows = (leadsArray) => {
    return leadsArray.map((lead) => {
        const { provincia, localidad } = resolveProvinciaLocalidad(lead);
        const info = resolveInfoAdicional(lead);
        const cot = resolveInfoCotizacion(lead);

        return {
            'NOMBRE': normalizeText(lead?.nombre),
            'DNI': normalizeText(lead?.dni),
            'CELULAR': formatPhoneForWhatsAppAR(lead?.celular),
            'MAIL': normalizeText(lead?.mail),
            'PROVINCIA': provincia,
            'LOCALIDAD': localidad,
            'NUMERO_TRAMITE': normalizeText(lead?.numeroTramite),
            'ORIGEN_DATO': normalizeText(lead?.origenDato),
            'CANTIDAD_INTEGRANTES': info.cantidadIntegrantes,
            'EDADES': info.edades,
            'CUIL': info.cuil,
            'CUIT_EMPLEADOR': info.cuitEmpleador,
            'OBRA_SOCIAL': info.obraSocial,
            'OBSERVACIONES': info.observaciones,
            'PLAN': cot.plan,
            'VALOR_PLAN': cot.valorPlan,
            'DESCUENTO_APORTES': cot.descuentoAportes,
            'DESCUENTO_COMERCIAL': cot.descuentoComercial,
            'IVA': cot.iva,
            'VALOR_FINAL_SOCIO': cot.valorFinalSocio,
            'VALOR_FORECAST': cot.valorForecast,
            'OBSERVACIONES_COTIZACION': cot.observacionesCotizacion,
            'ETAPA': normalizeText(lead?.estado === 'Perdido' ? resolveUltimaEtapa(lead) : lead?.etapa),
            'NIVEL_INTERES': lead?.interestLevel ?? lead?.nivelInteres ?? 0,
            'RAZON_PERDIDA': normalizeText(lead?.razonPerdida),
        };
    });
};

/**
 * Descarga un CSV con los datos proporcionados.
 * @param {Array} rows - Filas de datos
 * @param {string} filenameBase - Nombre base del archivo (sin extensión)
 */
export const downloadCSV = (rows, filenameBase) => {
    const csv = Papa.unparse(rows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${filenameBase}_${fecha}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
