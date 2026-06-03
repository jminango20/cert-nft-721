"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { getAttribute } from "@/lib/attributeHelper";

// Helvetica is built into @react-pdf/renderer — no external font registration needed.

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    width: "100%",
    marginBottom: 24,
    alignItems: "center",
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    letterSpacing: 2,
  },
  logoSubText: {
    fontSize: 9,
    color: "#4b5563",
    letterSpacing: 1,
    marginTop: 2,
  },
  dividerTop: {
    width: "80%",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e3a5f",
    marginTop: 10,
    marginBottom: 24,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  titleLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  certTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    marginTop: 4,
    textAlign: "center",
  },
  body: {
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  bodyText: {
    fontSize: 11,
    color: "#4b5563",
    marginBottom: 8,
    textAlign: "center",
  },
  studentName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  courseTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    textAlign: "center",
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 6,
  },
  metaItem: {
    fontSize: 10,
    color: "#4b5563",
    textAlign: "center",
  },
  metaLabel: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 2,
  },
  issuerSection: {
    marginTop: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  issuerText: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
  },
  issuerName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    textAlign: "center",
  },
  dividerBottom: {
    width: "80%",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    marginBottom: 20,
  },
  qrSection: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrImage: {
    width: 90,
    height: 90,
    marginBottom: 6,
  },
  qrLabel: {
    fontSize: 9,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 2,
  },
  qrUrl: {
    fontSize: 8,
    color: "#1e3a5f",
    textAlign: "center",
    fontFamily: "Helvetica-Oblique",
  },
  footer: {
    marginTop: "auto",
    width: "100%",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
  footerAddress: {
    fontSize: 8,
    color: "#9ca3af",
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
    marginTop: 2,
  },
});

interface Attribute {
  trait_type: string;
  value: string;
}

export interface CertificatePDFProps {
  tokenId: string;
  /** NFT metadata attributes array */
  attributes: Attribute[];
  /** Student display name — never the wallet address */
  studentName: string;
  /** Contract address for footer */
  contractAddress?: string;
  /** Mint transaction hash for footer */
  txHash?: string | null;
  /** QR code data URL (png) generated from `qrcode` package */
  qrDataUrl: string;
}

function formatDateEs(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export default function CertificatePDF({
  tokenId,
  attributes,
  studentName,
  contractAddress,
  txHash,
  qrDataUrl,
}: CertificatePDFProps) {
  const microcredencial = getAttribute(attributes, "microcredencial");
  const ects = getAttribute(attributes, "ects");
  const eqf = getAttribute(attributes, "eqf");
  const modalidad = getAttribute(attributes, "modalidad");
  const rawDate = getAttribute(attributes, "fecha");

  const displayTitle = microcredencial !== "—" ? microcredencial : "Microcredencial";
  const displayDate = rawDate !== "—" ? formatDateEs(rawDate) : "—";

  const shortAddress = contractAddress ?? null;

  const verifyUrl = `https://educert.vercel.app/verify/${tokenId}`;

  return (
    <Document
      title={`Certificado ISTER — ${displayTitle}`}
      author="ISTER"
      subject="Certificado de Microcredencial"
      creator="EduCert"
    >
      <Page size="A4" style={styles.page}>

        {/* Header — logo */}
        <View style={styles.header}>
          <Text style={styles.logoText}>ISTER</Text>
          <Text style={styles.logoSubText}>Instituto Superior Tecnologico</Text>
          <View style={styles.dividerTop} />
        </View>

        {/* Certificate title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleLabel}>Certificado de Conclusion</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.bodyText}>Este certificado acredita que</Text>
          <Text style={styles.studentName}>{studentName}</Text>
          <Text style={styles.bodyText}>completo satisfactoriamente</Text>
          <Text style={styles.courseTitle}>{displayTitle}</Text>

          {/* Meta: ECTS · EQF · Modalidad */}
          <View style={styles.metaRow}>
            {ects !== "—" && (
              <View>
                <Text style={styles.metaLabel}>Creditos ECTS</Text>
                <Text style={styles.metaItem}>{ects}</Text>
              </View>
            )}
            {eqf !== "—" && (
              <View>
                <Text style={styles.metaLabel}>Nivel EQF</Text>
                <Text style={styles.metaItem}>{eqf}</Text>
              </View>
            )}
            {modalidad !== "—" && (
              <View>
                <Text style={styles.metaLabel}>Modalidad</Text>
                <Text style={styles.metaItem}>{modalidad}</Text>
              </View>
            )}
          </View>

          {displayDate !== "—" && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.metaLabel}>Fecha de emision</Text>
              <Text style={styles.metaItem}>{displayDate}</Text>
            </View>
          )}
        </View>

        {/* Issuer */}
        <View style={styles.issuerSection}>
          <Text style={styles.issuerText}>Emitido por:</Text>
          <Text style={styles.issuerName}>ISTER — Instituto Superior Tecnologico</Text>
        </View>

        <View style={styles.dividerBottom} />

        {/* QR Code */}
        <View style={styles.qrSection}>
          <Image src={qrDataUrl} style={styles.qrImage} />
          <Text style={styles.qrLabel}>Verificar autenticidad:</Text>
          <Text style={styles.qrUrl}>{verifyUrl}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Certificado blockchain #{tokenId} · Sepolia Testnet
          </Text>
          {shortAddress && (
            <Text style={styles.footerAddress}>
              Contrato: {shortAddress}
            </Text>
          )}
          {txHash && (
            <Text style={styles.footerAddress}>
              Tx: {txHash}
            </Text>
          )}
        </View>

      </Page>
    </Document>
  );
}
