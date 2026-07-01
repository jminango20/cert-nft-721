import { Resend } from "resend";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendClaimEmail(opts: {
  recipientName: string;
  recipientEmail: string;
  courseTitle: string;
  claimToken: string;
}): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping email send");
    return;
  }
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const claimUrl = `${frontendUrl}/claim/${opts.claimToken}`;
  const safeName = escapeHtml(opts.recipientName);
  const safeTitle = escapeHtml(opts.courseTitle);
  const safeUrl = escapeHtml(claimUrl);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "educert@ister.pt",
    to: opts.recipientEmail,
    subject: `Tu certificado está listo — ${safeTitle}`,
    html: `
      <h2>Hola ${safeName},</h2>
      <p>Tu microcredencial <strong>${safeTitle}</strong> ha sido emitida.</p>
      <p>Para reclamar tu certificado NFT, accede al siguiente enlace:</p>
      <p><a href="${safeUrl}">${safeUrl}</a></p>
      <p>Este enlace estará disponible durante <strong>48 horas</strong>.</p>
      <p>Si no solicitaste este certificado, ignora este mensaje.</p>
      <br/>
      <p>— Equipo EduCert / ISTER</p>
    `,
  });
}
