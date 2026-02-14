export function makeMockLeads() {
  return {
    "Primer Contacto": [
      { id: "l1", nombre: "Juan Perez", numeroTramite: "JP-12345", origenDato: "Web", etapaHistorial: [{ etapa: "Primer Contacto", fechaEntrada: Date.now() - 2 * 3600 * 1000 }] }
    ],
    "Segundo Contacto": [],
    "Cotización": [],
    "Seguimiento": [],
    "Cierre": []
  };
}
