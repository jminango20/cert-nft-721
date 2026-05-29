"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function PrivyButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return <div className="text-sm text-gray-400">Cargando...</div>;
  }

  if (authenticated && user) {
    const displayName = user.email?.address ?? "Conectado";
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{displayName}</span>
        <button
          onClick={logout}
          className="text-sm text-red-600 hover:underline"
        >
          Cerrar sesion
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
    >
      Iniciar sesion
    </button>
  );
}
