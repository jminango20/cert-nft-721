"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function PrivyButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return <div className="text-sm text-gray-400">Carregando...</div>;
  }

  if (authenticated && user) {
    const wallet = user.wallet?.address;
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          {user.email?.address ?? (wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Conectado")}
        </span>
        <button
          onClick={logout}
          className="text-sm text-red-600 hover:underline"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
    >
      Entrar como Aluno
    </button>
  );
}
