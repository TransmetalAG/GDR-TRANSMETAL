import React from "react";
import {
  Shield,
  ClipboardList,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export default function EvaluacionConocimientos({
  onSeleccionarModulo,
}) {
  const modulos = [
    {
      id: "seguridad",
      titulo: "Seguridad Industrial",
      descripcion:
        "Evaluación sobre normas, riesgos, EPP y procedimientos de seguridad.",
      icono: Shield,
      disponible: true,
      color: "bg-red-50 border-red-200 text-red-700",
    },
    {
      id: "estandares",
      titulo: "Estándares",
      descripcion:
        "Evaluación sobre estándares de operación y procesos.",
      icono: ClipboardList,
      disponible: false,
      color: "bg-blue-50 border-blue-200 text-blue-700",
    },
    {
      id: "5s",
      titulo: "5S",
      descripcion:
        "Evaluación sobre clasificación, orden, limpieza y disciplina.",
      icono: Sparkles,
      disponible: false,
      color: "bg-green-50 border-green-200 text-green-700",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Evaluación de Conocimientos
        </h1>

        <p className="text-gray-600 mt-2">
          Seleccione el área que desea evaluar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {modulos.map((modulo) => {
          const Icono = modulo.icono;

          return (
            <button
              key={modulo.id}
              disabled={!modulo.disponible}
              onClick={() =>
                modulo.disponible &&
                onSeleccionarModulo(modulo.id)
              }
              className={`
                text-left rounded-2xl border-2 p-6 transition-all duration-200
                ${
                  modulo.disponible
                    ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }
                ${modulo.color}
              `}
            >
              <div className="flex items-center justify-between mb-5">
                <Icono size={42} />
                {modulo.disponible ? (
                  <ChevronRight size={26} />
                ) : (
                  <span className="text-xs font-semibold bg-white px-3 py-1 rounded-full">
                    Próximamente
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold mb-2">
                {modulo.titulo}
              </h2>

              <p className="text-sm leading-relaxed">
                {modulo.descripcion}
              </p>
            </button>
          );
        })}

      </div>
    </div>
  );
}
