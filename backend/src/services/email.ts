import { Resend } from "resend";

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  return new Resend(apiKey);
}

export async function sendClaimEmail(opts: {
  recipientName: string;
  recipientEmail: string;
  courseTitle: string;
  claimToken: string;
}): Promise<void> {
  const resend = getClient();
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const claimUrl = `${frontendUrl}/claim/${opts.claimToken}`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "educert@ister.pt",
    to: opts.recipientEmail,
    subject: `Tu certificado está listo — ${opts.courseTitle}`,
    html: `
      <h2>Hola ${opts.recipientName},</h2>
      <p>Tu microcredencial <strong>${opts.courseTitle}</strong> ha sido emitida.</p>
      <p>Para reclamar tu certificado NFT, accede al siguiente enlace:</p>
      <p><a href="${claimUrl}">${claimUrl}</a></p>
      <p>Este enlace estará disponible durante <strong>48 horas</strong>.</p>
      <p>Si no solicitaste este certificado, ignora este mensaje.</p>
      <br/>
      <p>— Equipo EduCert / ISTER</p>
    `,
  });
}
