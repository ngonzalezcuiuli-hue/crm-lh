import { hoursSince } from "./dateUtils";

export function leadColorByStage(stage, fechaEntrada) {
  const hours = hoursSince(fechaEntrada);

  const rules = {
    "Primer Contacto": hours <= 6 ? "bg-green-100" : hours <= 12 ? "bg-yellow-100" : "bg-red-100",
    "Segundo Contacto": hours <= 24 ? "bg-green-100" : hours <= 48 ? "bg-yellow-100" : "bg-red-100",
    "Cotización": "bg-green-100",
    "Seguimiento": hours <= 48 ? "bg-green-100" : hours <= 72 ? "bg-yellow-100" : "bg-red-100",
    "Cierre": hours <= 48 ? "bg-green-100" : hours <= 72 ? "bg-yellow-100" : "bg-red-100"
  };

  return rules[stage] || "bg-white";
}
