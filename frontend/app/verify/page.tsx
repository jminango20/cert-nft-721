"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyPage() {
  const [tokenId, setTokenId] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tokenId) router.push(`/verify/${tokenId}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Link href="/" className="text-sm text-brand-600 hover:underline mb-4 block">
          Inicio
        </Link>

        <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔍</div>
            <h1 className="text-2xl font-bold text-gray-800">Verificar Certificado</h1>
            <p className="text-sm text-gray-500 mt-1">
              Introduce el Token ID para verificar la autenticidad
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="number"
              min="1"
              placeholder="Token ID (ej: 42)"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Verificar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
