"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import PrivyButton from "@/components/PrivyButton";
import CertificateListCard from "@/components/CertificateListCard";
import { api, OwnedCertificate } from "@/lib/api";

export default function AlunoPage() {
  const { ready, authenticated, user } = usePrivy();
  const [certs, setCerts] = useState<OwnedCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resolve the wallet address from Privy — prefer embedded wallet, fall back to linked wallet
  function getWalletAddress(): string | null {
    if (!user) return null;
    const embedded = user.linkedAccounts?.find(
      (a) => a.type === "wallet" && "walletClientType" in a && a.walletClientType === "privy"
    );
    if (embedded && "address" in embedded) return embedded.address as string;
    const anyWallet = user.linkedAccounts?.find((a) => a.type === "wallet");
    if (anyWallet && "address" in anyWallet) return anyWallet.address as string;
    return null;
  }

  useEffect(() => {
    if (!ready || !authenticated) return;
    const walletAddress = getWalletAddress();
    if (!walletAddress) return;

    setLoading(true);
    setError("");
    api
      .getCertificatesByOwner(walletAddress)
      .then((data) => setCerts(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar certificados")
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user]);

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-brand-600 hover:underline mb-1 block">
            Inicio
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Mis Certificados</h1>
          <p className="text-sm text-gray-500">Accede con email o Google para ver tus certificados</p>
        </div>
        <PrivyButton />
      </header>

      {!ready ? (
        <div className="text-center py-20 text-gray-400 text-sm">Cargando...</div>
      ) : !authenticated ? (
        <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200">
          <p className="text-4xl mb-3" aria-hidden="true">&#127891;</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Inicia sesion para ver tus certificados
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Accede con tu email o cuenta de Google
          </p>
          <PrivyButton />
        </div>
      ) : loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          Cargando certificados...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200 px-8">
          <p className="text-4xl mb-3" aria-hidden="true">&#128196;</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Aun no tienes certificados emitidos
          </h2>
          <p className="text-sm text-gray-500">
            Si recibiste un enlace de reclamacion, usalo para obtener tu certificado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {certs.map((cert) => (
            <CertificateListCard key={cert.tokenId} cert={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
