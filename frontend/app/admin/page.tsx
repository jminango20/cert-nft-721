"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import ConnectButton from "@/components/ConnectButton";
import MintForm from "@/components/MintForm";
import RevokeForm from "@/components/RevokeForm";

export default function AdminPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-brand-600 hover:underline mb-1 block">
            ← Início
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Painel do Administrador</h1>
          <p className="text-sm text-gray-500">Emissão e revogação de certificados</p>
        </div>
        <ConnectButton />
      </header>

      {!isConnected ? (
        <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Conecte sua carteira
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Use MetaMask com a conta que possui ISSUER_ROLE no contrato
          </p>
          <ConnectButton />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <MintForm />
          <RevokeForm />
        </div>
      )}
    </div>
  );
}
