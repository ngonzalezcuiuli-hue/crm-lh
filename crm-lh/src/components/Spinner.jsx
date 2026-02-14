import React from "react";

export default function Spinner() {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <div
        className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"
        role="status"
      ></div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}