"use client";

import { useState } from "react";

export default function BlockchainProofHeading() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-gray-800">Prueba Blockchain</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Que significa Prueba Blockchain"
          className="text-gray-400 hover:text-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="blockchain-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h2
                id="blockchain-modal-title"
                className="text-base font-semibold text-gray-900"
              >
                ¿Que significa esto?
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Este certificado esta registrado de forma permanente en una
              blockchain publica. Esto significa que:
            </p>

            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Nadie puede falsificarlo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Nadie puede borrarlo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Cualquier persona puede verificarlo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Es tuyo para siempre</span>
              </li>
            </ul>

            <p className="text-xs text-gray-500 leading-relaxed">
              El codigo QR y el enlace de verificacion siempre mostraran si este
              certificado es valido o no.
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-brand-600 text-white text-sm font-medium py-2 hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
