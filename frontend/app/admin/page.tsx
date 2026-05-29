"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import ConnectButton from "@/components/ConnectButton";
import MintForm from "@/components/MintForm";
import RevokeForm from "@/components/RevokeForm";
import CertDashboard from "@/components/CertDashboard";

export default function AdminPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-brand-600 hover:underline mb-1 block">
            Inicio
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Panel de Administracion</h1>
          <p className="text-sm text-gray-500">Emision y revocacion de microcredenciales — ISTER</p>
        </div>
        <ConnectButton />
      </header>

      {!isConnected ? (
        <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Conecta tu cartera
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Usa MetaMask con la cuenta que tiene ISSUER_ROLE en el contrato
          </p>
          <ConnectButton />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MintForm />
            </div>
            <div>
              <RevokeForm />
            </div>
          </div>
          <CertDashboard />
        </div>
      )}
    </div>
  );
}
