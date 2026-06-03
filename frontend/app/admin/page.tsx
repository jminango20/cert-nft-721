"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import ConnectButton from "@/components/ConnectButton";
import MintForm from "@/components/MintForm";
import RevokeForm from "@/components/RevokeForm";
import CertificateTable from "@/components/CertificateTable";

type AdminTab = "emitir" | "dashboard";

export default function AdminPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<AdminTab>("emitir");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tabBtn = (tab: AdminTab, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        activeTab === tab
          ? "border-brand-600 text-brand-600 bg-white"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );

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

      {!mounted || !isConnected ? (
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
        <div className="space-y-0">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {tabBtn("emitir", "Emitir Certificado")}
            {tabBtn("dashboard", "Ver Dashboard")}
          </div>

          {/* Tab: Emitir */}
          {activeTab === "emitir" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MintForm />
              </div>
              <div>
                <RevokeForm />
              </div>
            </div>
          )}

          {/* Tab: Dashboard */}
          {activeTab === "dashboard" && (
            <CertificateTable />
          )}
        </div>
      )}
    </div>
  );
}
